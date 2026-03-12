import type { H3Event } from 'h3'
import { QuerySchema } from '#shared/schemas/query'
import { z } from 'zod'

const { select } = SqlBricks

const HeatmapQuerySchema = QuerySchema.extend({
  clientTimezone: z.string()
    .regex(/^[A-Z_]+(?:\/[A-Z_-]+)*$/i)
    .max(64)
    .default('Etc/UTC'),
})

function query2sql(query: z.infer<typeof HeatmapQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  const timezone = getSafeTimezone(query.clientTimezone)
  const tzTimestamp = `toDateTime(toUnixTimestamp(timestamp), '${timezone}')`
  const sql = select(`toDayOfWeek(${tzTimestamp}) as weekday, toHour(${tzTimestamp}) as hour, SUM(_sample_interval) as visits, COUNT(DISTINCT ${logsMap.ip}) as visitors`).from(dataset).where(filter).groupBy('weekday', 'hour').orderBy('weekday', 'hour')
  appendTimeFilter(sql, query)
  return sql.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, HeatmapQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
