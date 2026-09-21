import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, fetchWithAuth, setLinkStoreD1Mode } from '../utils'

const MCP_PATH = '/api/mcp'
const PROTOCOL_VERSION = '2025-11-25'
const LEGACY_VERSIONS = ['2025-03-26', '2024-11-05']

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
  id?: string | number | null
  result?: Record<string, any>
  error?: { code: number, message: string, data?: any }
}

function baseHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    ...extra,
  }
}

function postMcp(body: unknown, headers: Record<string, string>, withAuth = true, path = MCP_PATH) {
  const request = withAuth ? fetchWithAuth : fetch
  return request(path, { method: 'POST', body: JSON.stringify(body), headers })
}

function postRpc(id: string | number, method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return postMcp({ jsonrpc: '2.0', id, method, params }, baseHeaders({ 'Mcp-Protocol-Version': PROTOCOL_VERSION, ...headers }))
}

function postInitialize(id: string | number, protocolVersion = PROTOCOL_VERSION) {
  return postMcp(
    {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    },
    baseHeaders(),
  )
}

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await postRpc(`call-${name}-${crypto.randomUUID()}`, 'tools/call', { name, arguments: args })
  const payload = await response.json() as JsonRpcEnvelope
  return { response, payload }
}

function trackSlug(slug: string) {
  createdSlugs.add(slug)
  return slug
}

describe('/api/mcp authentication', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await postMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, baseHeaders(), false)
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
  })

  it('rejects cross-origin browser requests', async () => {
    const response = await postMcp(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      { ...baseHeaders(), Origin: 'https://attacker.example' },
    )
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
      baseHeaders(),
    )
    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })

  it('rejects malformed JSON with a parse error', async () => {
    const response = await fetchWithAuth(MCP_PATH, {
      method: 'POST',
      body: '{ not json',
      headers: baseHeaders(),
    })
    expect(response.status).toBe(400)
    expect((await response.json() as JsonRpcEnvelope).error?.code).toBe(-32700)
  })

  it('requires the Streamable HTTP Accept header', async () => {
    const response = await postMcp(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      { 'Content-Type': 'application/json' },
    )
    expect(response.status).toBe(406)
  })

  it('requires a JSON content type', async () => {
    const response = await fetchWithAuth(MCP_PATH, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }),
      headers: { 'Accept': 'application/json, text/event-stream', 'Content-Type': 'text/plain' },
    })
    expect(response.status).toBe(415)
  })

  it('rejects an unsupported protocol version', async () => {
    const response = await postMcp(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      baseHeaders({ 'Mcp-Protocol-Version': '1900-01-01' }),
    )
    expect(response.status).toBe(400)
  })

  it('returns a JSON-RPC error for unknown methods', async () => {
    const response = await postRpc(1, 'resources/list')
    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.error?.code).toBe(-32601)
  })
})

describe('/api/mcp handshake', () => {
  it('answers initialize without minting a session', async () => {
    const response = await postInitialize(1)
    expect(response.status).toBe(200)
    expect(response.headers.get('Mcp-Session-Id')).toBeNull()

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.result?.protocolVersion).toBe(PROTOCOL_VERSION)
    expect(payload.result?.serverInfo.name).toBe('sink')
    expect(payload.result?.capabilities.tools).toBeDefined()
    expect(typeof payload.result?.instructions).toBe('string')
  })

  it.each(LEGACY_VERSIONS)('negotiates legacy protocol version %s', async (version) => {
    const response = await postInitialize(1, version)
    expect(response.status).toBe(200)

    const payload = await response.json() as JsonRpcEnvelope
    expect(payload.result?.protocolVersion).toBe(version)
    expect(payload.result?.serverInfo.name).toBe('sink')
  })

  it('answers ping', async () => {
    const response = await postRpc(1, 'ping')
    expect(response.status).toBe(200)
    expect((await response.json() as JsonRpcEnvelope).result).toEqual({})
  })

  it('lists tools with input schemas', async () => {
    const response = await postRpc(1, 'tools/list')
    expect(response.status).toBe(200)

    const payload = await response.json() as JsonRpcEnvelope
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
    ['unknown tools', 'no_such_tool', {}, 'not found'],
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

  it('counts links and lists tags', async () => {
    const { payload: counted } = await callTool('count_links', {})
    expect(typeof counted.result?.structuredContent.count).toBe('number')

    const { payload: tagged } = await callTool('list_tags', {})
    expect(Array.isArray(tagged.result?.structuredContent.tags)).toBe(true)
  })
})

describe('/api/mcp path normalization', () => {
  // The router folds these onto the same handler, and the auth middleware's
  // `/api/` prefix covers every one of them.
  it.each([[`${MCP_PATH}/`, false, 401], [`${MCP_PATH}//`, false, 401], [`${MCP_PATH}/`, true, 200]] as const)('answers %s with auth=%s as %i', async (path, withAuth, status) => {
    const response = await postMcp(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      baseHeaders({ 'Mcp-Protocol-Version': PROTOCOL_VERSION }),
      withAuth,
      path,
    )
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

    expect((await postRpc(1, 'tools/list')).status).toBe(200)
  })
})
