import { env } from 'cloudflare:workers'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { deleteStoredLinks, fetch, getStoredLink, postJson, putJson, setLinkStoreD1Mode } from './utils'

type CfRequestInit = RequestInit & { cf?: { country?: string } }
type UpstreamHandler = (init: RequestInit | undefined) => Response | Promise<Response>

const createdSlugs: string[] = []
const upstreamHandlers = new Map<string, UpstreamHandler>()
let fetchSpy: ReturnType<typeof vi.spyOn> | undefined

beforeAll(async () => {
  // The proxy tests below need the instance flag; the contract is opt-in.
  env.NUXT_LINK_PROXY_ENABLED = 'true'
  await setLinkStoreD1Mode()
})

afterEach(() => {
  upstreamHandlers.clear()
  fetchSpy?.mockRestore()
  fetchSpy = undefined
})

afterAll(async () => {
  delete env.NUXT_LINK_PROXY_ENABLED
  await deleteStoredLinks(createdSlugs)
})

function mockUpstream(handlers: Record<string, UpstreamHandler>) {
  for (const [host, handler] of Object.entries(handlers))
    upstreamHandlers.set(host, handler)

  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const handler = upstreamHandlers.get(new URL(url).host)
    if (!handler)
      return Promise.reject(new Error(`Unexpected outbound request to ${url}`))
    return Promise.resolve(handler(init))
  })
}

function upstreamCalls(host: string) {
  return (fetchSpy?.mock.calls ?? []).filter(([input]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    return new URL(url).host === host
  })
}

function upstreamHeaders(init: RequestInit | undefined): Record<string, string> {
  return Object.fromEntries(new Headers(init?.headers).entries())
}

function parseSetCookie(response: Response, name: string): string | null {
  const header = response.headers.get('set-cookie')
  const match = header?.match(new RegExp(`${name}=([^;]*)`))
  return match?.[1] ?? null
}

// Mirrors signProxyGate in server/middleware/1.redirect.ts so tests can forge
// expired or stale-version grant cookies.
async function forgeGateCookie(slug: string, grant: 'p' | 'u' | 'pu', link: { updatedAt: number, password?: string }, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`sink-link-gate:${import.meta.env.NUXT_SITE_TOKEN}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const payload = `${slug}.${grant}.${expiresAt}.${link.updatedAt}.${link.password ?? ''}`
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const hex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${grant}.${expiresAt}.${hex}`
}

async function createProxyLink(url: string, extra: Record<string, unknown> = {}): Promise<string> {
  const slug = `proxy-${crypto.randomUUID()}`
  const response = await postJson('/api/link/create', { url, slug, proxy: true, ...extra })
  expect(response.status).toBe(201)
  createdSlugs.push(slug)
  return slug
}

