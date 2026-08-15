import type { H3Event } from 'h3'
import type { RawBuilder } from 'kysely'
import { sql } from 'kysely'
import { QuerySchema } from '#shared/schemas/query'

function weightedDistinct(column: string): RawBuilder<number> {
  return sql<number>`ROUND(COUNT(DISTINCT ${sql.ref(column)}) * SUM(_sample_interval) / COUNT())`
}

function query2sql(query: Query, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const analyticsQuery = createAnalyticsQuery(dataset)
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery
  // Weighted distinct count: COUNT(DISTINCT col) * SUM(_sample_interval) / COUNT() ≈ actual distinct count
  const statement = filteredQuery.select([
    sql<number>`SUM(_sample_interval)`.as('visits'),
    weightedDistinct(logsMap.ip!).as('visitors'),
    weightedDistinct(logsMap.referer!).as('referers'),
  ])

  return query.id
    ? statement.select(sql.ref('index1').as('id')).groupBy('index1')
    : statement
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
