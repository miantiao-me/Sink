import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List all short links with pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20, maximum: 1024 },
        description: 'Maximum number of links to return',
      },
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Pagination cursor from previous response',
      },
    ],
  },
})

const ListQuerySchema = z.object({
  limit: z.coerce.number().max(1024).default(20),
  cursor: z.string().trim().max(1024).optional(),
})

export default eventHandler(async (event) => {
  const { limit, cursor } = await getValidatedQuery(event, ListQuerySchema.parse)

  const list = await listLinks(event, { limit, cursor })
  return list
})
