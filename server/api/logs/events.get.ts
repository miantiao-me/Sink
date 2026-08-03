import type { H3Event } from 'h3'
import { sql } from 'kysely'
import { QuerySchema } from '#shared/schemas/query'

function query2sql(query: Query, event: H3Event) {
  const filter = buildAnalyticsFilter(query)
  const { dataset } = useRuntimeConfig(event)
  const limit = Math.max(0, Math.floor(query.limit))
  const analyticsQuery = createAnalyticsQuery(dataset)
  const filteredQuery = filter ? analyticsQuery.where(filter) : analyticsQuery

  return filteredQuery
    .selectAll()
    .orderBy('timestamp', 'desc')
    .limit(sql.lit(limit))
}

interface WAEEvents {
  [key: string]: string
}

function eventId(event: WAEEvents): string {
  const source = Object.keys(event).sort().map(key => `${key}\0${event[key]}`).join('\x01')
  let first = 0x811C9DC5
  let second = 0x9E3779B9

  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85EBCA6B)
  }

  return `wae_${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`
}

function events2logs(events: WAEEvents[]) {
  const occurrences = new Map<string, number>()
  return events.map((event) => {
    const blobs = Array.from({ length: Object.keys(blobsMap).length }, (_, i) => event[`blob${i + 1}`] ?? '')
    const doubles = Array.from({ length: Object.keys(doublesMap).length }, (_, i) => +(event[`double${i + 1}`] ?? 0))
    const baseId = eventId(event)
    const occurrence = occurrences.get(baseId) ?? 0
    occurrences.set(baseId, occurrence + 1)
    return {
      ...blobs2logs(blobs),
      ...doubles2logs(doubles),
      ip: undefined,
      id: `${baseId}_${occurrence}`,
      timestamp: Math.floor(new Date(`${event.timestamp}Z`).getTime() / 1000),
    }
  })
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)

  const logs = await useWAE(event, sql) as { data: WAEEvents[] }
  return events2logs(logs?.data || [])
})