describe('/', () => {
  it('redirects CriOS user agent to apple URL', async () => {
    const slug = `crios-apple-${crypto.randomUUID()}`
    const apple = 'https://apps.apple.com/app/sink-test'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com',
      slug,
      apple,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)
    const createData = await createResponse.json() as { link: { apple?: string } }
    expect(createData.link.apple).toBe(apple)

    const response = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147 Version/11.1.1 Safari/605.1.15',
      },
    })

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(apple)
  })

  it('merges request query parameters into a target that already has a query', async () => {
    const slug = `redirect-query-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/landing?source=original&shared=target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      redirectWithQuery: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const response = await fetch(`/${slug}?campaign=summer&shared=request`, { redirect: 'manual' })

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://example.com/landing?source=original&shared=request&campaign=summer')
  })

  it('returns OG HTML to social bots while redirecting regular browsers', async () => {
    const slug = `social-og-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/social-target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      title: 'Social preview title',
      description: 'Social preview description',
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const botResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Twitterbot/1.0' },
    })
    const html = await botResponse.text()
    expect(botResponse.status).toBe(200)
    expect(botResponse.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('<meta property="og:title" content="Social preview title">')
    expect(html).toContain('<meta property="og:description" content="Social preview description">')
    expect(html).toContain(`content="1;url=${targetUrl}"`)

    const browserResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    expect(browserResponse.status).toBe(301)
    expect(browserResponse.headers.get('Location')).toBe(targetUrl)
  })

  it('redirects to geo URL when cf.country matches', async () => {
    const slug = `geo-cn-${crypto.randomUUID()}`
    const cnUrl = 'https://cn.example.com/landing'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      geo: { CN: cnUrl },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'CN' } }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(cnUrl)
  })

  it('redirects to default URL when cf.country does not match', async () => {
    const slug = `geo-default-${crypto.randomUUID()}`
    const defaultUrl = 'https://example.com/default'

    const createResponse = await postJson('/api/link/create', {
      url: defaultUrl,
      slug,
      geo: { CN: 'https://cn.example.com/landing' },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'US' } }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(defaultUrl)
  })

  it('shows geo URL in unsafe warning', async () => {
    const slug = `unsafe-geo-${crypto.randomUUID()}`
    const cnUrl = 'https://cn.example.com/unsafe'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      unsafe: true,
      geo: { CN: cnUrl },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = { redirect: 'manual', cf: { country: 'CN' } }
    const response = await fetch(`/${slug}`, options as RequestInit)
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain(cnUrl)
  })

  it('adds viewport meta to cloaked links for mobile browsers (fixes #301)', async () => {
    const slug = `cloaking-viewport-${crypto.randomUUID()}`
    const targetUrl = 'https://example.com/mobile-target'

    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      cloaking: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('<meta name="viewport" content="width=device-width,initial-scale=1">')
    expect(html).toContain(`<iframe src="${targetUrl}"`)
    expect(html).toContain('allow-top-navigation-by-user-activation')
    expect(html).toContain('allow-downloads')
    expect(html).toContain('allow-modals')
  })

  it('proxies request to destination URL when proxy is enabled', async () => {
    mockUpstream({
      'upstream.test': () => new Response('proxied upstream body', {
        headers: { 'Content-Type': 'text/plain' },
      }),
    })
    const slug = await createProxyLink('https://upstream.test/')

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.text()).toBe('proxied upstream body')
    expect(upstreamCalls('upstream.test').length).toBe(1)
  })

  it('degrades a stored proxy link to a plain redirect while the flag is off', async () => {
    mockUpstream({
      'degraded.test': () => new Response('must not be fetched'),
    })
    const slug = await createProxyLink('https://degraded.test/landing')

    for (const disabled of [undefined, 'false']) {
      if (disabled === undefined)
        delete env.NUXT_LINK_PROXY_ENABLED
      else
        env.NUXT_LINK_PROXY_ENABLED = disabled

      const response = await fetch(`/${slug}`, { redirect: 'manual' })
      expect(response.status, `NUXT_LINK_PROXY_ENABLED=${disabled}`).toBe(301)
      expect(response.headers.get('location')).toBe('https://degraded.test/landing')
    }
    env.NUXT_LINK_PROXY_ENABLED = 'true'
    expect(upstreamCalls('degraded.test').length).toBe(0)
  })

  it('refuses to proxy private or local targets', async () => {
    const blockedTargets = [
      'http://127.0.0.1:9/',
      'http://10.0.0.1/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/',
      'http://[::ffff:7f00:1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[0:0:0:0:0:ffff:a00:1]/',
      'http://[64:ff9b::a00:1]/',
      'http://[2002:a00:1::]/',
      'http://[2001::a00:1:0:0]/',
    ]
    mockUpstream({})

    for (const url of blockedTargets) {
      const slug = await createProxyLink(url)
      const response = await fetch(`/${slug}`, { redirect: 'manual' })
      expect(response.status, url).toBe(403)
    }
  })

  it('does not forward credential headers to the proxy target', async () => {
    mockUpstream({
      'headers.test': init => new Response(JSON.stringify({ headers: upstreamHeaders(init) }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    })
    const slug = await createProxyLink('https://headers.test/headers')

    const response = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: {
        'Authorization': 'Bearer leaked-token',
        'Cookie': 'session=secret',
        'X-Link-Password': 'link-secret',
        'X-Forwarded-For': '1.2.3.4',
        'X-Real-Ip': '5.6.7.8',
        'X-Custom-Header': 'custom-value',
        'User-Agent': 'SinkProxyTest/1.0',
      },
    })
    expect(response.status).toBe(200)

    const { headers: echoed } = await response.json() as { headers: Record<string, string> }
    const echoedNames = Object.keys(echoed)
    expect(echoedNames).not.toContain('authorization')
    expect(echoedNames).not.toContain('cookie')
    expect(echoedNames).not.toContain('x-link-password')
    expect(echoedNames).not.toContain('x-real-ip')
    // Without a trusted cf-connecting-ip the client's value is passed through;
    // on Cloudflare it is replaced by the real connecting IP.
    expect(echoed['x-forwarded-for']).toBe('1.2.3.4')
    expect(echoed['x-custom-header']).toBe('custom-value')
    expect(echoed['user-agent']).toBe('SinkProxyTest/1.0')
  })

  it('streams proxied request bodies including binary payloads', async () => {
    const received: { body: Uint8Array, contentType: string | undefined } = { body: new Uint8Array(), contentType: undefined }
    mockUpstream({
      'echo.test': async (init) => {
        const stream = init?.body as ReadableStream<Uint8Array> | undefined
        if (stream) {
          const chunks: Uint8Array[] = []
          const reader = stream.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done)
              break
            chunks.push(value)
          }
          const total = chunks.reduce((n, c) => n + c.length, 0)
          const merged = new Uint8Array(total)
          let offset = 0
          for (const chunk of chunks) {
            merged.set(chunk, offset)
            offset += chunk.length
          }
          received.body = merged
        }
        received.contentType = upstreamHeaders(init)['content-type']
        return new Response('ok')
      },
    })
    const slug = await createProxyLink('https://echo.test/upload')

    const payload = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00, 0xFF, 0xFE, 0x00])
    const response = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload,
    })

    expect(response.status).toBe(200)
    expect([...received.body]).toEqual([...payload])
    expect(received.contentType).toBe('application/octet-stream')
  })

  it('supports OPTIONS requests through the proxy', async () => {
    mockUpstream({
      'options.test': () => new Response(null, {
        status: 204,
        headers: { Allow: 'GET, POST, OPTIONS' },
      }),
    })
    const slug = await createProxyLink('https://options.test/resource')

    const response = await fetch(`/${slug}`, { method: 'OPTIONS', redirect: 'manual' })
    expect(response.status).toBe(204)
    expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS')
  })

  it('follows upstream redirects only to validated public http(s) targets', async () => {
    mockUpstream({
      'chain.test': (init) => {
        void init
        return new Response(null, { status: 302, headers: { Location: 'https://hop.test/final' } })
      },
      'hop.test': () => new Response('final destination'),
    })
    const slug = await createProxyLink('https://chain.test/start')

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('final destination')
    expect(upstreamCalls('hop.test').length).toBe(1)
  })

  it('refuses to follow upstream redirects to private or non-http targets', async () => {
    mockUpstream({
      'private-redirect.test': () => new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/' } }),
      'badproto.test': () => new Response(null, { status: 302, headers: { Location: 'file:///etc/passwd' } }),
    })
    const privateSlug = await createProxyLink('https://private-redirect.test/start')
    const badProtoSlug = await createProxyLink('https://badproto.test/start')

    const privateResponse = await fetch(`/${privateSlug}`, { redirect: 'manual' })
    expect(privateResponse.status).toBe(502)

    const badProtoResponse = await fetch(`/${badProtoSlug}`, { redirect: 'manual' })
    expect(badProtoResponse.status).toBe(502)

    expect(upstreamCalls('private-redirect.test').length).toBe(1)
    expect(upstreamCalls('badproto.test').length).toBe(1)
  })

  it('detects redirect loops and bounds redirect depth', async () => {
    mockUpstream({
      'loop.test': () => new Response(null, { status: 302, headers: { Location: 'https://loop.test/' } }),
      'longchain.test': () => new Response(null, { status: 302, headers: { Location: 'https://longchain.test/next' } }),
    })
    const loopSlug = await createProxyLink('https://loop.test/')
    const chainSlug = await createProxyLink('https://longchain.test/start')

    const loopResponse = await fetch(`/${loopSlug}`, { redirect: 'manual' })
    expect(loopResponse.status).toBe(508)

    const chainResponse = await fetch(`/${chainSlug}`, { redirect: 'manual' })
    expect(chainResponse.status).toBe(508)
    expect(upstreamCalls('longchain.test').length).toBeLessThanOrEqual(7)
  })

  it('returns 307/308 redirects for request bodies instead of following them', async () => {
    mockUpstream({
      'redirected.test': () => new Response('must not be fetched'),
      'keep-body.test': () => new Response(null, { status: 307, headers: { Location: 'https://redirected.test/' } }),
    })
    const slug = await createProxyLink('https://keep-body.test/upload')

    const response = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      body: 'payload',
      headers: { 'Content-Type': 'text/plain' },
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://redirected.test/')
    expect(upstreamCalls('redirected.test').length).toBe(0)
  })

  it('sandboxes active proxied content without allow-same-origin', async () => {
    mockUpstream({
      'sandbox.test': () => new Response('<html><body>served</body></html>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': 'script-src https://upstream.example',
          'Set-Cookie': 'session=evil',
        },
      }),
    })
    const slug = await createProxyLink('https://sandbox.test/page')

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('served')

    const csp = response.headers.get('content-security-policy') || ''
    expect(csp).toContain('sandbox')
    expect(csp).toContain('allow-scripts')
    expect(csp).toContain('allow-pointer-lock')
    expect(csp).toContain('allow-presentation')
    expect(csp).not.toContain('allow-same-origin')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('sandboxes every proxied response including binary content', async () => {
    mockUpstream({
      'types.test': () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }),
      'binary.test': () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'application/octet-stream' } }),
    })
    const svgSlug = await createProxyLink('https://types.test/img.svg')
    const binSlug = await createProxyLink('https://binary.test/file.bin')

    const svgResponse = await fetch(`/${svgSlug}`, { redirect: 'manual' })
    expect(svgResponse.headers.get('content-security-policy')).toContain('sandbox')
    expect(svgResponse.headers.get('x-content-type-options')).toBe('nosniff')

    const binResponse = await fetch(`/${binSlug}`, { redirect: 'manual' })
    expect(binResponse.headers.get('content-security-policy')).toContain('sandbox')
    expect(binResponse.headers.get('x-content-type-options')).toBe('nosniff')
    expect(binResponse.headers.get('content-type')).toBe('application/octet-stream')
  })

  it('downgrades missing or malformed upstream Content-Type to octet-stream', async () => {
    mockUpstream({
      'nocontenttype.test': () => new Response(new Uint8Array([0x3C, 0x68])),
      'bogus.test': () => new Response('<html>mislabeled</html>', { headers: { 'Content-Type': 'not-a-media-type' } }),
    })
    const missingSlug = await createProxyLink('https://nocontenttype.test/page')
    const bogusSlug = await createProxyLink('https://bogus.test/page')

    const missing = await fetch(`/${missingSlug}`, { redirect: 'manual' })
    expect(missing.headers.get('content-type')).toBe('application/octet-stream')
    expect(missing.headers.get('x-content-type-options')).toBe('nosniff')

    const bogus = await fetch(`/${bogusSlug}`, { redirect: 'manual' })
    expect(bogus.headers.get('content-type')).toBe('application/octet-stream')
    expect(bogus.headers.get('content-security-policy')).toContain('sandbox')
  })

  it('strips origin-scoped control headers from upstream responses', async () => {
    mockUpstream({
      'controls.test': () => new Response('api payload', {
        headers: {
          'Content-Type': 'application/json',
          'Clear-Site-Data': '"cache", "cookies", "storage"',
          'Refresh': '0; url=https://evil.test/',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Alt-Svc': 'h3=":443"',
          'Access-Control-Allow-Origin': '*',
          'Content-Disposition': 'attachment; filename="data.json"',
        },
      }),
    })
    const slug = await createProxyLink('https://controls.test/data')

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(response.headers.get('clear-site-data')).toBeNull()
    expect(response.headers.get('refresh')).toBeNull()
    expect(response.headers.get('strict-transport-security')).toBeNull()
    expect(response.headers.get('alt-svc')).toBeNull()
    // Common API/download headers must survive the filter.
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('content-disposition')).toContain('attachment')
  })

  it('refuses to reflect redirect locations pointing at private targets', async () => {
    mockUpstream({
      'post-redirect.test': () => new Response(null, { status: 307, headers: { Location: 'http://169.254.169.254/' } }),
    })
    const slug = await createProxyLink('https://post-redirect.test/upload')

    // The body cannot be replayed on a 307, so the response would previously
    // be handed to the client with the private Location unvalidated.
    const response = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      body: 'payload',
      headers: { 'Content-Type': 'text/plain' },
    })

    expect(response.status).toBe(502)
    expect(response.headers.get('location')).toBeNull()
  })

  it('drops caller x-* extension headers when a redirect crosses origins', async () => {
    mockUpstream({
      'first.test': () => new Response(null, { status: 302, headers: { Location: 'https://second.test/final' } }),
      'second.test': init => new Response(JSON.stringify({ headers: upstreamHeaders(init) }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    })
    const slug = await createProxyLink('https://first.test/start')

    const response = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'X-Custom-Header': 'first-origin-only' },
    })
    expect(response.status).toBe(200)

    const { headers: echoed } = await response.json() as { headers: Record<string, string> }
    expect(echoed['x-custom-header']).toBeUndefined()
    // The proxy's own computed x-forwarded-* values stay accurate per hop.
    expect(echoed['x-forwarded-host']).toBe('localhost')
  })

  it('prefers device redirect over geo redirect', async () => {
    const slug = `device-over-geo-${crypto.randomUUID()}`
    const apple = 'https://apps.apple.com/app/sink-test-priority'

    const createResponse = await postJson('/api/link/create', {
      url: 'https://example.com/default',
      slug,
      apple,
      geo: { CN: 'https://cn.example.com/landing' },
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const options: CfRequestInit = {
      redirect: 'manual',
      cf: { country: 'CN' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147 Version/11.1.1 Mobile/15E148 Safari/604.1',
      },
    }
    const response = await fetch(`/${slug}`, options as RequestInit)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(apple)
  })
})

