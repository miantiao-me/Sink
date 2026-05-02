import type { BlobsMap, DoublesMap } from '#server/utils/access-log'
import type { H3Event } from 'h3'
import { QuerySchema } from '#shared/schemas/query'
import { z } from 'zod'

const { select } = SqlBricks

type MetricType = BlobsMap[keyof BlobsMap] | DoublesMap[keyof DoublesMap]
const validMetricTypes = [...Object.values(blobsMap), ...Object.values(doublesMap)] as [MetricType, ...MetricType[]]

const MetricsQuerySchema = QuerySchema.extend({
  type: z.enum(validMetricTypes),
})

function query2sql(query: z.infer<typeof MetricsQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)

  const sql = select(`${logsMap[query.type]} as name, SUM(_sample_interval) as count`)
    .from(dataset)
    .where(filter)
    .groupBy('name')
    .orderBy('count DESC')

  appendTimeFilter(sql, query)

  const limit = Math.max(0, Math.floor(query.limit))
  return `${sql.toString()} LIMIT ${limit}`
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricsQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
