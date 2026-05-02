import { z } from 'zod'

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

const QueryParamsSchema = z.object({
  slug: z.string().trim().min(1).max(2048),
})

export default eventHandler(async (event) => {
  const { slug } = await getValidatedQuery(event, QueryParamsSchema.parse)

  const { link, metadata } = await getLinkWithMetadata(event, slug)
  if (link) {
    return {
      ...metadata,
      ...link,
    }
  }

  throw createError({
    status: 404,
    statusText: 'Not Found',
  })
})