describe('password protected redirect', { concurrent: false }, () => {
  it('shows password page without password, rejects wrong password, and redirects with correct password', async () => {
    const password = 'redirect-secret123'
    const payload = {
      url: 'https://example.com/redirect-target',
      slug: `redirect-password-${crypto.randomUUID()}`,
      password,
    }

    const createResponse = await postJson('/api/link/create', payload)
    expect(createResponse.status).toBe(201)
    createdSlugs.push(payload.slug)

    const passwordPageResponse = await fetch(`/${payload.slug}`, { redirect: 'manual' })
    expect(passwordPageResponse.status).toBe(200)
    expect(await passwordPageResponse.text()).toContain('Password Required')

    const wrongPasswordResponse = await fetch(`/${payload.slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': 'wrong-password' },
    })
    expect(wrongPasswordResponse.status).toBe(403)

    const correctPasswordResponse = await fetch(`/${payload.slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': password },
    })
    expect(correctPasswordResponse.status).toBeGreaterThanOrEqual(300)
    expect(correctPasswordResponse.status).toBeLessThan(400)
    expect(correctPasswordResponse.headers.get('location')).toBe(payload.url)
  })

  it('carries a valid password through unsafe confirmation and redirects after confirmation', async () => {
    const slug = `password-unsafe-${crypto.randomUUID()}`
    const password = 'unsafe-secret123'
    const targetUrl = 'https://example.com/confirmed-target'
    const createResponse = await postJson('/api/link/create', {
      url: targetUrl,
      slug,
      password,
      unsafe: true,
    })
    expect(createResponse.status).toBe(201)
    createdSlugs.push(slug)

    const passwordResponse = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(passwordResponse.status).toBe(200)
    expect(await passwordResponse.text()).toContain('Password Required')

    const warningResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password }),
    })
    const warningHtml = await warningResponse.text()
    expect(warningResponse.status).toBe(200)
    expect(warningHtml).toContain('Potentially Unsafe Link')
    expect(warningHtml).toContain(`<input type="hidden" name="password" value="${password}">`)
    expect(warningHtml).toContain('<input type="hidden" name="confirm" value="true">')

    const confirmedResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password, confirm: 'true' }),
    })
    expect(confirmedResponse.status).toBe(301)
    expect(confirmedResponse.headers.get('Location')).toBe(targetUrl)
  })
})

