import type { LinkSchema } from '@@/schemas/link'
import type { H3Event } from 'h3'
import type { z } from 'zod'

type Link = z.infer<typeof LinkSchema>

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  const { KV } = event.context.cloudflare.env
  const expiration = getExpiration(event, link.expiration)

  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: link.url,
      comment: link.comment,
    },
  })
}

export async function getLink(event: H3Event, slug: string): Promise<Link | null> {
  const { KV } = event.context.cloudflare.env
  return await KV.get(`link:${slug}`, { type: 'json' })
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const { KV } = event.context.cloudflare.env
  const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
  return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const { KV } = event.context.cloudflare.env
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

interface ListLinksResult {
  links: (Link | null)[]
  list_complete: boolean
  cursor?: string
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const { KV } = event.context.cloudflare.env
  const list = await KV.list({
    prefix: 'link:',
    limit: options.limit,
    cursor: options.cursor || undefined,
  })

  const links = await Promise.all(
    (list.keys || []).map(async (key: { name: string }) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        return {
          ...metadata,
          ...link,
        }
      }
      return link
    }),
  )

  return {
    links,
    list_complete: list.list_complete,
    cursor: list.cursor,
  }
}
