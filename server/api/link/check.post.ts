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

  if (!isPublicHttpUrl(link.url)) {
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
