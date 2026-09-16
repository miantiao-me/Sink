import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, fetchWithAuth, setLinkStoreD1Mode } from '../utils'

const MCP_PATH = '/api/mcp'
const MODERN_VERSION = '2026-07-28'
const LEGACY_VERSION = '2025-11-25'
const META_VERSION = 'io.modelcontextprotocol/protocolVersion'
const META_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities'

const createdSlugs = new Set<string>()

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  await deleteStoredLinks([...createdSlugs])
  createdSlugs.clear()
})

interface JsonRpcEnvelope {
  jsonrpc: string
  id?: string | number
  result?: Record<string, any>
  error?: { code: number, message: string, data?: any }
}

function modernBody(id: string | number, method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params: {
      ...params,
      _meta: {
        [META_VERSION]: MODERN_VERSION,
        [META_CAPABILITIES]: {},
      },
    },
  }
}

function modernHeaders(method: string, name?: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'MCP-Protocol-Version': MODERN_VERSION,
    'Mcp-Method': method,
    ...(name ? { 'Mcp-Name': name } : {}),
  }
}

function postMcp(body: unknown, headers: Record<string, string>, withAuth = true, path = MCP_PATH) {
  const request = withAuth ? fetchWithAuth : fetch
  return request(path, { method: 'POST', body: JSON.stringify(body), headers })
}

function postModern(id: string | number, method: string, params: Record<string, unknown> = {}, headerOverrides: Record<string, string> = {}) {
  const toolName = method === 'tools/call' ? params.name as string : undefined
  return postMcp(modernBody(id, method, params), { ...modernHeaders(method, toolName), ...headerOverrides })
}

function postLegacy(id: string | number, method: string, params: Record<string, unknown> = {}) {
  return postMcp({ jsonrpc: '2.0', id, method, params }, { 'Content-Type': 'application/json' })
}

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await postModern(`call-${name}`, 'tools/call', { name, arguments: args })
  const payload = await response.json() as JsonRpcEnvelope
  return { response, payload }
}

function trackSlug(slug: string) {
  createdSlugs.add(slug)
  return slug
}

describe('/api/mcp authentication', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await postMcp(modernBody(1, 'tools/list'), modernHeaders('tools/list'), false)
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
  })

  it('rejects cross-origin browser requests', async () => {
    const response = await postMcp(modernBody(1, 'tools/list'), {
      ...modernHeaders('tools/list'),
      Origin: 'https://attacker.example',
    })
    expect(response.status).toBe(403)
  })
})

describe('/api/mcp transport', () => {
  it('rejects GET and DELETE with 405', async () => {
    const get = await fetchWithAuth(MCP_PATH)
    expect(get.status).toBe(405)

    const del = await fetchWithAuth(MCP_PATH, { method: 'DELETE' })
    expect(del.status).toBe(405)
  })

  it('answers notifications with 202 and no body', async () => {
    const response = await postMcp(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { 'Content-Type': 'application/json' },
    )
    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })

  const rejected: [string, () => Promise<Response>, number][] = [
    ['the body is malformed JSON', () => fetchWithAuth(MCP_PATH, { method: 'POST', body: '{ not json', headers: { 'Content-Type': 'application/json' } }), -32700],
    ['messages are batched', () => postMcp([modernBody(1, 'tools/list')], modernHeaders('tools/list')), -32600],
    ['Mcp-Method disagrees with the body', () => postModern(1, 'tools/list', {}, { 'Mcp-Method': 'tools/call' }), -32020],
    ['Mcp-Name disagrees with the body', () => postModern(1, 'tools/call', { name: 'list_tags', arguments: {} }, { 'Mcp-Name': 'list_links' }), -32020],
    ['Mcp-Name carries a malformed base64 sentinel', () => postModern(1, 'tools/call', { name: 'list_tags', arguments: {} }, { 'Mcp-Name': '=?base64?not valid base64!!?=' }), -32020],
    ['the MCP-Protocol-Version header is absent', () => postMcp(modernBody(1, 'tools/list'), { 'Content-Type': 'application/json', 'Mcp-Method': 'tools/list' }), -32020],
    ['the client capabilities _meta entry is absent', () => postMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { [META_VERSION]: MODERN_VERSION } } }, modernHeaders('tools/list')), -32602],
  ]

  it.each(rejected)('rejects a request where %s', async (_label, send, code) => {
    const response = await send()
    expect(response.status).toBe(400)
    expect((await response.json() as JsonRpcEnvelope).error?.code).toBe(code)
  })

  it('reports supported versions for an unknown protocol version', async () => {
    const response = await postMcp(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { [META_VERSION]: '1900-01-01' } } },
      { 'Content-Type': 'application/json', 'MCP-Protocol-Version': '1900-01-01', 'Mcp-Method': 'tools/list' },
    )
    expect(response.status).toBe(400)

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.error?.code).toBe(-32022)
    expect(payload.error?.data.supported).toContain(MODERN_VERSION)
  })

  // `resources/list` was never served; `ping` and `initialize` this revision removed.
  it.each(['resources/list', 'ping', 'initialize'])('returns 404 with a JSON-RPC error for %s', async (method) => {
    const response = await postModern(1, method)
    expect(response.status).toBe(404)
    expect((await response.json() as JsonRpcEnvelope).error?.code).toBe(-32601)
  })
})

