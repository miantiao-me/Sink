import { z } from 'zod'

const ListQuerySchema = z.object({
  limit: z.coerce.number().max(1024).default(20),
  cursor: z.string().trim().max(1024).optional(),
})

export default eventHandler(async (event) => {
  const { limit, cursor } = await getValidatedQuery(event, ListQuerySchema.parse)

  const list = await listLinks(event, { limit, cursor })
  return list
})
