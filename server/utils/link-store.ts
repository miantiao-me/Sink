import type { LinkSchema } from '#shared/schemas/link'
import type { H3Event } from 'h3'
import type { z } from 'zod'
import { parseURL, stringifyParsedURL } from 'ufo'

// 链接类型定义
type Link = z.infer<typeof LinkSchema>

// 移除URL中的查询参数
export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

// 标准化slug（根据配置决定是否大小写敏感）
export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

// 构建短链接URL
export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

// 存储链接到KV
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

// 从KV获取链接
export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  return await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
}

// 从KV获取链接及其元数据
export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
  return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
}

// 从KV删除链接
export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.delete(`link:${slug}`)
}

// 检查链接是否存在
export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  const link = await getLink(event, slug)
  return link !== null
}

// 列出链接的选项接口
interface ListLinksOptions {
  limit: number
  cursor?: string
}

// 列出链接的结果接口
interface ListLinksResult {
  links: (Link | null)[]
  list_complete: boolean
  cursor?: string
}

// 列出链接（支持分页）
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
