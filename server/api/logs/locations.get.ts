import type { H3Event } from 'h3'
import { sql } from 'kysely'
import { QuerySchema } from '#shared/schemas/query'

function query2sql(query: Query, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const limit = Math.max(0, Math.floor(query.limit))
  const analyticsQuery = createAnalyticsQuery(dataset)
    .where('double1', '!=', sql.lit(0))
    .where('double2', '!=', sql.lit(0))
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery

  // Use SUM(_sample_interval) instead of count() to account for sampling
  return filteredQuery
    .select([
      sql.ref('blob8').as(blobsMap.blob8),
      sql.ref('double1').as(doublesMap.double1),
      sql.ref('double2').as(doublesMap.double2),
      sql<number>`SUM(_sample_interval)`.as('count'),
    ])
    .groupBy(['blob8', 'double1', 'double2'])
    .orderBy('count', 'desc')
    .limit(sql.lit(limit))
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)

  return useWAE(event, sql)
})
