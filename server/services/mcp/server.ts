import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { H3Event } from 'h3'
import { McpServer as SdkMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { getHeader, getHeaders, getRequestHost, getRequestURL, readRawBody } from 'h3'
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
 * Handles a `POST /api/mcp` request with the official SDK's stateless
 * Streamable HTTP transport (`sessionIdGenerator: undefined`,
 * `enableJsonResponse: true`). Legacy protocol versions stay compatible
 * because the SDK negotiates them itself; no session is ever minted.
 */
export async function handleMcpPost(event: H3Event): Promise<Response> {
  if (!isAllowedOrigin(event))
    return jsonError(403, -32600, 'Origin not allowed')

  let rawBody: string | undefined
  try {
    rawBody = await readRawBody(event)
  }
  catch {
    return jsonError(500, -32603, 'Failed to read request body')
  }

  const incoming = getHeaders(event)
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined)
      continue
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry)
    }
    else {
      headers.set(key, value)
    }
  }

  let url: string
  try {
    url = getRequestURL(event).href
  }
  catch {
    return jsonError(500, -32603, 'Failed to resolve request URL')
  }

  const request = new Request(url, {
    method: 'POST',
    headers,
    body: rawBody ?? null,
  })

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const server = createMcpServer(event)

  try {
    await server.connect(transport)
    return await transport.handleRequest(request)
  }
  catch (error) {
    return jsonError(500, -32603, error instanceof Error ? error.message : 'Internal server error')
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
