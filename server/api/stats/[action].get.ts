import type { H3Event } from 'h3'
import { QuerySchema } from '#shared/schemas/query'
import { generateCsv } from '#shared/utils/csv'
import { createExportFilename } from '#shared/utils/export-file'
import { z } from 'zod'

const { select } = SqlBricks

const CsvColumns = ['slug', 'url', 'viewer', 'views', 'referer'] as const

interface AccessExportRow {
  slug?: string
  url?: string
  viewer?: number
  views?: number
  referer?: number
}

const StatsExportQuerySchema = QuerySchema.superRefine((query, ctx) => {
  if (query.startAt !== undefined && query.endAt !== undefined && query.startAt > query.endAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startAt must be less than or equal to endAt',
      path: ['startAt'],
    })
  }
})

function weightedDistinct(column: string): string {
  return `ROUND(COUNT(DISTINCT ${column}) * SUM(_sample_interval) / COUNT())`
}

function weightedReferers(column: string): string {
  return `ROUND((COUNT(DISTINCT ${column}) - MAX(if(${column} = '', 1, 0))) * SUM(_sample_interval) / COUNT())`
}

function query2sql(query: z.infer<typeof StatsExportQuerySchema>, event: H3Event): string {
  const filter = query2filter(query)
  const { dataset } = useRuntimeConfig(event)
  const sql = select([
    `${logsMap.slug} as slug`,
    `${logsMap.url} as url`,
    `${weightedDistinct(logsMap.ip!)} as viewer`,
    'SUM(_sample_interval) as views',
    `${weightedReferers(logsMap.referer!)} as referer`,
  ].join(', '))
    .from(dataset)
    .where(filter)
    .groupBy('slug', 'url')
    .orderBy('views DESC')

  appendTimeFilter(sql, query)
  return sql.toString()
}

function toCsv(rows: AccessExportRow[]): string {
  return generateCsv([...CsvColumns], rows.map(row => CsvColumns.map(column => row[column])))
}

export default eventHandler(async (event) => {
  if (getRouterParam(event, 'action') !== 'export') {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const query = await getValidatedQuery(event, StatsExportQuerySchema.parse)
  const sql = query2sql(query, event)
  const result = await useWAE(event, sql) as { data?: AccessExportRow[] }
  const csv = toCsv(result.data ?? [])

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${createExportFilename('sink-access', 'csv')}"`)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return csv
})
