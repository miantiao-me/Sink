import type { H3Event } from 'h3'
import type { Link } from '@/types'
import { parsePath, withQuery } from 'ufo'
import { proxyLinkRequest } from '../services/link-proxy'

const SOCIAL_BOTS = [
  'applebot',
  'discordbot',
  'facebot',
  'facebookexternalhit',
  'linkedinbot',
  'linkexpanding',
  'mastodon',
  'skypeuripreview',
  'slackbot',
  'slackbot-linkexpanding',
  'snapchat',
  'telegrambot',
  'tiktok',
  'twitterbot',
  'whatsapp',
]

const APPLE_DEVICE_UA_MARKERS = ['iphone', 'ipad', 'ipod', 'crios']

function isSocialBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return SOCIAL_BOTS.some(bot => ua.includes(bot))
}

function getDeviceRedirectUrl(userAgent: string, link: Link): string | null {
  if (!link.apple && !link.google)
    return null

  const ua = userAgent.toLowerCase()

  if (link.google && ua.includes('android')) {
    return link.google
  }

  if (link.apple && APPLE_DEVICE_UA_MARKERS.some(marker => ua.includes(marker))) {
    return link.apple
  }

  return null
}

function hasOgConfig(link: Link): boolean {
  return !!(link.title || link.image)
}

// Form confirmations on proxied links must never be forwarded upstream: the
// body contains the link password, and the request stream was already consumed.
// After a successful POST we grant a short-lived HttpOnly cookie scoped to the
// slug and answer 303 so the browser retries as a plain GET.
//
// Cookie value: `<grant>.<expiresAt>.<hmac>` where grant is 'p' (password ok),
// 'u' (unsafe confirmed) or 'pu' (both). The HMAC is keyed by the site token
// over the slug, grant, expiry, link.updatedAt and current password — so any
// edit to the link, a password rotation, or the expiry itself invalidates the
// grant. Signature checks go through crypto.subtle.verify.
type ProxyGateGrant = 'p' | 'u' | 'pu'

const PROXY_GATE_COOKIE_TTL = 3600

function proxyGateCookieName(slug: string): string {
  return `pw_${slug}`
}

