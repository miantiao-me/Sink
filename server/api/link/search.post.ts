import { z } from 'zod'
import { UrlSchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Search links by an exact target URL without placing the URL in the request query string',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string', description: 'Normalized target URL to match exactly' },
              limit: { type: 'integer', minimum: 1, maximum: 1000, default: 20 },
            },
          },
        },
      },
    },
  },
})

const ExactUrlSearchSchema = z.object({
  url: UrlSchema,
  limit: z.coerce.number().int().min(1).max(1000).default(20),
})

export default eventHandler(async (event) => {
  const query = await readValidatedBody(event, ExactUrlSearchSchema.parse)
  return await searchLinks(event, query)
})
