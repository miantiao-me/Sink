import { z } from 'zod'

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

const CountQuerySchema = z.object({
  q: z.string().trim().refine(value => new TextEncoder().encode(value.toLowerCase().replace(/[!%_]/g, '!$&')).length <= 48, {
    message: 'Search query must not exceed 48 UTF-8 bytes',
  }).optional(),
  url: z.string().trim().url().max(2048).optional(),
  tag: z.string().trim().toLowerCase().min(1).max(32).optional(),
  status: z.enum(['active', 'expired', 'all']).default('active'),
})

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, CountQuerySchema.parse)
  return { count: await countLinks(event, query) }
})
