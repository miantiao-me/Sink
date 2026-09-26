import type { CallToolResult, McpServer, StandardSchemaWithJSON, ToolAnnotations } from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'
import { createError, isError } from 'h3'
import { z } from 'zod'
import {
  CreateLinkSchema,
  DeleteLinkSchema,
  EditLinkSchema,
  LinkFilterQuerySchema,
  LinkSlugQuerySchema,
  ListLinksQuerySchema,
  SearchLinksQuerySchema,
} from '#shared/schemas/link'
import { LinkCheckRequestSchema } from '#shared/schemas/link-check'
import { FilterQuerySchema } from '#shared/schemas/query'
import {
  buildCountersQuery,
  buildHeatmapQuery,
  buildMetricsQuery,
  buildViewsQuery,
  HeatmapQuerySchema,
  MetricsQuerySchema,
  ViewsQuerySchema,
} from '../../utils/analytics-queries'
import { useWAE } from '../../utils/cloudflare'
import { checkLinksPage } from '../../utils/link-check'
import { sanitizeLinkPassword, sanitizeLinksPassword } from '../../utils/link-password'
import { removeLink, replaceLink, saveNewLink, upsertLink } from '../../utils/link-processing'
import { countLinks, getLinkWithMetadata, listLinks, listTags, normalizeSlug, searchLinks } from '../../utils/link-store'
import { assertLinkStoreReady } from '../link-store/migration'

interface McpToolDefinition {
  name: string
  description: string
  /**
   * The zod contract the SDK advertises verbatim and validates arguments
   * against before the callback runs, so the handler receives its parsed
   * output type and never re-parses.
   */
  inputSchema: StandardSchemaWithJSON
  annotations?: ToolAnnotations
  handler: (event: H3Event, args: unknown) => Promise<unknown>
}

/**
 * Types each tool's handler args as the output of its own input schema; the
 * SDK has already validated the value against that schema when it is passed
 * through, so the single cast is sound.
 */
function defineTool<S extends StandardSchemaWithJSON>(tool: Omit<McpToolDefinition, 'inputSchema' | 'handler'> & {
  inputSchema: S
  handler: (event: H3Event, args: StandardSchemaWithJSON.InferOutput<S>) => Promise<unknown>
}): McpToolDefinition {
  return { ...tool, handler: (event, args) => tool.handler(event, args as StandardSchemaWithJSON.InferOutput<S>) }
}

const FILTER_NOTE = 'Every filter accepts a comma-separated list of values.'

/** Tools reaching the link store, which the REST routes gate through middleware. */
const linkTools: McpToolDefinition[] = [
  defineTool({
    name: 'list_links',
    description: 'List short links newest first, with cursor pagination. Use search_links when looking for a specific link.',
    inputSchema: ListLinksQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const list = await listLinks(event, args)
      return { ...list, links: sanitizeLinksPassword(list.links) }
    },
  }),
  defineTool({
    name: 'search_links',
    description: 'Search links by keyword or exact destination URL. One of `q` or `url` is required; without either the result is empty.',
    inputSchema: SearchLinksQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const links = args.q || args.url ? await searchLinks(event, args) : []
      return { links }
    },
  }),
  defineTool({
    name: 'get_link',
    description: 'Read a single short link by slug, including its stored metadata.',
    inputSchema: LinkSlugQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      const { link, metadata } = await getLinkWithMetadata(event, normalizeSlug(event, args.slug))
      if (!link)
        throw createError({ status: 404, statusText: 'Link not found' })

      return sanitizeLinkPassword({ ...metadata, ...link })
    },
  }),
  defineTool({
    name: 'count_links',
    description: 'Count links matching an optional keyword, URL, tag, or expiration status.',
    inputSchema: LinkFilterQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return { count: await countLinks(event, args) }
    },
  }),
  defineTool({
    name: 'list_tags',
    description: 'List every tag currently in use, with the number of links carrying it.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
    async handler(event) {
      return { tags: await listTags(event) }
    },
  }),
  defineTool({
    name: 'check_links',
    description: 'Fetch the target URL of each stored link, alphabetically by slug with cursor pagination, and report its HTTP status. URLs that are not public HTTP(S) are skipped with an error.',
    inputSchema: LinkCheckRequestSchema,
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler(event, args) {
      return checkLinksPage(event, args)
    },
  }),
  defineTool({
    name: 'create_link',
    description: 'Create a short link. Fails when the slug is already taken; use upsert_link to reuse an existing link instead.',
    inputSchema: CreateLinkSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    handler(event, args) {
      return saveNewLink(event, args)
    },
  }),
  defineTool({
    name: 'update_link',
    description: 'Replace an existing link identified by slug. Every writable field is overwritten and any omitted optional field is cleared, so read the link with get_link first and send it back complete. An empty password clears protection while an omitted one keeps it.',
    inputSchema: EditLinkSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    handler(event, args) {
      return replaceLink(event, args)
    },
  }),
  defineTool({
    name: 'upsert_link',
    description: 'Return the existing link for a slug, or create it when absent. The result reports whether it was `created` or `existing`.',
    inputSchema: CreateLinkSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    handler(event, args) {
      return upsertLink(event, args)
    },
  }),
  defineTool({
    name: 'delete_link',
    description: 'Permanently delete a short link. Existing traffic to the slug stops resolving immediately.',
    inputSchema: DeleteLinkSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    async handler(event, args) {
      await removeLink(event, args.slug)
      return { slug: args.slug, deleted: true }
    },
  }),
]

