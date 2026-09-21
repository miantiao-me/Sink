import type { H3Event } from 'h3'
import type { RawBuilder } from 'kysely'
import type { Query } from '#shared/schemas/query'
import type { BlobsMap, DoublesMap } from './access-log'
import { sql } from 'kysely'
import { z } from 'zod'
import { QuerySchema } from '#shared/schemas/query'
import { blobsMap, doublesMap, logsMap } from './access-log'
import { createAnalyticsQuery } from './analytics-sql'
import { buildAnalyticsFilter } from './query-filter'
import { getSafeTimezone } from './time'

type MetricType = BlobsMap[keyof BlobsMap] | DoublesMap[keyof DoublesMap]

const validMetricTypes = [...Object.values(blobsMap), ...Object.values(doublesMap)] as [MetricType, ...MetricType[]]

const viewUnits = { minute: '%Y-%m-%d %H:%i', hour: '%Y-%m-%d %H', day: '%Y-%m-%d' } as const

const ClientTimezoneSchema = z.string()
  .regex(/^[\w+-]+(?:\/[\w+-]+)*$/)
  .max(64)
  .default('Etc/UTC')
  .describe('IANA timezone used to bucket timestamps.')

export const ViewsQuerySchema = QuerySchema.extend({
  unit: z.enum(['minute', 'hour', 'day']).describe('Time bucket size.'),
  clientTimezone: ClientTimezoneSchema,
})

export const MetricsQuerySchema = QuerySchema.extend({
  type: z.enum(validMetricTypes).describe('The access-log dimension to group by.'),
})

export const HeatmapQuerySchema = QuerySchema.extend({
  clientTimezone: ClientTimezoneSchema,
})

export const StatsExportQuerySchema = QuerySchema.refine(
  query => query.startAt === undefined || query.endAt === undefined || query.startAt <= query.endAt,
  { message: 'startAt must be less than or equal to endAt', path: ['startAt'] },
)

export type ViewsQuery = z.infer<typeof ViewsQuerySchema>
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>
export type HeatmapQuery = z.infer<typeof HeatmapQuerySchema>

/** Weighted distinct count: COUNT(DISTINCT col) * SUM(_sample_interval) / COUNT() ≈ actual distinct count */
function weightedDistinct(column: string): RawBuilder<number> {
  return sql<number>`ROUND(COUNT(DISTINCT ${sql.ref(column)}) * SUM(_sample_interval) / COUNT())`
}

function weightedReferers(column: string): RawBuilder<number> {
  const reference = sql.ref(column)
  return sql<number>`ROUND((COUNT(DISTINCT ${reference}) - MAX(if(${reference} = ${sql.lit('')}, ${sql.lit(1)}, ${sql.lit(0)}))) * SUM(_sample_interval) / COUNT())`
}

function queryLimit(query: Query): number {
  return Math.max(0, Math.floor(query.limit))
}

/** The dataset query every analytics endpoint starts from, with the shared filters applied. */
function filteredQuery(query: Query, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const analyticsQuery = createAnalyticsQuery(dataset)
  return filter ? analyticsQuery.where(filter) : analyticsQuery
}

export function buildCountersQuery(query: Query, event: H3Event) {
  const statement = filteredQuery(query, event).select([
    sql<number>`SUM(_sample_interval)`.as('visits'),
    weightedDistinct(logsMap.ip!).as('visitors'),
    weightedDistinct(logsMap.referer!).as('referers'),
  ])

  return query.id
    ? statement.select(sql.ref('index1').as('id')).groupBy('index1')
    : statement
}

export function buildViewsQuery(query: ViewsQuery, event: H3Event) {
  const timezone = getSafeTimezone(query.clientTimezone)

  return filteredQuery(query, event)
    .select([
      sql<string>`formatDateTime(${sql.ref('timestamp')}, ${sql.lit(viewUnits[query.unit])}, ${sql.lit(timezone)})`.as('time'),
      sql<number>`SUM(_sample_interval)`.as('visits'),
      sql<number>`COUNT(DISTINCT ${sql.ref(logsMap.ip!)})`.as('visitors'),
    ])
    .groupBy('time')
    .orderBy('time')
}

export function buildMetricsQuery(query: MetricsQuery, event: H3Event) {
  const metricColumn = logsMap[query.type] as string

  return filteredQuery(query, event)
    .select([
      sql.ref(metricColumn).as('name'),
      sql<number>`SUM(_sample_interval)`.as('count'),
    ])
    .groupBy('name')
    .orderBy('count', 'desc')
    .limit(sql.lit(queryLimit(query)))
}

export function buildHeatmapQuery(query: HeatmapQuery, event: H3Event) {
  const timezone = getSafeTimezone(query.clientTimezone)
  const tzTimestamp = sql<string>`toDateTime(toUnixTimestamp(${sql.ref('timestamp')}), ${sql.lit(timezone)})`

  return filteredQuery(query, event)
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

export function buildAccessExportQuery(query: Query, event: H3Event) {
  return filteredQuery(query, event)
    .select([
      sql.ref(logsMap.slug!).as('slug'),
      sql.ref(logsMap.url!).as('url'),
      weightedDistinct(logsMap.ip!).as('viewer'),
      sql<number>`SUM(_sample_interval)`.as('views'),
      weightedReferers(logsMap.referer!).as('referer'),
    ])
    .groupBy(['slug', 'url'])
    .orderBy('views', 'desc')
}

export function buildEventsQuery(query: Query, event: H3Event) {
  return filteredQuery(query, event)
    .selectAll()
    .orderBy('timestamp', 'desc')
    .limit(sql.lit(queryLimit(query)))
}

export function buildLocationsQuery(query: Query, event: H3Event) {
  // Use SUM(_sample_interval) instead of count() to account for sampling
  return filteredQuery(query, event)
    .where('double1', '!=', sql.lit(0))
    .where('double2', '!=', sql.lit(0))
    .select([
      sql.ref('blob8').as(blobsMap.blob8),
      sql.ref('double1').as(doublesMap.double1),
      sql.ref('double2').as(doublesMap.double2),
      sql<number>`SUM(_sample_interval)`.as('count'),
    ])
    .groupBy(['blob8', 'double1', 'double2'])
    .orderBy('count', 'desc')
    .limit(sql.lit(queryLimit(query)))
}
