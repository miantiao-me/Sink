import { describe, expect, it, vi } from 'vitest'
import {
  getDashboardLinkDetailLocation,
  getDashboardLinkDetailUrl,
} from '../../app/utils/link-check'

vi.mock('@/utils/dashboard-query', async () => import('../../app/utils/dashboard-query'))

describe('dashboard link detail navigation', () => {
  it('keeps analysis time and view while removing list slugs', () => {
    expect(getDashboardLinkDetailLocation('detail-slug', {
      from: '100',
      to: '200',
      slugs: ['beta', 'alpha'],
      view: 'heatmap',
      metric: 'visitors',
    })).toEqual({
      path: '/dashboard/link',
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
      path: '/dashboard/link',
      query: { slug: 'detail-slug', range: 'today' },
    })
  })

  it('returns only the slug when there is no source query', () => {
    expect(getDashboardLinkDetailLocation('detail-slug')).toEqual({
      path: '/dashboard/link',
      query: { slug: 'detail-slug' },
    })
  })

  it('encodes the slug in a detail URL', () => {
    expect(getDashboardLinkDetailUrl('space / 中文?&=#')).toBe(
      '/dashboard/link?slug=space%20%2F%20%E4%B8%AD%E6%96%87%3F%26%3D%23',
    )
  })
})
