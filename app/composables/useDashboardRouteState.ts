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
  const routeName = options.detail ? 'link' : 'analysis'
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
    () => [route.name, route.query] as const,
    ([name, query]) => {
      if (name !== routeName)
        return

      applyingRoute = true
      store.applyRouteState(parseAnalysisQuery(query, !options.detail))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ name: routeName, query: canonicalQuery, hash: route.hash })
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
      if (applyingRoute || route.name !== routeName)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ name: routeName, query, hash: route.hash })
    },
    { deep: true, flush: 'pre' },
  )
}

export function useDashboardRealtimeRouteState() {
  const route = useRoute()
  const router = useRouter()
  const store = useDashboardRealtimeStore()
  const routeName = 'realtime'
  let applyingRoute = false

  function currentQuery() {
    return serializeRealtimeQuery({
      window: store.timeName,
      slugs: filterSlugs(store.filters),
    })
  }

  watch(
    () => [route.name, route.query] as const,
    ([name, query]) => {
      if (name !== routeName)
        return

      applyingRoute = true
      store.applyRouteState(parseRealtimeQuery(query))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ name: routeName, query: canonicalQuery, hash: route.hash })
    },
    { deep: true, immediate: true, flush: 'sync' },
  )

  watch(
    [() => store.timeName, () => store.filters],
    () => {
      if (applyingRoute || route.name !== routeName)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ name: routeName, query, hash: route.hash })
    },
    { deep: true, flush: 'pre' },
  )
}

export function useDashboardLinksRouteState() {
  const route = useRoute()
  const router = useRouter()
  const store = useDashboardLinksStore()
  const routeName = 'links'
  let applyingRoute = false

  function currentQuery() {
    return serializeLinksQuery({
      status: store.status,
      sort: store.sortBy,
      tag: store.tag,
    })
  }

  watch(
    () => [route.name, route.query] as const,
    ([name, query]) => {
      if (name !== routeName)
        return

      applyingRoute = true
      store.applyRouteState(parseLinksQuery(query))
      applyingRoute = false

      const canonicalQuery = currentQuery()
      if (!isSameDashboardQuery(query, canonicalQuery))
        void router.replace({ name: routeName, query: canonicalQuery, hash: route.hash })
    },
    { deep: true, immediate: true, flush: 'sync' },
  )

  watch(
    [() => store.status, () => store.sortBy, () => store.tag],
    () => {
      if (applyingRoute || route.name !== routeName)
        return

      const query = currentQuery()
      if (!isSameDashboardQuery(route.query, query))
        void router.replace({ name: routeName, query, hash: route.hash })
    },
    { flush: 'pre' },
  )
}
