import { LinkFilterQuerySchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Count links matching keyword, URL, tag, and expiration status filters',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Case-insensitive substring to match against slug, URL, comment, or tag',
      },
      {
        name: 'url',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Normalized target URL to match exactly',
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
  const query = await getValidatedQuery(event, LinkFilterQuerySchema.parse)
  return { count: await countLinks(event, query) }
})
