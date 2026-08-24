import type { H3Event } from 'h3'
import { sql } from 'kysely'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'

const HeatmapQuerySchema = QuerySchema.extend({
  clientTimezone: z.string()
    .regex(/^[\w+-]+(?:\/[\w+-]+)*$/)
    .max(64)
    .default('Etc/UTC'),
})

function query2sql(query: z.infer<typeof HeatmapQuerySchema>, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const timezone = getSafeTimezone(query.clientTimezone)
  const tzTimestamp = sql<string>`toDateTime(toUnixTimestamp(${sql.ref('timestamp')}), ${sql.lit(timezone)})`
  const analyticsQuery = createAnalyticsQuery(dataset)
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery

  return filteredQuery
    .select([
      sql<number>`toDayOfWeek(${tzTimestamp})`.as('weekday'),
      sql<number>`toHour(${tzTimestamp})`.as('hour'),
      sql<number>`SUM(_sample_interval)`.as('visits'),
      sql<number>`COUNT(DISTINCT ${sql.ref(logsMap.ip!)})`.as('visitors'),
    ])
    .groupBy(['weekday', 'hour'])
    .orderBy('weekday')
    .orderBy('hour')
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, HeatmapQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
