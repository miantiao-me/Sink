import type { H3Event } from 'h3'
import type { BlobsMap, DoublesMap } from '#server/utils/access-log'
import { sql } from 'kysely'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'

type MetricType = BlobsMap[keyof BlobsMap] | DoublesMap[keyof DoublesMap]
const validMetricTypes = [...Object.values(blobsMap), ...Object.values(doublesMap)] as [MetricType, ...MetricType[]]

const MetricsQuerySchema = QuerySchema.extend({
  type: z.enum(validMetricTypes),
})

function query2sql(query: z.infer<typeof MetricsQuerySchema>, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const limit = Math.max(0, Math.floor(query.limit))
  const metricColumn = logsMap[query.type] as string
  const analyticsQuery = createAnalyticsQuery(dataset)
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery

  return filteredQuery
    .select([
      sql.ref(metricColumn).as('name'),
      sql<number>`SUM(_sample_interval)`.as('count'),
    ])
    .groupBy('name')
    .orderBy('count', 'desc')
    .limit(sql.lit(limit))
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricsQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