describe('proxied link gates', { concurrent: false }, () => {
  it('never forwards password form bodies upstream and grants access via 303 cookie flow', async () => {
    mockUpstream({
      'gated.test': init => new Response(`secret ${upstreamHeaders(init)['content-type'] ?? ''}`),
    })
    const password = 'proxy-secret123'
    const slug = await createProxyLink('https://gated.test/data', { password })

    const passwordPage = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(passwordPage.status).toBe(200)
    expect(await passwordPage.text()).toContain('Password Required')
    expect(upstreamCalls('gated.test').length).toBe(0)

    const formResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password }),
    })
    expect(formResponse.status).toBe(303)
    expect(formResponse.headers.get('location')).toBe(`/${slug}`)
    expect(upstreamCalls('gated.test').length).toBe(0)

    const cookie = parseSetCookie(formResponse, `pw_${slug}`)
    expect(cookie).toBeTruthy()

    const proxied = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { Cookie: `pw_${slug}=${cookie}` },
    })
    expect(proxied.status).toBe(200)
    expect(await proxied.text()).toContain('secret')
    expect(proxied.headers.get('cache-control')).toBe('private, no-store')
    expect(upstreamCalls('gated.test').length).toBe(1)
  })

  it('forces private no-store on gated proxied responses and overrides upstream caching', async () => {
    mockUpstream({
      'cached.test': () => new Response('<html>gated html</html>', {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600',
          'ETag': '"abc"',
        },
      }),
    })
    const slug = await createProxyLink('https://cached.test/', { unsafe: true })

    const warning = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(warning.status).toBe(200)
    expect(await warning.text()).toContain('Potentially Unsafe Link')
    expect(upstreamCalls('cached.test').length).toBe(0)

    const confirmed = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ confirm: 'true' }),
    })
    expect(confirmed.status).toBe(303)
    const cookie = parseSetCookie(confirmed, `pw_${slug}`)
    expect(cookie).toBeTruthy()

    const proxied = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { Cookie: `pw_${slug}=${cookie}` },
    })
    expect(proxied.status).toBe(200)
    expect(proxied.headers.get('cache-control')).toBe('private, no-store')
    expect(proxied.headers.get('etag')).toBe('"abc"')
    expect(proxied.headers.get('content-security-policy')).toContain('sandbox')
  })

  it('still honors x-link-password header authentication on proxied links', async () => {
    mockUpstream({
      'api.test': () => new Response('api response'),
    })
    const password = 'api-secret123'
    const slug = await createProxyLink('https://api.test/data', { password })

    const denied = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': 'wrong' },
    })
    expect(denied.status).toBe(403)

    const allowed = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { 'x-link-password': password },
    })
    expect(allowed.status).toBe(200)
    expect(await allowed.text()).toBe('api response')
    expect(allowed.headers.get('cache-control')).toBe('private, no-store')
  })

  it('streams POST bodies upstream when header credentials are provided', async () => {
    const received: { body: Uint8Array } = { body: new Uint8Array() }
    mockUpstream({
      'poststream.test': async (init) => {
        const stream = init?.body as ReadableStream<Uint8Array> | undefined
        if (stream) {
          const reader = stream.getReader()
          const chunks: Uint8Array[] = []
          for (;;) {
            const { done, value } = await reader.read()
            if (done)
              break
            chunks.push(value)
          }
          const merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            merged.set(chunk, offset)
            offset += chunk.length
          }
          received.body = merged
        }
        return new Response('posted')
      },
    })
    const password = 'post-secret123'
    const slug = await createProxyLink('https://poststream.test/api', { password, unsafe: true })

    // Header credentials take precedence: the JSON body is forwarded, not
    // consumed by the gate.
    const payload = JSON.stringify({ data: 'value' })
    const response = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'x-link-password': password,
        'x-link-confirm': 'true',
      },
      body: payload,
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('posted')
    expect(new TextDecoder().decode(received.body)).toBe(payload)
  })

  it('denies non-form POSTs on gated proxy links without consuming the body', async () => {
    mockUpstream({
      'denied.test': () => new Response('never reached'),
    })
    const password = 'denied-secret123'
    const slug = await createProxyLink('https://denied.test/api', { password })

    const response = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unauthenticated: true }),
    })
    expect(response.status).toBe(403)
    expect(upstreamCalls('denied.test').length).toBe(0)
  })

  it('rejects expired and stale grant cookies', async () => {
    mockUpstream({
      'stale.test': () => new Response('stale upstream'),
    })
    const slug = await createProxyLink('https://stale.test/page', { unsafe: true })
    const stored = await getStoredLink(slug)
    expect(stored?.updatedAt).toBeTypeOf('number')

    const now = Math.floor(Date.now() / 1000)

    // An expired grant must be refused even though its signature is valid.
    const expired = await forgeGateCookie(slug, 'u', { updatedAt: stored!.updatedAt }, now - 60)
    const expiredResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { Cookie: `pw_${slug}=${expired}` },
    })
    expect(expiredResponse.status).toBe(200)
    expect(await expiredResponse.text()).toContain('Potentially Unsafe Link')
    expect(upstreamCalls('stale.test').length).toBe(0)

    // A grant signed against a previous link version dies after any edit.
    const stale = await forgeGateCookie(slug, 'u', { updatedAt: stored!.updatedAt - 10 }, now + 3600)
    const staleResponse = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { Cookie: `pw_${slug}=${stale}` },
    })
    expect(staleResponse.status).toBe(200)
    expect(await staleResponse.text()).toContain('Potentially Unsafe Link')

    // Editing the link bumps updatedAt and kills a cookie minted before it.
    const realCookieResponse = await fetch(`/${slug}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ confirm: 'true' }),
    })
    expect(realCookieResponse.status).toBe(303)
    const realCookie = parseSetCookie(realCookieResponse, `pw_${slug}`)!
    const edit = await putJson('/api/link/edit', {
      url: 'https://stale.test/page',
      slug,
      proxy: true,
      unsafe: true,
      comment: 'bump version',
    })
    expect(edit.status).toBe(201)

    const afterEdit = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: { Cookie: `pw_${slug}=${realCookie}` },
    })
    expect(await afterEdit.text()).toContain('Potentially Unsafe Link')
    expect(upstreamCalls('stale.test').length).toBe(0)
  })
})
