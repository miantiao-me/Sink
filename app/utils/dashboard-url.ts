import { parseDashboardHost, resolveDashboardRoutePrefix } from '#shared/utils/host-surface'

/**
 * Whether the browser is currently on the configured dashboard host. Always true when no
 * dashboard URL is set, because then one host serves everything.
 */
export function isDashboardHost(dashboardURL: string): boolean {
  const dashboardHost = parseDashboardHost(dashboardURL)
  if (!dashboardHost)
    return true

  return window.location.host.toLowerCase() === dashboardHost
}

/**
 * Path of a dashboard page in the shape this deployment serves: `/links` on a dedicated
 * dashboard host, `/dashboard/links` otherwise. Prefer navigating by route name; use this only
 * where a literal path string is needed, such as an `href` or a full page load.
 */
export function dashboardPath(path: string): string {
  return `${resolveDashboardRoutePrefix(useRuntimeConfig().public.dashboardURL)}${path}`
}

/**
 * Link to the dashboard from the homepage. Returns an absolute URL when the dashboard has its
 * own host, so the link can cross origins, and a path otherwise.
 */
export function dashboardHref(): string {
  const { dashboardURL } = useRuntimeConfig().public
  return dashboardURL ? new URL('/links', dashboardURL).href : dashboardPath('/links')
}
