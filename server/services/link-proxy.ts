import type { H3Event } from 'h3'

const PROXY_TIMEOUT_MS = 30_000
const MAX_PROXY_REDIRECTS = 5

// Proxy mode forwards only these standard headers plus `x-*` extension headers
// (webhook signatures, custom API keys). Credentials-bearing headers like
// cookie, authorization, and cf-access-* never leave the Sink origin.
const PROXY_FORWARD_HEADERS = new Set([
  'accept',
  'accept-language',
  'cache-control',
  'content-type',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'pragma',
  'range',
  'user-agent',
])

const PROXY_BLOCKED_EXTENSION_PREFIXES = ['x-forwarded-', 'x-link-']
const PROXY_BLOCKED_EXTENSION_HEADERS = new Set(['x-real-ip'])

function isProxyForwardHeader(name: string): boolean {
  if (PROXY_FORWARD_HEADERS.has(name))
    return true
  return name.startsWith('x-')
    && !PROXY_BLOCKED_EXTENSION_PREFIXES.some(prefix => name.startsWith(prefix))
    && !PROXY_BLOCKED_EXTENSION_HEADERS.has(name)
}

// Hop-by-hop, credential, and origin-scoped control headers are never
// reflected to the client: Clear-Site-Data would wipe Sink storage, Refresh
// could re-navigate the page, and HSTS/Alt-Svc/Origin-Agent-Cluster mutate
// how the browser treats the Sink origin.
const PROXY_SKIPPED_RESPONSE_HEADERS = new Set([
  'alt-svc',
  'clear-site-data',
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'origin-agent-cluster',
  'proxy-authenticate',
  'refresh',
  'set-cookie',
  'strict-transport-security',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'www-authenticate',
])

// RFC 9110 media type (type/subtype plus optional parameters). Anything else
// is untrusted and downgraded to application/octet-stream.
const VALID_CONTENT_TYPE = /^[!#$%&'*+\-.^`|~\w]+\/[!#$%&'*+\-.^`|~\w]+(?:\s*;[^\r\n]*)?$/

// Applied to every proxied response — not just the active content types — so
// a document navigation can never escape the opaque origin by mislabeling
// itself. Never include allow-same-origin: it would collapse the sandbox into
// the Sink origin and expose its credentials to the proxied page. The flag is
// inert for fetch-style API consumers.
const PROXY_CONTENT_SANDBOX = [
  'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation allow-pointer-lock allow-presentation',
].join('; ')

export interface LinkProxyOptions {
  // Set when the visitor passed a password/unsafe gate: never let upstream or
  // shared caches store the response.
  privateCache?: boolean
}

function buildForwardHeaders(event: H3Event): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(getHeaders(event))) {
    if (value !== undefined && isProxyForwardHeader(name.toLowerCase()))
      headers.set(name, value)
  }
  const clientIp = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for')
  if (clientIp)
    headers.set('x-forwarded-for', clientIp)
  headers.set('x-forwarded-proto', getRequestProtocol(event))
  headers.set('x-forwarded-host', getRequestHost(event))
  return headers
}

async function fetchUpstream(url: string, method: string, headers: Headers, body: ReadableStream | null): Promise<Response> {
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  }
  // Required by the spec (and Cloudflare Workers) when body is a stream
  if (body)
    init.duplex = 'half'
  return await fetch(url, init)
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

function buildUpstreamResponse(upstream: Response, privateCache: boolean): Response {
  const headers = new Headers()
  for (const [key, value] of upstream.headers.entries()) {
    if (!PROXY_SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase()))
      headers.set(key, value)
  }
  if (privateCache)
    headers.set('Cache-Control', 'private, no-store')
  // A missing or malformed Content-Type is downgraded to octet-stream so the
  // browser can never sniff it into active content.
  const contentType = headers.get('Content-Type')
  if (!contentType || !VALID_CONTENT_TYPE.test(contentType.trim()))
    headers.set('Content-Type', 'application/octet-stream')
  // Appended, not overwritten: if upstream sends its own CSP, browsers enforce
  // both policies, and the sandbox flag still applies.
  headers.append('Content-Security-Policy', PROXY_CONTENT_SANDBOX)
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

export async function proxyLinkRequest(event: H3Event, targetUrl: string, options: LinkProxyOptions = {}): Promise<Response> {
  if (!isPublicHttpUrl(targetUrl))
    throw createError({ status: 403, statusText: 'Proxy target is not allowed' })

  const headers = buildForwardHeaders(event)
  const request = toWebRequest(event)

  let url = targetUrl
  let method = event.method
  let body: ReadableStream | null = method === 'GET' || method === 'HEAD' ? null : request.body

  const visited = new Set<string>([url])
  let upstream: Response
  try {
    upstream = await fetchUpstream(url, method, headers, body)
    for (let redirects = 0; isRedirectStatus(upstream.status); redirects++) {
      const location = upstream.headers.get('location')
      if (!location)
        break

      // Every 3xx Location is resolved and validated up front: private or
      // non-http targets must never be reflected back to the client either.
      let next: URL
      try {
        next = new URL(location, url)
      }
      catch {
        // A malformed Location cannot be followed but is harmless to reflect.
        break
      }
      if (!isPublicHttpUrl(next.href))
        throw createError({ status: 502, statusText: 'Proxy redirect target is not allowed' })

      // Request bodies cannot be replayed, so only redirects that switch to a
      // bodyless GET (303 always; 301/302 from POST) are followed in-worker.
      // Other 3xx responses are returned to the client untouched — the Worker
      // never fetches their Location.
      const switchesToGet = upstream.status === 303 || ((upstream.status === 301 || upstream.status === 302) && method === 'POST')
      if (body && !switchesToGet)
        break
      if (visited.has(next.href))
        throw createError({ status: 508, statusText: 'Proxy redirect loop detected' })
      if (redirects >= MAX_PROXY_REDIRECTS)
        throw createError({ status: 508, statusText: 'Too many proxy redirects' })

      // The response body is not needed; release it before the next hop.
      await upstream.body?.cancel().catch(() => undefined)

      visited.add(next.href)

      // Caller x-* extension headers were meant for the previous origin and
      // are dropped when a redirect crosses origins; the x-forwarded-* set is
      // computed by the proxy itself and stays accurate for the next origin.
      if (next.origin !== new URL(url).origin) {
        for (const name of [...headers.keys()]) {
          if (name.startsWith('x-') && !name.startsWith('x-forwarded-'))
            headers.delete(name)
        }
      }

      url = next.href
      if (switchesToGet) {
        method = 'GET'
        body = null
        headers.delete('content-type')
      }
      upstream = await fetchUpstream(url, method, headers, body)
    }
  }
  catch (cause) {
    if (cause && typeof cause === 'object' && 'statusCode' in cause)
      throw cause
    throw createError({ status: 502, statusText: 'Proxy request failed', cause })
  }

  return buildUpstreamResponse(upstream, options.privateCache ?? false)
}
