import type { H3Event } from 'h3'

const PROXY_TIMEOUT_MS = 30_000

// Hop-by-hop, credential, and spoofing headers never leave the Sink origin;
// everything else (including authorization) is forwarded.
const PROXY_SKIPPED_REQUEST_HEADERS = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-real-ip',
])

const PROXY_SKIPPED_REQUEST_PREFIXES = ['cf-', 'x-forwarded-', 'x-link-']

function isForwardedRequestHeader(name: string): boolean {
  return !PROXY_SKIPPED_REQUEST_HEADERS.has(name)
    && !PROXY_SKIPPED_REQUEST_PREFIXES.some(prefix => name.startsWith(prefix))
}

// Hop-by-hop and credential headers are never reflected to the client.
const PROXY_SKIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export interface LinkProxyOptions {
  // Requested after the password/unsafe gate consumed the form body: the
  // upstream fetch must run as a bodyless GET so the password never leaks.
  method?: string
  // Set for gated links so upstream or shared caches never store the response.
  privateCache?: boolean
}

function buildForwardHeaders(event: H3Event): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(getHeaders(event))) {
    if (value !== undefined && isForwardedRequestHeader(name.toLowerCase()))
      headers.set(name, value)
  }
  const clientIp = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for')
  if (clientIp)
    headers.set('x-forwarded-for', clientIp)
  headers.set('x-forwarded-proto', getRequestProtocol(event))
  headers.set('x-forwarded-host', getRequestHost(event))
  return headers
}

function buildUpstreamResponse(upstream: Response, privateCache: boolean): Response {
  const headers = new Headers()
  for (const [key, value] of upstream.headers.entries()) {
    if (!PROXY_SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase()))
      headers.set(key, value)
  }
  if (privateCache)
    headers.set('Cache-Control', 'private, no-store')
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

  const method = options.method ?? event.method
  // The timeout only bounds waiting for response headers; a signal that stays
  // armed would also abort long downloads or event streams mid-body.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: buildForwardHeaders(event),
    redirect: 'follow',
    signal: controller.signal,
  }
  if (method !== 'GET' && method !== 'HEAD') {
    // Required by the spec (and Cloudflare Workers) when body is a stream.
    init.body = toWebRequest(event).body
    init.duplex = 'half'
  }

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, init)
  }
  catch (cause) {
    throw createError({ status: 502, statusText: 'Proxy request failed', cause })
  }
  finally {
    clearTimeout(timer)
  }

  return buildUpstreamResponse(upstream, options.privateCache ?? false)
}
