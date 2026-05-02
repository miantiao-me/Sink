import type { H3Event } from 'h3'
import { QuerySchema } from '#shared/schemas/query'

const { select } = SqlBricks

function query2sql(query: Query, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  // Weighted distinct count: COUNT(DISTINCT col) * SUM(_sample_interval) / COUNT() ≈ actual distinct count
  const weightedDistinct = (col: string) => `ROUND(COUNT(DISTINCT ${col}) * SUM(_sample_interval) / COUNT())`
  const columns = [
    query.id && 'index1 as id',
    'SUM(_sample_interval) as visits',
    `${weightedDistinct(logsMap.ip!)} as visitors`,
    `${weightedDistinct(logsMap.referer!)} as referers`,
  ].filter(Boolean).join(', ')
  const sql = select(columns).from(dataset).where(filter)
  if (query.id)
    sql.groupBy('index1')
  appendTimeFilter(sql, query)
  return sql.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
