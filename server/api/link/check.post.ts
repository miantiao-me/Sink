import type { H3Event } from 'h3'
import type { LinkCheckResult } from '#shared/types/link-check'
import { ofetch } from 'ofetch'
import { LinkCheckRequestSchema } from '#shared/schemas/link-check'
import { toErrorMessage } from '#shared/utils/error'

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
            properties: {
              cursor: { type: 'string', description: 'Pagination cursor from the previous response' },
              limit: { type: 'integer', default: 6, minimum: 1, maximum: 10, description: 'Maximum number of links to check' },
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
  target: { slug: string, url: string },
  headers: Headers,
  timeoutSeconds: number,
): Promise<LinkCheckResult> {
  const startedAt = Date.now()
  const checkedAt = new Date().toISOString()
  const link = target

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

    const rawHostname = parsed.hostname.toLowerCase()
    const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
      ? rawHostname.slice(1, -1)
      : rawHostname
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
  const firstSegment = Number.parseInt(hostname.split(':', 1)[0] || '0', 16)
  if (hostname === '::'
    || hostname === '::1'
    || (firstSegment >= 0xFC00 && firstSegment <= 0xFDFF)
    || (firstSegment >= 0xFE80 && firstSegment <= 0xFEBF)
    || (firstSegment >= 0xFF00 && firstSegment <= 0xFFFF)) {
    return true
  }

  const mappedMatch = hostname.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([\da-f]{1,4}):([\da-f]{1,4}))$/i)
  if (!mappedMatch)
    return false

  if (mappedMatch[1])
    return isBlockedIpv4(mappedMatch[1])

  const high = Number.parseInt(mappedMatch[2]!, 16)
  const low = Number.parseInt(mappedMatch[3]!, 16)
  return isBlockedIpv4(`${high >> 8}.${high & 0xFF}.${low >> 8}.${low & 0xFF}`)
}

export default eventHandler(async (event) => {
  const { cursor, limit, timeout } = await readValidatedBody(event, LinkCheckRequestSchema.parse)
  const headers = getSafeHeaders(event)
  const page = await listLinks(event, {
    cursor,
    limit,
    sort: 'az',
    status: 'all',
  })

  return {
    results: await Promise.all(page.links.map(({ slug, url }) => checkLink({ slug, url }, headers, timeout))),
    cursor: page.cursor,
    list_complete: page.list_complete,
  }
})
