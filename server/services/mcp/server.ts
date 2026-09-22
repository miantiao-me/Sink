import type { McpServer } from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'
import { createMcpHandler, isJsonContentType, isLegacyRequest, McpServer as SdkMcpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { getHeader, getRequestHost, toWebRequest } from 'h3'
import { registerMcpTools } from './tools'

/** The version is this endpoint's, independent of the Sink release. */
const SERVER_INFO = { name: 'sink', title: 'Sink', version: '1.0.0' }

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
 * Serves a 2025-era request on the stateless Streamable HTTP transport.
 * `enableJsonResponse` keeps answers as plain JSON instead of SSE, matching the
 * contract this endpoint has always had; `sessionIdGenerator: undefined` means
 * no session is ever minted.
 */
async function handleLegacyRequest(event: H3Event, request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const server = createMcpServer(event)

  try {
    await server.connect(transport)
    return await transport.handleRequest(request)
  }
  finally {
    try {
      await transport.close()
    }
    catch {
      // Closing a stateless transport never fails the request.
    }
    try {
      await server.close()
    }
    catch {
      // Same: the response is already settled.
    }
  }
}

/**
 * Serves a 2026-07-28 envelope request through the SDK entry's per-request
 * transport; `responseMode: 'json'` keeps answers as plain JSON instead of
 * holding an SSE stream open in the Worker.
 */
async function handleModernRequest(event: H3Event, request: Request): Promise<Response> {
  const handler = createMcpHandler(() => createMcpServer(event), {
    // Legacy traffic was already routed away; anything still classified as
    // legacy here (e.g. a claim-less `server/discover`) is rejected cleanly.
    legacy: 'reject',
    responseMode: 'json',
  })

  try {
    return await handler.fetch(request)
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

/**
 * Handles a `POST /api/mcp` request. `isLegacyRequest` is the same predicate the
 * SDK entry runs internally, so it cannot disagree with the modern leg: 2025-era
 * traffic keeps the stateless JSON contract above, while 2026-07-28 envelope
 * traffic is served by `createMcpHandler`'s per-request transport.
 */
export async function handleMcpPost(event: H3Event): Promise<Response> {
  if (!isAllowedOrigin(event))
    return jsonError(403, -32600, 'Origin not allowed')

  const request = toWebRequest(event)

  if (!isJsonContentType(request.headers.get('content-type')))
    return jsonError(415, -32600, 'Unsupported Media Type: Content-Type must be application/json')

  try {
    return await (await isLegacyRequest(request)
      ? handleLegacyRequest(event, request)
      : handleModernRequest(event, request))
  }
  catch (error) {
    return jsonError(500, -32603, error instanceof Error ? error.message : 'Internal server error')
  }
}
