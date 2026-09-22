import { SearchLinksQuerySchema } from '#shared/schemas/link'

defineRouteMeta({
  openAPI: {
    description: 'Search links with a non-empty keyword or exact URL. Tag and status only filter those searches; requests without a search selector return an empty array.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Non-empty case-insensitive substring to match against slug, URL, comment, or tag',
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
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 1000, default: 20 },
        description: 'Maximum matches for keyword or exact URL searches',
      },
    ],
  },
})

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, SearchLinksQuerySchema.parse)
  if (!query.q && !query.url)
    return []

  return await searchLinks(event, query)
})
