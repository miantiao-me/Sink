import type { H3Event } from 'h3'
import { getHeader, getRequestHost, readRawBody } from 'h3'
import { callMcpTool, mcpTools } from './tools'

/**
 * Newest first: the stateless revision this endpoint implements
 * (https://modelcontextprotocol.io/specification/2026-07-28), then the
 * initialization-based revisions it still answers so that older clients work.
 */
const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'] as const
const [MCP_PROTOCOL_VERSION, ...LEGACY_PROTOCOL_VERSIONS] = SUPPORTED_PROTOCOL_VERSIONS

/** The version is this endpoint's, independent of the Sink release. */
const SERVER_INFO = { name: 'sink', title: 'Sink', version: '1.0.0' }

const SERVER_CAPABILITIES = { tools: { listChanged: false } }

const INSTRUCTIONS = [
  'Sink is a link shortener with built-in analytics.',
  'Links are addressed by their slug; create_link generates one when it is omitted.',
  'update_link replaces every writable field, so read the link with get_link first and send it back complete.',
  'The analytics tools read a sampled access log, so counts are estimates rather than exact totals.',
].join(' ')

const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion'
const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities'
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo'

/**
 * `server/discover` and `tools/list` must carry caching hints. Both answers are
 * compile-time constants holding no per-caller data, so they are public and
 * only change when the app is redeployed.
 */
const CACHE_HINTS = { ttlMs: 3_600_000, cacheScope: 'public' }

/** `-32020` and above are allocated by MCP; the rest are standard JSON-RPC 2.0. */
const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  HeaderMismatch: -32020,
  UnsupportedProtocolVersion: -32022,
}

type JsonRpcId = string | number

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

export interface McpResponse {
  status: number
  body: unknown
}

function result(id: JsonRpcId, value: Record<string, unknown>): McpResponse {
  return { status: 200, body: { jsonrpc: '2.0', id, result: value } }
}

function fail(id: JsonRpcId | undefined, status: number, code: number, message: string, data?: unknown): McpResponse {
  return {
    status,
    body: {
      jsonrpc: '2.0',
      ...(id === undefined ? {} : { id }),
      error: { code, message, ...(data === undefined ? {} : { data }) },
    },
  }
}

function headerMismatch(id: JsonRpcId | undefined, message: string): McpResponse {
  return fail(id, 400, ErrorCode.HeaderMismatch, `Header mismatch: ${message}`)
}

function methodNotFound(id: JsonRpcId | undefined, method: string): McpResponse {
  return fail(id, 404, ErrorCode.MethodNotFound, `Method not found: ${method}`)
}

function isLegacyVersion(version: unknown): boolean {
  return LEGACY_PROTOCOL_VERSIONS.includes(version as typeof LEGACY_PROTOCOL_VERSIONS[number])
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  const message = value as Record<string, unknown> | null
  if (!message || typeof message !== 'object' || Array.isArray(message))
    return false
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string')
    return false

  return message.id === undefined || typeof message.id === 'string' || typeof message.id === 'number'
}

/**
 * `Mcp-Name` carries non-ASCII values as `=?base64?...?=`, and clients encode
 * plain values that would otherwise look like the sentinel, so it is always
 * decoded first. An undecodable value cannot match the body, so it is handed
 * back unchanged and rejected as a mismatch instead of throwing.
 */
function decodeHeaderValue(value: string): string {
  const encoded = value.match(/^=\?base64\?(.*)\?=$/)?.[1]
  if (encoded === undefined)
    return value

  try {
    return new TextDecoder().decode(Uint8Array.from(atob(encoded), character => character.charCodeAt(0)))
  }
  catch {
    return value
  }
}

/** A mirrored header has to be present and to agree with the body value it mirrors. */
function matchHeader(event: H3Event, id: JsonRpcId | undefined, header: string, expected: unknown, decode = false): McpResponse | null {
  const value = getHeader(event, header.toLowerCase())
  if (!value)
    return headerMismatch(id, `the ${header} header is required`)
  if ((decode ? decodeHeaderValue(value) : value) === expected)
    return null

  return headerMismatch(id, `${header} header value '${value}' does not match body value '${String(expected)}'`)
}

function readMeta(request: JsonRpcRequest): Record<string, unknown> | undefined {
  return request.params?._meta as Record<string, unknown> | undefined
}

/**
 * Validates the `_meta` entries and mirrored headers the stateless revision
 * requires. The body stays the source of truth, so any disagreement is rejected.
 */
