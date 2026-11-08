import type { Query } from '../../shared/schemas/query'
import { describe, expect, it } from 'vitest'
import { withCounterLookback } from '../../server/utils/query-filter'

const baseQuery: Query = { id: 'link-id', limit: 500 }

describe('counter query bounds', () => {
  it('adds a retention-safe start time to unbounded requests', () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0)
    const bounded = withCounterLookback(baseQuery, now)
    expect(bounded.startAt).toBe(Math.floor(now / 1000) - 28 * 24 * 60 * 60)
  })

  it('keeps explicit startAt untouched', () => {
    const query: Query = { ...baseQuery, startAt: 1000 }
    expect(withCounterLookback(query)).toEqual(query)
  })
})
