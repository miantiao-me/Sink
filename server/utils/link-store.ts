import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkSearchItem } from '#shared/types/link'
import type { ExpectedLinkVersion, LinkFilterOptions, ListLinksOptions, ListLinksResult, SearchLinksOptions } from '../services/link-store/d1'
import { getRequestHost, getRequestProtocol } from 'h3'
import {
  d1CountLinks,
  d1CreateLink,
  d1CreateLinks,
  d1DeleteLink,
  d1GetActiveLink,
  d1GetActiveLinkVersions,
  d1GetAnyLink,
  d1GetLinkWithMetadata,
  d1HasActiveLinkVersion,
  d1IterateAllLinks,
  d1ListLinks,
  d1ListTags,
  d1SearchLinks,
  d1UpdateLink,
} from '../services/link-store/d1'
import { deleteLinkCache, isActiveLinkExpiration, putLinkCache, readLegacyKvLink } from '../services/link-store/kv'
import { insertMigratedKvLink, readCompletedLinkMigrationMarker } from '../services/link-store/migration'

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

async function writeThroughCache(event: H3Event, link: Link, effectiveExpiresAt?: number | null): Promise<void> {
  if (!isActiveLinkExpiration(effectiveExpiresAt)) {
    await deleteLinkCache(event, link.slug)
    return
  }
  if (!await putLinkCache(event, link, effectiveExpiresAt))
    return
  if (!await d1HasActiveLinkVersion(event, link))
    await deleteLinkCache(event, link.slug)
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  const cached = await readLegacyKvLink(event, slug, cacheTtl)
  if (cached.link)
    return cached.link

  if (!await readCompletedLinkMigrationMarker(event.context.cloudflare.env))
    return null

  const stored = await d1GetActiveLink(event, slug)
  if (!stored)
    return null
  await writeThroughCache(event, stored.link, stored.effectiveExpiresAt)
  return stored.link
}

export async function getAuthoritativeLink(event: H3Event, slug: string): Promise<Link | null> {
  return (await d1GetActiveLink(event, slug))?.link ?? null
}

export async function getAnyAuthoritativeLink(event: H3Event, slug: string): Promise<Link | null> {
  return await d1GetAnyLink(event, slug)
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  return await d1GetLinkWithMetadata(event, slug)
}

export async function createLink(event: H3Event, link: Link): Promise<boolean> {
  const result = await d1CreateLink(event, link)
  if (!result.created)
    return false
  await writeThroughCache(event, link, result.effectiveExpiresAt)
  return true
}

export type CreateLinksResult = { created: boolean } | { error: unknown }

async function writeThroughCaches(event: H3Event, links: { link: Link, effectiveExpiresAt: number | null }[]): Promise<void> {
  const cached = (await Promise.all(links.map(async ({ link, effectiveExpiresAt }) => {
    if (!isActiveLinkExpiration(effectiveExpiresAt)) {
      await deleteLinkCache(event, link.slug)
      return null
    }
    return await putLinkCache(event, link, effectiveExpiresAt) ? link : null
  }))).filter(link => link !== null)
  const currentSlugs = await d1GetActiveLinkVersions(event, cached)
  await Promise.all(cached.map(async (link) => {
    if (!currentSlugs.has(link.slug))
      await deleteLinkCache(event, link.slug)
  }))
}

export async function createLinks(event: H3Event, links: Link[]): Promise<CreateLinksResult[]> {
  let results: Awaited<ReturnType<typeof d1CreateLinks>>
  try {
    results = await d1CreateLinks(event, links)
  }
  catch {
    const fallbackResults: CreateLinksResult[] = []
    for (const link of links) {
      try {
        fallbackResults.push({ created: await createLink(event, link) })
      }
      catch (error) {
        fallbackResults.push({ error })
      }
    }
    return fallbackResults
  }

  const successful = results.flatMap((result, index) => result.created ? [{ link: links[index]!, effectiveExpiresAt: result.effectiveExpiresAt }] : [])
  try {
    await writeThroughCaches(event, successful)
  }
  catch (error) {
    console.error({
      event: 'link_cache.operation.failed',
      operation: 'bulk-write-through',
      slugs: successful.map(item => item.link.slug),
      error: error instanceof Error ? error.message : String(error),
    })
    await Promise.all(successful.map(item => deleteLinkCache(event, item.link.slug)))
  }
  return results.map(result => ({ created: result.created }))
}

export async function migrateKvLink(event: H3Event, link: Link, effectiveExpiresAt?: number): Promise<boolean> {
  return await insertMigratedKvLink(event, link, effectiveExpiresAt)
}

export async function updateLink(event: H3Event, link: Link, expected?: ExpectedLinkVersion): Promise<boolean> {
  const result = await d1UpdateLink(event, link, expected)
  if (!result.updated)
    return false
  await writeThroughCache(event, link, result.effectiveExpiresAt)
  return true
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  await d1DeleteLink(event, slug)
  await deleteLinkCache(event, slug)
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  return await d1ListLinks(event, options)
}

export function iterateAllAuthoritativeLinks(env: Cloudflare.Env): AsyncIterable<Link> {
  return d1IterateAllLinks(env)
}

export async function searchLinks(event: H3Event, options: SearchLinksOptions): Promise<LinkSearchItem[]> {
  return await d1SearchLinks(event, options)
}

export async function countLinks(event: H3Event, options: LinkFilterOptions): Promise<number> {
  return await d1CountLinks(event, options)
}

export async function listTags(event: H3Event): Promise<{ name: string, count: number }[]> {
  return await d1ListTags(event)
}
