import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import { parseLegacyKvLink } from '#shared/schemas/link'
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

export async function readLegacyKvLink(event: H3Event, slug: string, cacheTtl?: number): Promise<LegacyKvLinkResult> {
  const result = await event.context.cloudflare.env.KV.getWithMetadata(`link:${slug}`, { type: 'json', cacheTtl })
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
  const expiration = effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) : effectiveExpiresAt ?? undefined
  try {
    await event.context.cloudflare.env.KV.put(`link:${link.slug}`, JSON.stringify(link), { expiration })
    return true
  }
  catch (error) {
    logCacheError('put', link.slug, error)
    return false
  }
}

export async function deleteLinkCache(event: H3Event, slug: string): Promise<void> {
  try {
    await event.context.cloudflare.env.KV.delete(`link:${slug}`)
  }
  catch (error) {
    logCacheError('delete', slug, error)
  }
}

export function isActiveLinkExpiration(expiration: number | null | undefined): boolean {
  return isActiveExpiration(expiration)
}
