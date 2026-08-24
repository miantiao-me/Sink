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
                    tags: { type: 'array', items: { type: 'string' }, description: 'Up to 10 normalized link tags, each 1-32 characters' },
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
  const importData = await readValidatedBody(event, ImportDataSchema.parse)
  const { importRequestLimit } = useRuntimeConfig(event)
  if (importData.links.length > importRequestLimit) {
    throw createError({
      status: 400,
      statusText: `Too many links. Maximum ${importRequestLimit} links per request.`,
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

  const chunkSize = 4
  for (let offset = 0; offset < importData.links.length; offset += chunkSize) {
    const chunk = importData.links.slice(offset, offset + chunkSize)
    const prepared = await Promise.all(chunk.map(async (linkData, chunkIndex) => {
      const index = offset + chunkIndex

      try {
        const slug = normalizeSlug(event, linkData.slug)
        const now = Math.floor(Date.now() / 1000)
        const link = {
          ...linkData,
          id: linkData.id || nanoid(10)(),
          slug,
          createdAt: linkData.createdAt ?? now,
          updatedAt: linkData.updatedAt ?? now,
        }
        if (link.password)
          link.password = await normalizeLinkPasswordForStorage(link.password)
        return { index, linkData, link }
      }
      catch (error) {
        return { index, linkData, error }
      }
    }))

    const writable = prepared.filter(item => 'link' in item)
    const writeResults = await createLinks(event, writable.map(item => item.link!))
    let writeIndex = 0
    for (const item of prepared) {
      if ('error' in item) {
        result.failed++
        result.failedItems.push({ index: item.index, slug: item.linkData.slug, url: item.linkData.url, reason: item.error instanceof Error ? item.error.message : 'Unknown error' })
        continue
      }

      const writeResult = writeResults[writeIndex++]!
      if ('error' in writeResult) {
        result.failed++
        result.failedItems.push({ index: item.index, slug: item.link.slug, url: item.linkData.url, reason: writeResult.error instanceof Error ? writeResult.error.message : 'Unknown error' })
      }
      else if (!writeResult.created) {
        result.skippedItems.push({ index: item.index, slug: item.link.slug, url: item.linkData.url })
        result.skipped++
      }
      else {
        result.successItems.push({ index: item.index, slug: item.link.slug, url: item.linkData.url })
        result.success++
      }
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')

  return result
})