describe('/api/mcp discovery', () => {
  it('answers server/discover with supported versions and capabilities', async () => {
    const response = await postModern('discover-1', 'server/discover')
    expect(response.status).toBe(200)

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.result?.resultType).toBe('complete')
    expect(payload.result?.supportedVersions).toContain(MODERN_VERSION)
    expect(payload.result?.capabilities.tools).toBeDefined()
    expect(payload.result?._meta['io.modelcontextprotocol/serverInfo'].name).toBe('sink')
    expect(payload.result?.ttlMs).toBeGreaterThan(0)
    expect(payload.result?.cacheScope).toBe('public')
  })

  it('lists tools with input schemas', async () => {
    const response = await postModern(1, 'tools/list')
    expect(response.status).toBe(200)

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.result?.ttlMs).toBeGreaterThan(0)
    expect(payload.result?.cacheScope).toBe('public')

    const names = payload.result?.tools.map((tool: { name: string }) => tool.name)
    expect(names).toContain('create_link')
    expect(names).toContain('get_analytics_metrics')

    const createTool = payload.result?.tools.find((tool: { name: string }) => tool.name === 'create_link')
    expect(createTool.inputSchema.required).toContain('url')
    expect(createTool.annotations.readOnlyHint).toBe(false)
  })
})

describe('/api/mcp tools', () => {
  it('creates and reads a link', async () => {
    const slug = trackSlug(`mcp-${crypto.randomUUID()}`)

    const created = await callTool('create_link', { url: 'https://example.com/mcp', slug })
    expect(created.response.status).toBe(200)
    expect(created.payload.result?.isError).toBeUndefined()
    expect(created.payload.result?.structuredContent.link.slug).toBe(slug)

    const read = await callTool('get_link', { slug })
    expect(read.payload.result?.structuredContent.url).toBe('https://example.com/mcp')
    expect(read.payload.result?.content[0].type).toBe('text')
  })

  it('deletes a link', async () => {
    const slug = trackSlug(`mcp-${crypto.randomUUID()}`)
    await callTool('create_link', { url: 'https://example.com/mcp-delete', slug })

    const deleted = await callTool('delete_link', { slug })
    expect(deleted.payload.result?.structuredContent.deleted).toBe(true)

    const read = await callTool('get_link', { slug })
    expect(read.payload.result?.isError).toBe(true)
  })

  // Business and validation failures stay inside a 200 tool result so the model can self-correct.
  it.each([
    ['business failures', 'get_link', { slug: `missing-${crypto.randomUUID()}` }, '404'],
    ['invalid arguments', 'create_link', { url: 'not-a-url' }, 'Invalid arguments'],
  ] as const)('reports %s as tool errors, not protocol errors', async (_label, tool, args, text) => {
    const { response, payload } = await callTool(tool, args)
    expect(response.status).toBe(200)
    expect(payload.result?.isError).toBe(true)
    expect(payload.result?.content[0].text).toContain(text)
  })

  it('returns search matches under an object key', async () => {
    const slug = trackSlug(`mcp-${crypto.randomUUID()}`)
    await callTool('create_link', { url: 'https://example.com/mcp-search', slug })

    const { payload } = await callTool('search_links', { q: slug })
    expect(Array.isArray(payload.result?.structuredContent.links)).toBe(true)
    expect(payload.result?.structuredContent.links[0].slug).toBe(slug)
  })

  it('rejects an unknown tool with a protocol error', async () => {
    const response = await postModern(1, 'tools/call', { name: 'no_such_tool', arguments: {} })
    expect(response.status).toBe(400)
    expect((await response.json() as JsonRpcEnvelope).error?.code).toBe(-32602)
  })

  it('counts links and lists tags', async () => {
    const { payload: counted } = await callTool('count_links', {})
    expect(typeof counted.result?.structuredContent.count).toBe('number')

    const { payload: tagged } = await callTool('list_tags', {})
    expect(Array.isArray(tagged.result?.structuredContent.tags)).toBe(true)
  })
})