function validateRequest(event: H3Event, request: JsonRpcRequest): McpResponse | null {
  const { id, method, params } = request
  const meta = readMeta(request)

  for (const key of [META_PROTOCOL_VERSION, META_CLIENT_CAPABILITIES]) {
    if (meta?.[key] === undefined)
      return fail(id, 400, ErrorCode.InvalidParams, `params._meta['${key}'] is required`)
  }

  return matchHeader(event, id, 'MCP-Protocol-Version', meta?.[META_PROTOCOL_VERSION])
    ?? matchHeader(event, id, 'Mcp-Method', method)
    ?? (method === 'tools/call' ? matchHeader(event, id, 'Mcp-Name', params?.name, true) : null)
}

/** Tool arguments are an object or nothing; anything else is treated as no arguments. */
function toolArguments(params: JsonRpcRequest['params']): Record<string, unknown> {
  const args = params?.arguments
  return args && typeof args === 'object' && !Array.isArray(args) ? args as Record<string, unknown> : {}
}

const advertisedTools = mcpTools.map(({ handler, ...tool }) => tool)

/**
 * Single dispatch for both protocol eras. The stateless revision wraps every
 * result in `resultType` and server `_meta`, and every request carries its own
 * version and capabilities, so nothing is remembered between calls. Older
 * revisions answer the handshake without minting a session, which they permit,
 * so the endpoint stays stateless either way.
 */
async function dispatch(event: H3Event, request: JsonRpcRequest, stateless: boolean): Promise<McpResponse> {
  const id = request.id as JsonRpcId
  const { method, params } = request
  const complete = (value: Record<string, unknown> = {}) => result(id, stateless
    ? { resultType: 'complete', ...value, _meta: { [META_SERVER_INFO]: SERVER_INFO } }
    : value)
  const cacheHints = stateless ? CACHE_HINTS : {}

  switch (method) {
    // `initialize` and `ping` went away with the sessions they served, so the
    // stateless revision answers the 404 the transport mandates for them.
    case 'initialize': {
      if (stateless)
        return methodNotFound(id, method)

      // An unknown requested version falls back to the newest legacy revision.
      const requested = params?.protocolVersion
      return result(id, {
        protocolVersion: isLegacyVersion(requested) ? requested : LEGACY_PROTOCOL_VERSIONS[0],
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }

    case 'ping':
      return stateless ? methodNotFound(id, method) : complete()

    case 'server/discover':
      return stateless
        ? complete({ supportedVersions: SUPPORTED_PROTOCOL_VERSIONS, capabilities: SERVER_CAPABILITIES, instructions: INSTRUCTIONS, ...cacheHints })
        : methodNotFound(id, method)

    case 'tools/list':
      return complete({ tools: advertisedTools, ...cacheHints })

    case 'tools/call': {
      const name = params?.name
      const tool = mcpTools.find(candidate => candidate.name === name)
      if (!tool)
        return fail(id, 400, ErrorCode.InvalidParams, `Unknown tool: ${String(name)}`)

      return complete({ ...await callMcpTool(event, tool, toolArguments(params)) })
    }

    default:
      return methodNotFound(id, method)
  }
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

export async function handleMcpPost(event: H3Event): Promise<McpResponse> {
  if (!isAllowedOrigin(event))
    return fail(undefined, 403, ErrorCode.InvalidRequest, 'Origin not allowed')

  let message: unknown
  try {
    message = JSON.parse(await readRawBody(event) || '')
  }
  catch {
    return fail(undefined, 400, ErrorCode.ParseError, 'Request body is not valid JSON')
  }

  if (Array.isArray(message))
    return fail(undefined, 400, ErrorCode.InvalidRequest, 'Batched messages are not supported; send one JSON-RPC message per request')

  if (!isJsonRpcRequest(message))
    return fail(undefined, 400, ErrorCode.InvalidRequest, 'Request body must be a single JSON-RPC 2.0 request or notification')

  // Notifications carry no id and get no response body.
  if (message.id === undefined) {
    return message.method.startsWith('notifications/')
      ? { status: 202, body: null }
      : fail(undefined, 400, ErrorCode.InvalidRequest, `Method ${message.method} must be sent as a request with an id`)
  }

  // The declared version comes from `_meta` when present and the mirrored header otherwise.
  const metaVersion = readMeta(message)?.[META_PROTOCOL_VERSION]
  const version = typeof metaVersion === 'string' ? metaVersion : getHeader(event, 'mcp-protocol-version') || undefined

  if (version === MCP_PROTOCOL_VERSION)
    return validateRequest(event, message) ?? await dispatch(event, message, true)

  if (message.method === 'initialize' || version === undefined || isLegacyVersion(version))
    return await dispatch(event, message, false)

  return fail(message.id, 400, ErrorCode.UnsupportedProtocolVersion, 'Unsupported protocol version', {
    supported: SUPPORTED_PROTOCOL_VERSIONS,
    requested: version,
  })
}
