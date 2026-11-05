import type { DashboardQuery } from '@/utils/dashboard-query'
import { parseAnalysisQuery, serializeAnalysisQuery } from '@/utils/dashboard-query'
import { dashboardPath } from '@/utils/dashboard-url'

export function getDashboardLinkDetailLocation(slug: string, sourceQuery?: DashboardQuery) {
  return {
    name: 'link',
    query: sourceQuery
      ? serializeAnalysisQuery(parseAnalysisQuery(sourceQuery, false), { slug, allowSlugs: false })
      : { slug },
  }
}

/** Literal URL for an `href` or a clipboard copy, where a route location will not do. */
export function getDashboardLinkDetailUrl(slug: string): string {
  return `${dashboardPath('/link')}?slug=${encodeURIComponent(slug)}`
}