describe('/api/mcp backward compatibility', () => {
  it('answers the initialize handshake without minting a session', async () => {
    const response = await postLegacy(1, 'initialize', {
      protocolVersion: LEGACY_VERSION,
      capabilities: {},
      clientInfo: { name: 'legacy-client', version: '1.0.0' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Mcp-Session-Id')).toBeNull()

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.result?.protocolVersion).toBe(LEGACY_VERSION)
    expect(payload.result?.serverInfo.name).toBe('sink')
  })

  it('serves tools to initialization-based clients', async () => {
    const listed = await postLegacy(2, 'tools/list')
    const listedPayload = await listed.json() as JsonRpcEnvelope
    expect(listedPayload.result?.tools.length).toBeGreaterThan(0)
    expect(listedPayload.result?.resultType).toBeUndefined()

    const slug = trackSlug(`mcp-legacy-${crypto.randomUUID()}`)
    const called = await postLegacy(3, 'tools/call', {
      name: 'create_link',
      arguments: { url: 'https://example.com/legacy', slug },
    })
    const calledPayload = await called.json() as JsonRpcEnvelope
    expect(calledPayload.result?.structuredContent.link.slug).toBe(slug)
  })

  it('still answers ping for initialization-based clients', async () => {
    const response = await postLegacy(4, 'ping')
    expect(response.status).toBe(200)
    expect((await response.json() as JsonRpcEnvelope).result).toEqual({})
  })
})

describe('/api/mcp path normalization', () => {
  // The router folds these onto the same handler, and the auth middleware's
  // `/api/` prefix covers every one of them.
  it.each([[`${MCP_PATH}/`, false, 401], [`${MCP_PATH}//`, false, 401], [`${MCP_PATH}/`, true, 200]] as const)('answers %s with auth=%s as %i', async (path, withAuth, status) => {
    const response = await postMcp(modernBody(1, 'tools/list'), modernHeaders('tools/list'), withAuth, path)
    expect(response.status).toBe(status)
  })
})

describe('/api/mcp slug isolation', () => {
  // Living under `/api/` keeps the endpoint out of the link namespace entirely:
  // `slugRegex` rejects the slash, so `1.redirect.ts` skips the path without a
  // reserved slug, and no instance loses a short link by upgrading.
  it('leaves a short link on /mcp redirecting', async () => {
    const slug = trackSlug('mcp')
    const created = await callTool('create_link', { url: 'https://example.com/slug-isolation', slug })
    expect(created.payload.result?.structuredContent.link.slug).toBe(slug)

    const redirect = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe('https://example.com/slug-isolation')

    expect((await postModern(1, 'tools/list')).status).toBe(200)
  })
})
