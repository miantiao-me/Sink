import { LinkSlugQuerySchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Query a short link by slug',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'slug',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'The slug of the link to query',
      },
    ],
  },
})

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, LinkSlugQuerySchema.parse)
  const slug = normalizeSlug(event, query.slug)

  const { link, metadata } = await getLinkWithMetadata(event, slug)
  if (link) {
    return sanitizeLinkPassword({
      ...metadata,
      ...link,
    })
  }

  throw createError({
    status: 404,
    statusText: 'Not Found',
  })
})
