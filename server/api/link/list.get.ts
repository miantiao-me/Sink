import type { ListLinksResult } from '#server/utils/link-store'
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
      {
        name: 'sort',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['slug_asc', 'slug_desc', 'createdAt_desc', 'createdAt_asc'], default: 'slug_asc' },
        description: 'Sort order for links',
      },
    ],
  },
})

const ListQuerySchema = z.object({
  limit: z.coerce.number().max(1024).default(20),
  cursor: z.string().trim().max(1024).optional(),
  sort: z.enum(['slug_asc', 'slug_desc', 'createdAt_desc', 'createdAt_asc']).default('slug_asc'),
})

export default eventHandler(async (event) => {
  const { limit, cursor, sort } = await getValidatedQuery(event, ListQuerySchema.parse)

  let list: ListLinksResult
  if (sort === 'createdAt_desc' || sort === 'createdAt_asc') {
    list = await listLinksSorted(event, {
      limit,
      cursor,
      direction: sort === 'createdAt_desc' ? 'newest' : 'oldest',
    })
  }
  else {
    list = await listLinks(event, { limit, cursor })
  }

  return {
    ...list,
    links: sanitizeLinksPassword(list.links),
  }
})
