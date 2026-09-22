import { generateCsv } from '#shared/utils/csv'
import { createExportFilename } from '#shared/utils/export-file'

const CsvColumns = ['slug', 'url', 'viewer', 'views', 'referer'] as const

interface AccessExportRow {
  slug?: string
  url?: string
  viewer?: number
  views?: number
  referer?: number
}

function toCsv(rows: AccessExportRow[]): string {
  return generateCsv([...CsvColumns], rows.map(row => CsvColumns.map(column => row[column])))
}

export default eventHandler(async (event) => {
  if (getRouterParam(event, 'action') !== 'export') {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const query = await getValidatedQuery(event, StatsExportQuerySchema.parse)
  const result = await useWAE(event, buildAccessExportQuery(query, event)) as { data?: AccessExportRow[] }
  const csv = toCsv(result.data ?? [])

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${createExportFilename('sink-access', 'csv')}"`)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return csv
})
