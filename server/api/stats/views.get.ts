import type { H3Event } from 'h3'
import { sql } from 'kysely'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'

const unitMap: { [x: string]: string } = {
  minute: '%Y-%m-%d %H:%i',
  hour: '%Y-%m-%d %H',
  day: '%Y-%m-%d',
}

const ViewsQuerySchema = QuerySchema.extend({
  unit: z.enum(['minute', 'hour', 'day']),
  clientTimezone: z.string()
    .regex(/^[\w+-]+(?:\/[\w+-]+)*$/)
    .max(64)
    .default('Etc/UTC'),
})

function query2sql(query: z.infer<typeof ViewsQuerySchema>, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const timezone = getSafeTimezone(query.clientTimezone)
  const analyticsQuery = createAnalyticsQuery(dataset)
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery

  return filteredQuery
    .select([
      sql<string>`formatDateTime(${sql.ref('timestamp')}, ${sql.lit(unitMap[query.unit]!)}, ${sql.lit(timezone)})`.as('time'),
      sql<number>`SUM(_sample_interval)`.as('visits'),
      sql<number>`COUNT(DISTINCT ${sql.ref(logsMap.ip!)})`.as('visitors'),
    ])
    .groupBy('time')
    .orderBy('time')
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, ViewsQuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})
