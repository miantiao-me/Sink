import type { LinkSchema } from '#shared/schemas/link'
import type { H3Event } from 'h3'
import type { z } from 'zod'
import { parseURL, stringifyParsedURL } from 'ufo'

type Link = z.infer<typeof LinkSchema>

export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const expiration = getExpiration(event, link.expiration)

  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  })
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  return await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
  return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.delete(`link:${slug}`)
}

export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  const link = await getLink(event, slug)
  return link !== null
}

interface ListLinksOptions {
  limit: number
  cursor?: string
}

export interface ListLinksResult {
  links: (Link | null)[]
  list_complete: boolean
  cursor?: string
}

export async function listLinksSorted(
  event: H3Event,
  options: ListLinksOptions & { sort: 'createdAt_desc' | 'createdAt_asc' | 'slug_desc' },
): Promise<ListLinksResult> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  const allKeys: string[] = []
  let kvCursor: string | undefined
  let listComplete = false
  while (!listComplete) {
    const result = await KV.list({ prefix: 'link:', limit: 1000, cursor: kvCursor })
    allKeys.push(...result.keys.map(k => k.name))
    listComplete = result.list_complete
    if (!listComplete && 'cursor' in result)
      kvCursor = result.cursor
  }

  const allLinks: Link[] = (
    await Promise.all(allKeys.map(key => KV.get(key, { type: 'json' }) as Promise<Link | null>))
  ).filter((l): l is Link => l !== null)

  if (options.sort === 'createdAt_desc') {
    allLinks.sort((a, b) => b.createdAt - a.createdAt || a.slug.localeCompare(b.slug))
  }
  else if (options.sort === 'createdAt_asc') {
    allLinks.sort((a, b) => a.createdAt - b.createdAt || a.slug.localeCompare(b.slug))
  }
  else if (options.sort === 'slug_desc') {
    allLinks.sort((a, b) => b.slug.localeCompare(a.slug))
  }

  let startIndex = 0
  if (options.cursor) {
    if (options.sort === 'createdAt_desc') {
      let cursorCreatedAt = 0
      let cursorSlug = ''
      const sep = options.cursor.indexOf('::')
      if (sep !== -1) {
        cursorCreatedAt = Number(options.cursor.slice(0, sep))
        cursorSlug = options.cursor.slice(sep + 2)
      }
      startIndex = allLinks.findIndex(l =>
        l.createdAt < cursorCreatedAt || (l.createdAt === cursorCreatedAt && l.slug > cursorSlug),
      )
    }
    else if (options.sort === 'createdAt_asc') {
      let cursorCreatedAt = 0
      let cursorSlug = ''
      const sep = options.cursor.indexOf('::')
      if (sep !== -1) {
        cursorCreatedAt = Number(options.cursor.slice(0, sep))
        cursorSlug = options.cursor.slice(sep + 2)
      }
      startIndex = allLinks.findIndex(l =>
        l.createdAt > cursorCreatedAt || (l.createdAt === cursorCreatedAt && l.slug > cursorSlug),
      )
    }
    else if (options.sort === 'slug_desc') {
      const cursorSlug = options.cursor
      startIndex = allLinks.findIndex(l => l.slug < cursorSlug)
    }

    if (startIndex === -1)
      return { links: [], list_complete: true }
  }

  const page = allLinks.slice(startIndex, startIndex + options.limit)
  const lastItem = page[page.length - 1]

  let nextCursor = ''
  if (lastItem) {
    if (options.sort === 'slug_desc') {
      nextCursor = lastItem.slug
    }
    else {
      nextCursor = `${lastItem.createdAt}::${lastItem.slug}`
    }
  }

  return {
    links: page,
    list_complete: startIndex + options.limit >= allLinks.length,
    cursor: nextCursor,
  }
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const list = await KV.list({
    prefix: 'link:',
    limit: options.limit,
    cursor: options.cursor || undefined,
  })

  const links = await Promise.all(
    (list.keys || []).map(async (key: { name: string }) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: Record<string, unknown> | null, value: Link | null }
      if (link) {
        return {
          ...(metadata ?? {}),
          ...link,
        }
      }
      return link
    }),
  )

  return {
    links,
    list_complete: list.list_complete,
    cursor: 'cursor' in list ? list.cursor : undefined,
  }
}
