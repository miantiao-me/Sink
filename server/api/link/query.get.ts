import { z } from 'zod'

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