async function proxyGateSecret(event: H3Event): Promise<CryptoKey> {
  const { siteToken } = useRuntimeConfig(event)
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`sink-link-gate:${siteToken}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes instanceof Uint8Array ? bytes : bytes)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function gatePayload(slug: string, grant: string, expiresAt: number, link: Link): string {
  return `${slug}.${grant}.${expiresAt}.${link.updatedAt}.${link.password ?? ''}`
}

async function signProxyGate(event: H3Event, slug: string, grant: ProxyGateGrant, link: Link): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + PROXY_GATE_COOKIE_TTL
  const signature = await crypto.subtle.sign('HMAC', await proxyGateSecret(event), new TextEncoder().encode(gatePayload(slug, grant, expiresAt, link)))
  return `${grant}.${expiresAt}.${toHex(signature)}`
}

async function readProxyGateCookie(event: H3Event, slug: string, link: Link): Promise<{ password: boolean, unsafe: boolean }> {
  const denied = { password: false, unsafe: false }
  const raw = getHeader(event, 'cookie') || ''
  const match = raw.match(new RegExp(`(?:^|;\\s*)${proxyGateCookieName(slug)}=([^;]*)`))
  const parts = match?.[1]?.split('.')
  const grant = parts?.[0] ?? ''
  const expiresAt = Number(parts?.[1])
  const signature = parts?.length === 3 ? parts[2]! : ''
  if (!/^(?:p|u|pu)$/.test(grant)
    || !Number.isSafeInteger(expiresAt) || expiresAt <= 0
    || !/^[\da-f]{64}$/.test(signature)) {
    return denied
  }

  if (expiresAt <= Math.floor(Date.now() / 1000))
    return denied

  const payload = new TextEncoder().encode(gatePayload(slug, grant, expiresAt, link))
  if (!await crypto.subtle.verify('HMAC', await proxyGateSecret(event), fromHex(signature), payload))
    return denied

  return { password: grant.includes('p'), unsafe: grant.includes('u') }
}

async function grantProxyGateAndRedirect(event: H3Event, slug: string, grant: ProxyGateGrant, link: Link) {
  const value = await signProxyGate(event, slug, grant, link)
  setHeader(event, 'Set-Cookie', `${proxyGateCookieName(slug)}=${value}; Path=/${slug}; HttpOnly; Secure; SameSite=Lax; Max-Age=${PROXY_GATE_COOKIE_TTL}`)
  setHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, `/${slug}`, 303)
}

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, ''))
  const { slugRegex, reserveSlug } = useAppConfig()
  const { homeURL, linkCacheTtl, caseSensitive, redirectWithQuery, redirectStatusCode, redirectNoStore, linkProxyEnabled } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  const { notFoundRedirect } = useRuntimeConfig(event)
  // Bypass redirect check for notFoundRedirect path to prevent infinite loop
  if (notFoundRedirect && event.path === notFoundRedirect) {
    return
  }

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    let link: Link | null = null

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(event, caseSensitive ? slug : lowerCaseSlug, linkCacheTtl)

    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(event, slug, linkCacheTtl)
    }

    if (link) {
      let locale: RedirectLocale | undefined
      const getLocale = () => {
        locale ??= resolveRedirectLocale(event)
        return locale
      }
      const sendNoStoreHtml = (html: string) => {
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store')
        return html
      }
      const userAgent = getHeader(event, 'user-agent') || ''
      const query = getQuery(event)
      const shouldRedirectWithQuery = link.redirectWithQuery ?? redirectWithQuery
      const buildTarget = (url: string) => shouldRedirectWithQuery ? withQuery(url, query) : url

      let targetUrl = link.url
      const country = event.context.cloudflare?.request?.cf?.country
      if (country && typeof country === 'string' && link.geo?.[country.toUpperCase()]) {
        targetUrl = link.geo[country.toUpperCase()]!
      }
      targetUrl = buildTarget(targetUrl)

      const deviceRedirectUrl = getDeviceRedirectUrl(userAgent, link)
      const finalTargetUrl = deviceRedirectUrl ?? targetUrl

      // Reverse proxying is opt-in per link AND requires the instance flag
      // (NUXT_LINK_PROXY_ENABLED). With the flag off, stored proxy links keep
      // their data and degrade to plain redirects.
      const isProxyLink = !!link.proxy && !!linkProxyEnabled
      const gate = { password: false, unsafe: false }

      // Grant cookies are only honored on safe methods; everything else must
      // authenticate per-request via header or form POST.
      if (isProxyLink && (event.method === 'GET' || event.method === 'HEAD')) {
        const granted = await readProxyGateCookie(event, slug, link)
        gate.password = granted.password
        gate.unsafe = granted.unsafe
      }

      // Header credentials win on POST so authenticated clients can stream
      // JSON/binary bodies straight through: x-link-password authenticates and
      // x-link-confirm: true carries the unsafe confirmation. The form body is
      // only consumed for form POSTs without header auth — every other POST
      // body must stay unread so it can be proxied upstream.
      const headerPassword = getHeader(event, 'x-link-password')
      const headerConfirmed = getHeader(event, 'x-link-confirm') === 'true'
      const consumesFormPost = event.method === 'POST'
        && (!isProxyLink || (!headerPassword && !headerConfirmed
          && /^application\/(?:x-www-form-urlencoded|form-data)/i.test(getHeader(event, 'content-type') || '')))

      // Password protection check
      if (link.password) {
        if (event.method === 'POST' && consumesFormPost) {
          const body = await readBody(event)
          const submittedPassword = typeof body?.password === 'string' ? body.password : ''
          // A confirm-only POST may rely on a still-valid 'p' grant cookie
          // (issued by an earlier password form round-trip on proxied links).
          const cookieGrant = isProxyLink && !submittedPassword
            ? await readProxyGateCookie(event, slug, link)
            : null
          const passwordOk = await verifyLinkPassword(submittedPassword, link.password) || !!cookieGrant?.password

          if (!passwordOk) {
            return sendNoStoreHtml(generatePasswordHtml(slug, { hasError: true, locale: getLocale() }))
          }

          // Password correct - show unsafe warning if needed
          if (link.unsafe && body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { password: submittedPassword || undefined, locale: getLocale() }))
          }

          if (isProxyLink)
            return await grantProxyGateAndRedirect(event, slug, link.unsafe ? 'pu' : 'p', link)
        }
        else if (event.method === 'POST' && isProxyLink && !headerPassword) {
          // A proxied POST without header auth must not have its body consumed;
          // it cannot be authenticated by form, so it is denied outright.
          throw createError({ status: 403, statusText: 'Password required' })
        }
        else if (gate.password) {
          // Valid proxy gate cookie; nothing more to check here
        }
        else if (headerPassword) {
          if (!await verifyLinkPassword(headerPassword, link.password)) {
            throw createError({ status: 403, statusText: 'Incorrect password' })
          }
          // Header-password path: check unsafe warning via x-link-confirm header
          if (link.unsafe && !headerConfirmed) {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
        }
        else {
          return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale() }))
        }
      }

      // Cookie-granted visitors skipping the password form still have to
      // confirm unsafe links once.
      if (link.password && link.unsafe && gate.password && !gate.unsafe) {
        return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
      }

      // Unsafe link warning (for links without password)
      if (!link.password && link.unsafe && !gate.unsafe && !headerConfirmed) {
        if (event.method === 'POST') {
          if (isProxyLink && !consumesFormPost) {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
          const body = await readBody(event)
          if (body?.confirm === 'true') {
            if (isProxyLink)
              return await grantProxyGateAndRedirect(event, slug, 'u', link)
          }
          else {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
          }
        }
        else {
          return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
        }
      }

      event.context.link = link
      let accessLogResult: AccessLogResult | undefined
      try {
        accessLogResult = collectAccessLog(event)
      }
      catch {
        console.error({ event: 'access_log.collection.failed' })
      }

      if (accessLogResult) {
        try {
          writeAccessLog(event, accessLogResult.logs)
        }
        catch {
          console.error({ event: 'access_log.write.failed' })
        }

        try {
          queueLinkClickedWebhook(event, accessLogResult.click, link)
        }
        catch {
          console.error({ event: 'webhook.scheduling.failed' })
        }
      }

      if (deviceRedirectUrl) {
        if (redirectNoStore)
          setHeader(event, 'Cache-Control', 'no-store')
        return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
      }
      if (isProxyLink) {
        const gated = !!(link.password || link.unsafe)
        return sendWebResponse(event, await proxyLinkRequest(event, finalTargetUrl, { privateCache: gated }))
      }

      if (isSocialBot(userAgent) && hasOgConfig(link)) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateOgHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        return html
      }

      if (link.cloaking) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateCloakingHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store, private')
        return html
      }

      if (redirectNoStore)
        setHeader(event, 'Cache-Control', 'no-store')
      return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
    }
    else {
      if (notFoundRedirect) {
        return sendRedirect(event, notFoundRedirect, 302)
      }

      throw createError({ status: 404, statusText: 'Link not found' })
    }
  }
})
