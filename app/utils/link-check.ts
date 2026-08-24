import type { DashboardQuery } from '@/utils/dashboard-query'
import { parseAnalysisQuery, serializeAnalysisQuery } from '@/utils/dashboard-query'

export function getDashboardLinkDetailLocation(slug: string, sourceQuery?: DashboardQuery) {
  return {
    path: '/dashboard/link',
    query: sourceQuery
      ? serializeAnalysisQuery(parseAnalysisQuery(sourceQuery, false), { slug, allowSlugs: false })
      : { slug },
  }
}

export function getDashboardLinkDetailUrl(slug: string): string {
  return `/dashboard/link?slug=${encodeURIComponent(slug)}`
}
