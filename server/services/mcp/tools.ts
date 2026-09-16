import type { H3Event } from 'h3'
import { createError } from 'h3'
import { z } from 'zod'
import {
  CreateLinkSchema,
  DeleteLinkSchema,
  EditLinkSchema,
  LinkFieldsSchema,
  LinkFilterQuerySchema,
  LinkSlugQuerySchema,
  ListLinksQuerySchema,
  SearchLinksQuerySchema,
} from '#shared/schemas/link'
import { QuerySchema } from '#shared/schemas/query'
import {
  buildCountersQuery,
  buildMetricsQuery,
  buildViewsQuery,
  MetricsQuerySchema,
  ViewsQuerySchema,
} from '../../utils/analytics-queries'
import { useWAE } from '../../utils/cloudflare'
import { sanitizeLinkPassword, sanitizeLinksPassword } from '../../utils/link-password'
import { removeLink, replaceLink, saveNewLink, upsertLink } from '../../utils/link-processing'
import { countLinks, getLinkWithMetadata, listLinks, listTags, normalizeSlug, searchLinks } from '../../utils/link-store'
import { assertLinkStoreReady } from '../link-store/migration'

interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: Partial<Record<'readOnlyHint' | 'destructiveHint' | 'idempotentHint' | 'openWorldHint', boolean>>
  handler: (event: H3Event, args: Record<string, unknown>) => Promise<unknown>
}

export interface McpTool extends McpToolDefinition {
  title: string
}

export interface McpToolResult {
  content: { type: 'text', text: string }[]
  structuredContent?: unknown
  isError?: boolean
}

/**
 * Tool input schemas are generated from the same zod contracts the handlers
 * parse with, so the advertised shape cannot drift from what is accepted.
 */
function inputSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...json } = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  return { ...json, additionalProperties: false }
}

/** Create and upsert generate a slug when one is omitted; the other write fields match the edit contract. */
const CreateLinkArgsSchema = LinkFieldsSchema.partial({ slug: true })

/** Analytics filters, minus the row limit the counter and time-series tools ignore. */
const AnalyticsFilterSchema = QuerySchema.omit({ limit: true })

const FILTER_NOTE = 'Every filter accepts a comma-separated list of values.'

/** Tools reaching the link store, which the REST routes gate through middleware. */
const linkTools: McpToolDefinition[] = [
  {
    name: 'list_links',
    description: 'List short links newest first, with cursor pagination. Use search_links when looking for a specific link.',
    inputSchema: inputSchema(ListLinksQuerySchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const list = await listLinks(event, ListLinksQuerySchema.parse(args))
      return { ...list, links: sanitizeLinksPassword(list.links) }
    },
  },
  {
    name: 'search_links',
    description: 'Search links by keyword or exact destination URL. One of `q` or `url` is required; without either the result is empty.',
    inputSchema: inputSchema(SearchLinksQuerySchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const query = SearchLinksQuerySchema.parse(args)
      return { links: query.q || query.url ? await searchLinks(event, query) : [] }
    },
  },
  {
    name: 'get_link',
    description: 'Read a single short link by slug, including its stored metadata.',
    inputSchema: inputSchema(LinkSlugQuerySchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const { slug } = LinkSlugQuerySchema.parse(args)
      const { link, metadata } = await getLinkWithMetadata(event, normalizeSlug(event, slug))
      if (!link)
        throw createError({ status: 404, statusText: 'Link not found' })

      return sanitizeLinkPassword({ ...metadata, ...link })
    },
  },
  {
    name: 'count_links',
    description: 'Count links matching an optional keyword, URL, tag, or expiration status.',
    inputSchema: inputSchema(LinkFilterQuerySchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return { count: await countLinks(event, LinkFilterQuerySchema.parse(args)) }
    },
  },
  {
    name: 'list_tags',
    description: 'List every tag currently in use, with the number of links carrying it.',
    inputSchema: inputSchema(z.object({})),
    annotations: { readOnlyHint: true },
    async handler(event) {
      return { tags: await listTags(event) }
    },
  },
  {
    name: 'create_link',
    description: 'Create a short link. Fails when the slug is already taken; use upsert_link to reuse an existing link instead.',
    inputSchema: inputSchema(CreateLinkArgsSchema),
    annotations: { destructiveHint: false, idempotentHint: false },
    async handler(event, args) {
      return saveNewLink(event, CreateLinkSchema.parse(args))
    },
  },
  {
    name: 'update_link',
    description: 'Replace an existing link identified by slug. Every writable field is overwritten and any omitted optional field is cleared, so read the link with get_link first and send it back complete.',
    inputSchema: inputSchema(LinkFieldsSchema),
    annotations: { destructiveHint: true, idempotentHint: true },
    async handler(event, args) {
      return replaceLink(event, EditLinkSchema.parse(args))
    },
  },
  {
    name: 'upsert_link',
    description: 'Return the existing link for a slug, or create it when absent. The result reports whether it was `created` or `existing`.',
    inputSchema: inputSchema(CreateLinkArgsSchema),
    annotations: { destructiveHint: false, idempotentHint: true },
    async handler(event, args) {
      return upsertLink(event, CreateLinkSchema.parse(args))
    },
  },
  {
    name: 'delete_link',
    description: 'Permanently delete a short link. Existing traffic to the slug stops resolving immediately.',
    inputSchema: inputSchema(DeleteLinkSchema),
    annotations: { destructiveHint: true, idempotentHint: true },
    async handler(event, args) {
      const { slug } = DeleteLinkSchema.parse(args)
      await removeLink(event, slug)
      return { slug, deleted: true }
    },
  },
]