const analyticsTools: McpToolDefinition[] = [
  defineTool({
    name: 'get_analytics_counters',
    description: `Total visits, unique visitors, and referer counts over the access log. ${FILTER_NOTE}`,
    inputSchema: FilterQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildCountersQuery(args, event))
    },
  }),
  defineTool({
    name: 'get_analytics_views',
    description: `Visits and visitors bucketed over time by minute, hour, or day. ${FILTER_NOTE}`,
    inputSchema: ViewsQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildViewsQuery(args, event))
    },
  }),
  defineTool({
    name: 'get_analytics_metrics',
    description: `Top values for one access-log dimension, ordered by visits. ${FILTER_NOTE}`,
    inputSchema: MetricsQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildMetricsQuery(args, event))
    },
  }),
  defineTool({
    name: 'get_analytics_heatmap',
    description: `Visits and visitors bucketed by weekday and hour of day in the given timezone. ${FILTER_NOTE}`,
    inputSchema: HeatmapQuerySchema,
    annotations: { readOnlyHint: true },
    async handler(event, args) {
      return useWAE(event, buildHeatmapQuery(args, event))
    },
  }),
]

const linkToolNames = new Set(linkTools.map(tool => tool.name))

/** Explicit 4xx business errors reach the model verbatim; anything else is logged once and reported generically. */
function toolErrorText(toolName: string, error: unknown): string {
  if (isError(error)) {
    const statusCode = error.statusCode ?? 500
    if (statusCode < 500)
      return `${toolName} failed: ${statusCode} ${error.statusMessage || error.message}`
  }
  console.error(`MCP tool ${toolName} failed`, error)
  return `${toolName} failed: internal error`
}

/**
 * Registers the curated Sink tools on an SDK `McpServer`. The server is created
 * per request so each tool closes over its own `H3Event`; the SDK advertises the
 * zod contracts directly and validates arguments before the callback runs, so
 * handlers receive the parsed output. Business failures are returned with
 * `isError` so the calling model can self-correct.
 */
export function registerMcpTools(server: McpServer, event: H3Event): void {
  for (const tool of [...linkTools, ...analyticsTools]) {
    server.registerTool(tool.name, {
      // Titles are the display form of the name (`list_links` → `List links`),
      // and annotations fall back to the hints every Sink tool shares.
      title: tool.name.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase()),
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: { readOnlyHint: false, openWorldHint: false, ...tool.annotations },
    }, async (args): Promise<CallToolResult> => {
      try {
        if (linkToolNames.has(tool.name))
          await assertLinkStoreReady(event)

        const data = await tool.handler(event, args)
        // The payload also ships as `structuredContent`, so the text block stays
        // compact; it exists for clients that predate structured results.
        return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data }
      }
      catch (error) {
        return { content: [{ type: 'text', text: toolErrorText(tool.name, error) }], isError: true }
      }
    })
  }
}
