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

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, ''))
  const { slugRegex, reserveSlug } = useAppConfig()
  const { linkCacheTtl, caseSensitive, redirectWithQuery, redirectStatusCode, redirectNoStore } = useRuntimeConfig(event)
  const { homeURL, linkProxyEnabled } = useRuntimeConfig(event).public
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
      // (NUXT_PUBLIC_LINK_PROXY_ENABLED). With the flag off, stored proxy links
      // keep their data and degrade to plain redirects.
      const isProxyLink = !!link.proxy && linkProxyEnabled

      // Header credentials come first so authenticated clients can stream
      // JSON/binary bodies straight through: x-link-password authenticates and
      // x-link-confirm: true carries the unsafe confirmation. Other POSTs are
      // read as gate form submissions — on a proxied link a confirmed form is
      // replayed upstream as a bodyless GET so the password never leaks.
      const headerPassword = getHeader(event, 'x-link-password')
      const headerConfirmed = getHeader(event, 'x-link-confirm') === 'true'
      let formConfirmed = false

      // Password protection check
      if (link.password) {
        if (headerPassword) {
          if (!await verifyLinkPassword(headerPassword, link.password)) {
            throw createError({ status: 403, statusText: 'Incorrect password' })
          }
          if (link.unsafe && !headerConfirmed) {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
        }
        else if (event.method === 'POST') {
          const body = await readBody(event)
          const submittedPassword = typeof body?.password === 'string' ? body.password : ''

          if (!await verifyLinkPassword(submittedPassword, link.password)) {
            return sendNoStoreHtml(generatePasswordHtml(slug, { hasError: true, locale: getLocale() }))
          }

          // Password correct - show unsafe warning if needed
          if (link.unsafe && body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { password: submittedPassword || undefined, locale: getLocale() }))
          }

          formConfirmed = true
        }
        else {
          return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale() }))
        }
      }

      // Unsafe link warning (for links without password)
      if (!link.password && link.unsafe && !headerConfirmed) {
        if (event.method === 'POST') {
          const body = await readBody(event)
          if (body?.confirm === 'true') {
            formConfirmed = true
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
        return sendWebResponse(event, await proxyLinkRequest(event, finalTargetUrl, {
          method: formConfirmed ? 'GET' : event.method,
          privateCache: !!(link.password || link.unsafe),
        }))
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
