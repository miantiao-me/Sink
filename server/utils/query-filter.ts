import type { RawBuilder } from 'kysely'
import type { Query } from '#shared/schemas/query'
import type { BlobsKey } from './access-log'
import { sql } from 'kysely'
import { blobsMap } from './access-log'

export type { Query }

function queryValues(value: string, omitEmpty = false): string[] {
  if ([...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1F || code === 0x7F
  })) {
    throw new Error('Analytics filters must not contain control characters')
  }

  const values = value.split(',')
  return omitEmpty ? values.filter(Boolean) : values
}

function inFilter(column: string, values: string[]): RawBuilder<boolean> | undefined {
  if (!values.length)
    return

  return sql<boolean>`${sql.ref(column)} in (${sql.join(values.map(value => sql.lit(value)))})`
}

export function buildAnalyticsFilter(query: Query): RawBuilder<boolean> | undefined {
  const filters: RawBuilder<boolean>[] = []
  if (query.id) {
    const filter = inFilter('index1', queryValues(query.id, true))
    if (filter)
      filters.push(filter)
  }

  const blobKeys = Object.keys(blobsMap) as BlobsKey[]
  for (const blobKey of blobKeys) {
    const queryKey = blobsMap[blobKey] as keyof Query
    const value = query[queryKey]
    if (typeof value === 'string' && value)
      filters.push(inFilter(blobKey, queryValues(value))!)
  }

  if (query.startAt) {
    const startTimestamp = Math.floor(Number(query.startAt))
    filters.push(sql<boolean>`${sql.ref('timestamp')} >= toDateTime(${sql.lit(startTimestamp)})`)
  }

  if (query.endAt) {
    const endTimestamp = Math.floor(Number(query.endAt))
    filters.push(sql<boolean>`${sql.ref('timestamp')} <= toDateTime(${sql.lit(endTimestamp)})`)
  }

  return filters.length ? sql<boolean>`${sql.join(filters, sql` and `)}` : undefined
}
