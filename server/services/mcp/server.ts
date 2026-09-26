import type { McpServer } from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'
import { createMcpHandler, McpServer as SdkMcpServer } from '@modelcontextprotocol/server'
import { getHeader, getRequestHost, toWebRequest } from 'h3'
import { version } from '../../../package.json'
import { registerMcpTools } from './tools'

const SERVER_INFO = { name: 'sink', title: 'Sink', version }

const INSTRUCTIONS = [
  'Sink is a link shortener with built-in analytics.',
  'Links are addressed by their slug; create_link generates one when it is omitted.',
  'update_link replaces every writable field, so read the link with get_link first and send it back complete.',
  'The analytics tools read a sampled access log, so counts are estimates rather than exact totals.',
].join(' ')

/**
 * Creates a per-request SDK server. A fresh server per request keeps the
 * endpoint stateless, which suits the Worker runtime, and lets each tool
 * close over its own `H3Event` so it can call the same server utilities the
 * REST handlers use.
 */
function createMcpServer(event: H3Event): McpServer {
  const server = new SdkMcpServer(SERVER_INFO, {
    capabilities: { tools: {} },
    instructions: INSTRUCTIONS,
  })
  registerMcpTools(server, event)
  return server
}

/**
 * Rejects cross-origin browser requests, which cookie-based Cloudflare Access
 * sessions would otherwise let a malicious page replay against this endpoint.
 * Non-browser MCP clients do not send an `Origin` header.
 */
function isAllowedOrigin(event: H3Event): boolean {
  const origin = getHeader(event, 'origin')
  if (!origin)
    return true

  try {
    return new URL(origin).host === getRequestHost(event)
  }
  catch {
    return false
  }
}

function jsonError(status: number, code: number, message: string): Response {
  return Response.json(
    { jsonrpc: '2.0', id: null, error: { code, message } },
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * Handles a `POST /api/mcp` request through the SDK v2 serving entry:
 * 2026-07-28 envelope traffic runs on the per-request transport while
 * `legacy: 'stateless'` keeps 2025-era clients working on a fresh
 * `sessionIdGenerator: undefined` transport per request — no session is ever
 * minted. The SDK itself rejects non-JSON bodies (415) and bad versions, and
 * its default `auto` response mode answers every exchange here as a single
 * JSON body because no Sink tool emits mid-call messages. Transport-level
 * failures are reported through `onerror` and answered as a fixed
 * `Internal server error` JSON-RPC response.
 */
export async function handleMcpRequest(event: H3Event): Promise<Response> {
  if (!isAllowedOrigin(event))
    return jsonError(403, -32600, 'Origin not allowed')

  const handler = createMcpHandler(() => createMcpServer(event), {
    legacy: 'stateless',
    onerror: error => console.error('[mcp]', error),
  })

  try {
    return await handler.fetch(toWebRequest(event))
  }
  finally {
    try {
      await handler.close()
    }
    catch {
      // Closing a per-request handler never fails the response.
    }
  }
}
