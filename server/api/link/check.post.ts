import type { LinkCheckResult } from '#shared/types/link-check'
import type { H3Event } from 'h3'
import { LinkCheckRequestSchema } from '#shared/schemas/link-check'
import { toErrorMessage } from '#shared/utils/error'
import { ofetch } from 'ofetch'

defineRouteMeta({
  openAPI: {
    description: 'Check target URLs for existing short links',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['links'],
            properties: {
              links: {
                type: 'array',
                maxItems: 10,
                items: {
                  type: 'object',
                  required: ['slug', 'url'],
                  properties: {
                    slug: { type: 'string' },
                    url: { type: 'string' },
                  },
                },
              },
              timeout: { type: 'integer', default: 6, minimum: 1, maximum: 30, description: 'Timeout in seconds for each link' },
            },
          },
        },
      },
    },
  },
})

const SAFE_FORWARDED_HEADERS = ['accept-language', 'user-agent'] as const

function getSafeHeaders(event: H3Event): Headers {
  const headers = new Headers()

  for (const name of SAFE_FORWARDED_HEADERS) {
    const value = getHeader(event, name)
    if (value)
      headers.set(name, value)
  }

  return headers
}

async function checkLink(
  event: H3Event,
  target: { slug: string, url: string },
  headers: Headers,
  timeoutSeconds: number,
): Promise<LinkCheckResult> {
  const startedAt = Date.now()
  const checkedAt = new Date().toISOString()
  const slug = normalizeSlug(event, target.slug)
  const storedLink = await getLink(event, slug)

  if (!storedLink) {
    return {
      ...target,
      slug,
      status: 0,
      ok: false,
      error: 'Link not found',
      duration: Date.now() - startedAt,
      checkedAt,
    }
  }

  const link = {
    slug,
    url: storedLink.url,
  }

  if (!isCheckableUrl(link.url)) {
    return {
      ...link,
      status: 0,
      ok: false,
      error: 'URL is not allowed for server-side checking',
      duration: Date.now() - startedAt,
      checkedAt,
    }
  }

  try {
    const response = await ofetch.raw(link.url, {
      method: 'GET',
      headers,
      timeout: timeoutSeconds * 1000,
      ignoreResponseError: true,
      responseType: 'stream',
    })
    const status = response.status

    if (response.body)
      await response.body.cancel().catch(() => undefined)

    return {
      ...link,
      status,
      ok: status < 400,
      duration: Date.now() - startedAt,
      checkedAt,
    }
  }
  catch (error) {
    return {
      ...link,
      status: 0,
      ok: false,
      error: toErrorMessage(error, 300),
      duration: Date.now() - startedAt,
      checkedAt,
    }
  }
}

function isCheckableUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return false

    const hostname = parsed.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.localhost'))
      return false

    return !isBlockedIp(hostname)
  }
  catch {
    return false
  }
}

function isBlockedIp(hostname: string): boolean {
  if (hostname.includes(':'))
    return isBlockedIpv6(hostname)

  return isBlockedIpv4(hostname)
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4)
    return false

  const bytes = parts.map((part) => {
    if (!/^\d+$/.test(part))
      return Number.NaN

    const value = Number(part)
    return value >= 0 && value <= 255 ? value : Number.NaN
  })

  if (bytes.some(Number.isNaN))
    return false

  const [a, b] = bytes as [number, number, number, number]

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
}

function isBlockedIpv6(hostname: string): boolean {
  return hostname === '::'
    || hostname === '::1'
    || hostname.startsWith('fc')
    || hostname.startsWith('fd')
    || hostname.startsWith('fe80:')
}

export default eventHandler(async (event) => {
  const { links, timeout } = await readValidatedBody(event, LinkCheckRequestSchema.parse)
  const headers = getSafeHeaders(event)

  return {
    results: await Promise.all(links.map(link => checkLink(event, link, headers, timeout))),
  }
})