const analyticsTools: McpToolDefinition[] = [
  {
    name: 'get_analytics_counters',
    description: `Total visits, unique visitors, and referer counts over the access log. ${FILTER_NOTE}`,
    inputSchema: inputSchema(AnalyticsFilterSchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildCountersQuery(QuerySchema.parse(args), event))
    },
  },
  {
    name: 'get_analytics_views',
    description: `Visits and visitors bucketed over time by minute, hour, or day. ${FILTER_NOTE}`,
    inputSchema: inputSchema(ViewsQuerySchema.omit({ limit: true })),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildViewsQuery(ViewsQuerySchema.parse(args), event))
    },
  },
  {
    name: 'get_analytics_metrics',
    description: `Top values for one access-log dimension, ordered by visits. ${FILTER_NOTE}`,
    inputSchema: inputSchema(MetricsQuerySchema),
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildMetricsQuery(MetricsQuerySchema.parse(args), event))
    },
  },
]

/**
 * Titles are the display form of the name (`list_links` becomes `List links`),
 * and annotations fall back to the hints every Sink tool shares.
 */
export const mcpTools: McpTool[] = [...linkTools, ...analyticsTools].map(tool => ({
  ...tool,
  title: tool.name.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase()),
  annotations: { readOnlyHint: false, openWorldHint: false, ...tool.annotations },
}))

const gatedTools = new Set(linkTools.map(tool => tool.name))

/**
 * Runs a tool and shapes the outcome as a tool result. Validation and business
 * failures are returned with `isError` so the calling model can self-correct;
 * only unknown tools are reported as JSON-RPC protocol errors by the caller.
 */
export async function callMcpTool(event: H3Event, tool: McpTool, args: Record<string, unknown>): Promise<McpToolResult> {
  try {
    if (gatedTools.has(tool.name))
      await assertLinkStoreReady(event)

    const data = await tool.handler(event, args)
    // The payload also ships as `structuredContent`, so the text block stays
    // compact; it exists for clients that predate structured results.
    return {
      content: [{ type: 'text', text: JSON.stringify(data) }],
      structuredContent: data,
    }
  }
  catch (error) {
    const failure = error as { statusCode?: number, statusMessage?: string, message?: string }
    const text = error instanceof z.ZodError
      ? `Invalid arguments for ${tool.name}: ${error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')}`
      : `${tool.name} failed: ${failure.statusCode ? `${failure.statusCode} ` : ''}${failure.statusMessage || failure.message || 'Unknown error'}`

    return { content: [{ type: 'text', text }], isError: true }
  }
}
