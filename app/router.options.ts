import type { RouterConfig } from '@nuxt/schema'
import { DASHBOARD_ROUTE_GROUP, resolveDashboardRoutePrefix } from '#shared/utils/host-surface'

// `app/pages/(dashboard)/` is a route group, so its pages resolve to the root: `/links`,
// `/analysis`, and so on, which is what a dedicated dashboard host serves. Without one, the
// same pages are mounted under `/dashboard`. Nuxt keeps the group name on `meta.groups`, so the
// page files stay the only place that decides which routes belong to the dashboard. Route names
// are untouched, so navigating by name is correct in both shapes.
export default <RouterConfig>{
  routes: (routes) => {
    const prefix = resolveDashboardRoutePrefix(useRuntimeConfig().public.dashboardURL)
    if (!prefix)
      return routes

    return routes.map((route) => {
      const groups = route.meta?.groups
      if (!Array.isArray(groups) || !groups.includes(DASHBOARD_ROUTE_GROUP))
        return route

      return { ...route, path: `${prefix}${route.path}` }
    })
  },
}
