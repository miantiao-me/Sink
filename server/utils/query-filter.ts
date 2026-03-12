import type { Query } from '#shared/schemas/query'
import type { SelectStatement } from 'sql-bricks'
import type { BlobsKey } from './access-log'

const { in: $in, and } = SqlBricks

export type { Query }

export function query2filter(query: Query) {
  const filter = []
  if (query.id)
    filter.push($in('index1', query.id.split(',').filter(Boolean)))

  const blobKeys = Object.keys(blobsMap) as BlobsKey[]
  for (const blobKey of blobKeys) {
    const queryKey = blobsMap[blobKey] as keyof Query
    const value = query[queryKey]
    if (typeof value === 'string' && value) {
      filter.push($in(blobKey, value.split(',')))
    }
  }

  return filter.length ? and(...filter) : []
}

export function appendTimeFilter(sql: SelectStatement, query: Query): SelectStatement {
  if (query.startAt) {
    const startTimestamp = Math.floor(Number(query.startAt))
    sql.where(SqlBricks.gte('timestamp', SqlBricks(`toDateTime(${startTimestamp})`)))
  }

  if (query.endAt) {
    const endTimestamp = Math.floor(Number(query.endAt))
    sql.where(SqlBricks.lte('timestamp', SqlBricks(`toDateTime(${endTimestamp})`)))
  }

  return sql
}
