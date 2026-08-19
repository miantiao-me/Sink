import type { DashboardSlugFilters } from '@/utils/dashboard-query'
import { watch } from 'vue'
import {
  isSameDashboardQuery,
  parseAnalysisQuery,
  parseDashboardSlug,
  parseLinksQuery,
  parseRealtimeQuery,
  serializeAnalysisQuery,
  serializeLinksQuery,
  serializeRealtimeQuery,
} from '@/utils/dashboard-query'

function filterSlugs(filters: DashboardSlugFilters): string[] {
  return filters.slug?.split(',').map(slug => slug.trim()).filter(Boolean) ?? []
}

export function useDashboardAnalysisRouteState(options: { detail?: boolean } = {}) {
  const route = useRoute()
  const router = useRouter()
  const store = useDashboardAnalysisStore()
  const routePath = options.detail ? '/dashboard/link' : '/dashboard/analysis'
  let applyingRoute = false

  function currentQuery() {
    return serializeAnalysisQuery({
      datePreset: store.datePreset,
      dateRange: [store.dateRange.startAt, store.dateRange.endAt],
      slugs: filterSlugs(store.filters),
      view: store.viewMode,
      metric: store.heatmapMetric,
    }, {
      slug: options.detail ? parseDashboardSlug(route.query.slug) : undefined,
      allowSlugs: !options.detail,
    })
  }

  watch(
    () => [route.path, route.query] as const,
    ([path, query]) => {
      if (path !== routePath)
        return

      applyingRoute = true
      store.applyRouteState(parseAnalysisQuery(query, !options.detail))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ path: routePath, query: canonicalQuery, hash: route.hash })
    },
    { deep: true, immediate: true, flush: 'sync' },
  )

  watch(
    [
      () => store.datePreset,
      () => store.dateRange,
      () => store.filters,
      () => store.viewMode,
      () => store.heatmapMetric,
    ],
    () => {
      if (applyingRoute || route.path !== routePath)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ path: routePath, query, hash: route.hash })
    },
    { deep: true, flush: 'pre' },
  )
}

export function useDashboardRealtimeRouteState() {
  const route = useRoute()
  const router = useRouter()
  const store = useDashboardRealtimeStore()
  const routePath = '/dashboard/realtime'
  let applyingRoute = false

  function currentQuery() {
    return serializeRealtimeQuery({
      window: store.timeName,
      slugs: filterSlugs(store.filters),
    })
  }

  watch(
    () => [route.path, route.query] as const,
    ([path, query]) => {
      if (path !== routePath)
        return

      applyingRoute = true
      store.applyRouteState(parseRealtimeQuery(query))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ path: routePath, query: canonicalQuery, hash: route.hash })
    },
    { deep: true, immediate: true, flush: 'sync' },
  )

  watch(
    [() => store.timeName, () => store.filters],
    () => {
      if (applyingRoute || route.path !== routePath)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ path: routePath, query, hash: route.hash })
    },
    { deep: true, flush: 'pre' },
  )
}

export function useDashboardLinksRouteState() {
  const route = useRoute()
  const router = useRouter()
  const store = useDashboardLinksStore()
  const routePath = '/dashboard/links'
  let applyingRoute = false

  function currentQuery() {
    return serializeLinksQuery({
      status: store.status,
      sort: store.sortBy,
      tag: store.tag,
    })
  }

  watch(
    () => [route.path, route.query] as const,
    ([path, query]) => {
      if (path !== routePath)
        return

      applyingRoute = true
      store.applyRouteState(parseLinksQuery(query))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ path: routePath, query: canonicalQuery, hash: route.hash })
    },
    { deep: true, immediate: true, flush: 'sync' },
  )

  watch(
    [() => store.status, () => store.sortBy, () => store.tag],
    () => {
      if (applyingRoute || route.path !== routePath)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ path: routePath, query, hash: route.hash })
    },
    { flush: 'pre' },
  )
}
