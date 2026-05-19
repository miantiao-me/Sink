import type { ImportResult } from '#shared/schemas/import'
import { ImportDataSchema } from '#shared/schemas/import'
import { nanoid } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Import links from exported data',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['version', 'links'],
            properties: {
              version: { type: 'string', description: 'Export format version' },
              exportedAt: { type: 'string', description: 'Export timestamp (ISO 8601)' },
              count: { type: 'integer', description: 'Number of links in export' },
              links: {
                type: 'array',
                description: 'Array of links to import',
                items: {
                  type: 'object',
                  required: ['url', 'slug'],
                  properties: {
                    id: { type: 'string', description: 'Link ID (auto-generated if not provided)' },
                    url: { type: 'string', description: 'The target URL' },
                    slug: { type: 'string', description: 'The slug for the short link' },
                    comment: { type: 'string', description: 'Optional comment' },
                    createdAt: { type: 'integer', description: 'Creation timestamp (unix seconds)' },
                    updatedAt: { type: 'integer', description: 'Last update timestamp (unix seconds)' },
                    expiration: { type: 'integer', description: 'Expiration timestamp (unix seconds)' },
                    title: { type: 'string', description: 'Custom title for link preview' },
                    description: { type: 'string', description: 'Custom description for link preview' },
                    image: { type: 'string', description: 'Custom image for link preview' },
                    apple: { type: 'string', description: 'Apple App Store redirect URL' },
                    google: { type: 'string', description: 'Google Play Store redirect URL' },
                    cloaking: { type: 'boolean', description: 'Enable link cloaking (mask destination URL)' },
                    redirectWithQuery: { type: 'boolean', description: 'Append query parameters to destination URL' },
                    password: { type: 'string', description: 'Password protection for the link' },
                    unsafe: { type: 'boolean', description: 'Mark link as unsafe, showing a warning page before redirect' },
                    geo: { type: 'object', additionalProperties: { type: 'string' }, description: 'Geo-routing rules (country code to URL)' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const kvBatchLimit = useRuntimeConfig(event).public.kvBatchLimit as string
  const maxLinks = Math.floor(+kvBatchLimit / 2)

  const importData = await readValidatedBody(event, ImportDataSchema.parse)

  if (importData.links.length > maxLinks) {
    throw createError({
      status: 400,
      statusText: `Too many links. Maximum ${maxLinks} links per request.`,
    })
  }

  const result: ImportResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    successItems: [],
    skippedItems: [],
    failedItems: [],
  }

  for (let i = 0; i < importData.links.length; i++) {
    const linkData = importData.links[i]

    if (!linkData) {
      result.failed++
      result.failedItems.push({
        index: i,
        slug: '',
        url: '',
        reason: 'Missing link data',
      })
      continue
    }

    try {
      const slug = normalizeSlug(event, linkData.slug)
      const existingLink = await getLink(event, slug)

      if (existingLink) {
        result.skippedItems.push({ index: i, slug, url: linkData.url })
        result.skipped++
        continue
      }

      const now = Math.floor(Date.now() / 1000)
      const link = {
        ...linkData,
        id: linkData.id || nanoid(10)(),
        slug,
        createdAt: linkData.createdAt || now,
        updatedAt: linkData.updatedAt || now,
      }

      if (link.password) {
        link.password = await normalizeLinkPasswordForStorage(link.password)
      }

      await putLink(event, link)
      result.successItems.push({ index: i, slug, url: linkData.url })
      result.success++
    }
    catch (error) {
      result.failed++
      result.failedItems.push({
        index: i,
        slug: linkData.slug,
        url: linkData.url,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  return result
})
