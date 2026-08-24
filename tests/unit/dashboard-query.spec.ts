import { describe, expect, it } from 'vitest'
import {
  isSameDashboardQuery,
  parseAnalysisQuery,
  parseLinksQuery,
  parseRealtimeQuery,
  serializeAnalysisQuery,
  serializeLinksQuery,
  serializeRealtimeQuery,
} from '../../app/utils/dashboard-query'

describe('analysis dashboard query', () => {
  it('omits default values when serializing', () => {
    expect(serializeAnalysisQuery({
      datePreset: 'last-7d',
      slugs: [],
      view: 'trend',
      metric: 'visits',
    })).toEqual({})
  })

  it('gives a valid custom range precedence over a preset', () => {
    expect(parseAnalysisQuery({ range: 'today', from: '100', to: '200' })).toEqual({
      datePreset: null,
      dateRange: [100, 200],
      slugs: [],
      view: 'trend',
      metric: 'visits',
    })
    expect(serializeAnalysisQuery({
      datePreset: null,
      dateRange: [100, 200],
      slugs: [],
      view: 'trend',
      metric: 'visits',
    })).toEqual({ from: '100', to: '200' })
  })

  it('serializes a preset without a stale custom range', () => {
    expect(serializeAnalysisQuery({
      datePreset: 'today',
      dateRange: [100, 200],
      slugs: [],
      view: 'trend',
      metric: 'visits',
    })).toEqual({ range: 'today' })
  })

  it('supports modern range, slugs, view, and metric fields', () => {
    expect(parseAnalysisQuery({
      range: 'last-30d',
      slugs: 'beta, alpha',
      view: 'heatmap',
      metric: 'visitors',
    })).toEqual({
      datePreset: 'last-30d',
      dateRange: undefined,
      slugs: ['alpha', 'beta'],
      view: 'heatmap',
      metric: 'visitors',
    })
    expect(serializeAnalysisQuery({
      datePreset: 'last-30d',
      slugs: ['beta', 'alpha'],
      view: 'heatmap',
      metric: 'visitors',
    })).toEqual({
      range: 'last-30d',
      slugs: ['alpha', 'beta'],
      view: 'heatmap',
      metric: 'visitors',
    })
  })

  it('ignores legacy preset, time, and filters fields', () => {
    expect(parseAnalysisQuery({
      preset: 'today',
      time: JSON.stringify({ startAt: 10, endAt: 20 }),
      filters: JSON.stringify({ slug: 'beta, alpha' }),
    })).toEqual({
      datePreset: 'last-7d',
      dateRange: undefined,
      slugs: [],
      view: 'trend',
      metric: 'visits',
    })
  })

  it('normalizes invalid modern enums, times, and slugs to defaults', () => {
    expect(parseAnalysisQuery({
      range: 'tomorrow',
      from: '-1',
      to: 'not-a-time',
      slugs: 'valid, not valid, /bad',
      view: 'table',
      metric: 'clicks',
    })).toEqual({
      datePreset: 'last-7d',
      dateRange: undefined,
      slugs: ['valid'],
      view: 'trend',
      metric: 'visits',
    })
  })

  it('deduplicates and sorts slugs and preserves array query serialization', () => {
    const state = parseAnalysisQuery({ slugs: ['zeta,alpha', 'beta', 'alpha', null] })
    expect(state.slugs).toEqual(['alpha', 'beta', 'zeta'])
    expect(serializeAnalysisQuery(state)).toEqual({
      slugs: ['alpha', 'beta', 'zeta'],
    })
  })

  it('disallows slugs for detail query state and serialization', () => {
    const state = parseAnalysisQuery({
      slugs: ['beta', 'alpha'],
    }, false)
    expect(state.slugs).toEqual([])

    state.slugs = ['alpha']
    expect(serializeAnalysisQuery(state, { slug: 'detail', allowSlugs: false })).toEqual({ slug: 'detail' })
  })
})

describe('realtime dashboard query', () => {
  it('supports modern window and slugs and serializes only non-default values', () => {
    expect(parseRealtimeQuery({ window: 'last-10m', slugs: 'zeta, alpha' })).toEqual({
      window: 'last-10m',
      slugs: ['alpha', 'zeta'],
    })
    expect(serializeRealtimeQuery({ window: 'last-1h', slugs: [] })).toEqual({})
    expect(serializeRealtimeQuery({ window: 'last-10m', slugs: ['zeta', 'alpha', 'zeta'] })).toEqual({
      window: 'last-10m',
      slugs: ['alpha', 'zeta'],
    })
  })

  it('ignores legacy time and filters fields', () => {
    expect(parseRealtimeQuery({
      time: 'last-10m',
      filters: JSON.stringify({ slug: 'beta, alpha' }),
    })).toEqual({ window: 'last-1h', slugs: [] })
  })

  it('normalizes invalid modern windows and slugs', () => {
    expect(parseRealtimeQuery({
      window: 'forever',
      slugs: ['valid', 'not valid', '/bad'],
    })).toEqual({ window: 'last-1h', slugs: ['valid'] })
  })
})

describe('links dashboard query', () => {
  it('normalizes invalid values and omits defaults', () => {
    expect(parseLinksQuery({ status: 'disabled', sort: 'popular', tag: '   ' })).toEqual({
      status: 'active',
      sort: 'newest',
      tag: undefined,
    })
    expect(serializeLinksQuery({ status: 'active', sort: 'newest' })).toEqual({})
  })

  it('normalizes and serializes non-default values', () => {
    const state = parseLinksQuery({ status: 'expired', sort: 'az', tag: '  Product  ' })
    expect(state).toEqual({ status: 'expired', sort: 'az', tag: 'product' })
    expect(serializeLinksQuery(state)).toEqual({ status: 'expired', sort: 'az', tag: 'product' })
  })
})

describe('dashboard query comparison', () => {
  it('ignores key order and value order', () => {
    expect(isSameDashboardQuery(
      { view: 'heatmap', slugs: ['zeta', 'alpha'] },
      { slugs: ['alpha', 'zeta'], view: 'heatmap' },
    )).toBe(true)
  })

  it('still detects different query values', () => {
    expect(isSameDashboardQuery({ slugs: ['alpha'] }, { slugs: ['beta'] })).toBe(false)
  })

  it('detects valueless and partially valueless query fields', () => {
    expect(isSameDashboardQuery({ unknown: null }, {})).toBe(false)
    expect(isSameDashboardQuery({ slugs: ['alpha', null] }, { slugs: ['alpha'] })).toBe(false)
  })
})
