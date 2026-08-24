import type { Query } from '../../shared/schemas/query'
import { sql } from 'kysely'
import { describe, expect, it, vi } from 'vitest'
import { compileAnalyticsQuery, createAnalyticsQuery } from '../../server/utils/analytics-sql'
import { buildAnalyticsFilter } from '../../server/utils/query-filter'

vi.mock('../../server/utils/access-log', () => ({
  blobsMap: {
    blob1: 'slug',
    blob2: 'url',
    blob3: 'ua',
    blob4: 'ip',
    blob5: 'referer',
    blob6: 'country',
    blob7: 'region',
    blob8: 'city',
    blob9: 'timezone',
    blob10: 'language',
    blob11: 'os',
    blob12: 'browser',
    blob13: 'browserType',
    blob14: 'device',
    blob15: 'deviceType',
    blob16: 'COLO',
  },
}))

const baseQuery: Query = { limit: 500 }

describe('analytics SQL compiler', () => {
  it('compiles a query builder with bare identifiers and result aliases', () => {
    const query = createAnalyticsQuery('sink')
      .select(sql<number>`SUM(_sample_interval)`.as('visits'))

    expect(compileAnalyticsQuery(query)).toBe('select SUM(_sample_interval) as visits from sink')
  })

  it('compiles representative Analytics Engine SQL without table aliases', () => {
    const filter = buildAnalyticsFilter({ ...baseQuery, id: '0' })
    const query = createAnalyticsQuery('sink')
      .selectAll()
      .where(filter!)
      .orderBy('timestamp', 'desc')
      .limit(sql.lit(10))
    const compiled = compileAnalyticsQuery(query)

    expect(compiled).toBe('select * from sink where index1 in (\'0\') order by timestamp desc limit 10')
    expect(compiled).not.toContain('`')
    expect(compiled).not.toContain('as analytics')
    expect(compiled).not.toContain('analytics.')
  })

  it('rejects parameterized query builder values', () => {
    const query = createAnalyticsQuery('events').selectAll().where('index1', '=', 'unsafe')

    expect(() => compileAnalyticsQuery(query))
      .toThrow('Analytics SQL queries must not contain parameters')
  })

  it('inlines and escapes query builder literals without parameters', () => {
    const payload = String.raw`it's \\'; DROP TABLE sink; --`
    const query = createAnalyticsQuery('events')
      .selectAll()
      .where('index1', '=', sql.lit(payload))
    const compiled = compileAnalyticsQuery(query)

    expect(compiled).toContain('it\'\'s')
    expect(compiled).toContain(String.raw`\\''; DROP TABLE sink; --`)
    expect(compiled).not.toContain('?')
  })

  it.each([
    'sink.events',
    'sink-events',
    'sink as analytics',
    'sink;drop',
    '`sink`',
    '0sink',
  ])('rejects invalid dataset identifier %s', (dataset) => {
    expect(() => createAnalyticsQuery(dataset)).toThrow('Invalid Analytics dataset')
  })

  it('rejects invalid column identifiers while compiling', () => {
    const query = createAnalyticsQuery('sink').select(sql.ref('invalid-column'))

    expect(() => compileAnalyticsQuery(query)).toThrow('Invalid Analytics identifier: invalid-column')
  })

  it('rejects invalid result aliases while compiling', () => {
    const query = createAnalyticsQuery('sink').select(sql.ref('blob1').as('invalid-alias'))

    expect(() => compileAnalyticsQuery(query)).toThrow('Invalid Analytics identifier: invalid-alias')
  })

  it('compiles valid bare column identifiers', () => {
    const query = createAnalyticsQuery('sink').select(sql.ref('blob1').as('dynamic_column'))

    expect(compileAnalyticsQuery(query))
      .toBe('select blob1 as dynamic_column from sink')
  })
})

describe('analytics filters', () => {
  it('omits an empty filter', () => {
    expect(buildAnalyticsFilter(baseQuery)).toBeUndefined()
  })

  it('combines ordinary, time, and IN-list filters', () => {
    const filter = buildAnalyticsFilter({
      ...baseQuery,
      id: 'first,second',
      slug: 'alpha,beta',
      country: 'US',
      startAt: 100.9,
      endAt: 200.9,
    })
    const compiled = compileAnalyticsQuery(createAnalyticsQuery('events').selectAll().where(filter!))

    expect(compiled).toContain('index1 in (\'first\', \'second\')')
    expect(compiled).toContain('blob1 in (\'alpha\', \'beta\')')
    expect(compiled).toContain('blob6 in (\'US\')')
    expect(compiled).toContain('timestamp >= toDateTime(100)')
    expect(compiled).toContain('timestamp <= toDateTime(200)')
    expect(compiled.match(/ and /g)).toHaveLength(4)
  })

  it('rejects control characters in query filters', () => {
    expect(() => buildAnalyticsFilter({ ...baseQuery, slug: 'safe\nunsafe' }))
      .toThrow('Analytics filters must not contain control characters')
    expect(() => buildAnalyticsFilter({ ...baseQuery, id: 'safe\u007Funsafe' }))
      .toThrow('Analytics filters must not contain control characters')
  })
})
