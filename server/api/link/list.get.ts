import { ListLinksQuerySchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'List all short links with pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20, maximum: 1000 },
        description: 'Maximum number of links to return',
      },
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Pagination cursor from previous response',
      },
      {
        name: 'sort',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['az', 'za', 'newest', 'oldest'], default: 'newest' },
        description: 'Link sort order',
      },
      {
        name: 'tag',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Exact normalized tag filter',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['active', 'expired', 'all'], default: 'active' },
        description: 'Expiration status filter',
      },
    ],
  },
})

export default eventHandler(async (event) => {
  const { limit, cursor, sort, tag, status } = await getValidatedQuery(event, ListLinksQuerySchema.parse)

  const list = await listLinks(event, { limit, cursor, sort, tag, status })
  return {
    ...list,
    links: sanitizeLinksPassword(list.links),
  }
})
