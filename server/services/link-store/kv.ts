import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import { parseLegacyKvLink } from '#shared/schemas/link'
import { getKvNamespace, requireCloudflareEnv } from '../../utils/bindings'
import { getExpiration } from '../../utils/time'

export interface LegacyKvLinkResult {
  link: Link | null
  metadata: Record<string, unknown> | null
}

function isActiveExpiration(expiration: number | null | undefined): boolean {
  return expiration === null || expiration === undefined || expiration > Math.floor(Date.now() / 1000)
}

function logCacheError(operation: string, slug: string, error: unknown): void {
  console.error({
    event: 'link_cache.operation.failed',
    operation,
    slug,
    error: error instanceof Error ? error.message : String(error),
  })
}

/**
 * Callers fall back to D1 when KV is absent, so a missing binding is logged
 * rather than thrown. It is reported per operation because every request is
 * degraded for as long as the binding is gone.
 */
function getLinkCache(event: H3Event, operation: string, slug: string): KVNamespace | null {
  const kv = getKvNamespace(requireCloudflareEnv(event))
  if (!kv)
    console.error({ event: 'link_cache.binding.missing', operation, slug })

  return kv
}

async function readLinkCacheEntry(kv: KVNamespace, slug: string, cacheTtl?: number) {
  try {
    return await kv.getWithMetadata(`link:${slug}`, { type: 'json', cacheTtl })
  }
  catch (error) {
    logCacheError('read', slug, error)
    return null
  }
}

export async function readLegacyKvLink(event: H3Event, slug: string, cacheTtl?: number): Promise<LegacyKvLinkResult> {
  const kv = getLinkCache(event, 'read', slug)
  if (!kv)
    return { link: null, metadata: null }

  const result = await readLinkCacheEntry(kv, slug, cacheTtl)
  if (!result)
    return { link: null, metadata: null }

  const parsed = parseLegacyKvLink(result.value, slug)
  const metadata = result.metadata as Record<string, unknown> | null
  const metadataExpiration = typeof metadata?.expiration === 'number' ? metadata.expiration : undefined

  if (!parsed.success)
    return { link: null, metadata }

  const effectiveExpiration = metadataExpiration ?? parsed.data.expiration
  if (!isActiveExpiration(effectiveExpiration))
    return { link: null, metadata }

  return { link: parsed.data, metadata }
}

export async function putLinkCache(event: H3Event, link: Link, effectiveExpiresAt?: number | null): Promise<boolean> {
  const kv = getLinkCache(event, 'put', link.slug)
  if (!kv)
    return false

  const expiration = effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) : effectiveExpiresAt ?? undefined
  try {
    await kv.put(`link:${link.slug}`, JSON.stringify(link), { expiration })
    return true
  }
  catch (error) {
    logCacheError('put', link.slug, error)
    return false
  }
}

export async function deleteLinkCache(event: H3Event, slug: string): Promise<void> {
  const kv = getLinkCache(event, 'delete', slug)
  if (!kv)
    return

  try {
    await kv.delete(`link:${slug}`)
  }
  catch (error) {
    logCacheError('delete', slug, error)
  }
}

export function isActiveLinkExpiration(expiration: number | null | undefined): boolean {
  return isActiveExpiration(expiration)
}
