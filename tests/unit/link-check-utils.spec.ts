import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDashboardLinkDetailLocation,
  getDashboardLinkDetailUrl,
} from '../../app/utils/link-check'

let dashboardURL = ''

vi.mock('@/utils/dashboard-query', async () => import('../../app/utils/dashboard-query'))
vi.mock('@/utils/dashboard-url', async () => import('../../app/utils/dashboard-url'))
vi.mock('#shared/utils/host-surface', async () => import('../../shared/utils/host-surface'))

Object.assign(globalThis, {
  useRuntimeConfig: () => ({ public: { get dashboardURL() { return dashboardURL } } }),
})

beforeEach(() => {
  dashboardURL = ''
})

describe('dashboard link detail navigation', () => {
  it('keeps analysis time and view while removing list slugs', () => {
    expect(getDashboardLinkDetailLocation('detail-slug', {
      from: '100',
      to: '200',
      slugs: ['beta', 'alpha'],
      view: 'heatmap',
      metric: 'visitors',
    })).toEqual({
      name: 'link',
      query: {
        slug: 'detail-slug',
        from: '100',
        to: '200',
        view: 'heatmap',
        metric: 'visitors',
      },
    })
  })

  it('keeps an analysis preset and drops legacy filter slugs', () => {
    expect(getDashboardLinkDetailLocation('detail-slug', {
      range: 'today',
      filters: JSON.stringify({ slug: 'legacy-list-slug' }),
    })).toEqual({
      name: 'link',
      query: { slug: 'detail-slug', range: 'today' },
    })
  })

  it('returns only the slug when there is no source query', () => {
    expect(getDashboardLinkDetailLocation('detail-slug')).toEqual({
      name: 'link',
      query: { slug: 'detail-slug' },
    })
  })

  it('encodes the slug in a detail URL', () => {
    expect(getDashboardLinkDetailUrl('space / 中文?&=#')).toBe(
      '/dashboard/link?slug=space%20%2F%20%E4%B8%AD%E6%96%87%3F%26%3D%23',
    )
  })

  // This helper returns a literal URL for an `href` and a clipboard copy rather than a route
  // location, so it is the one place that has to follow the dashboard between both shapes.
  it('drops the /dashboard prefix when a dashboard host is configured', () => {
    dashboardURL = 'https://dash.example.com'
    expect(getDashboardLinkDetailUrl('detail-slug')).toBe('/link?slug=detail-slug')
  })
})
