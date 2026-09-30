/**
 * Which part of the app a request host is allowed to serve.
 *
 * - `dashboard`: the host named by `NUXT_PUBLIC_DASHBOARD_URL`. Serves the dashboard
 *   SPA at the root, `/api/**`, and `/_docs/**`. Short links are not resolved here.
 * - `links`: any other host. Serves the homepage and short links only.
 * - `both`: no dashboard URL is configured, so one host serves everything. This is
 *   what `pnpm dev` and the test suite run on.
 */
export type HostSurface = 'dashboard' | 'links' | 'both'

/** Where the dashboard pages are mounted when they have no host of their own. */
export const DASHBOARD_ROUTE_PREFIX = '/dashboard'

/** Name of the `app/pages/(dashboard)/` route group, carried on each page's `meta.groups`. */
export const DASHBOARD_ROUTE_GROUP = 'dashboard'

/**
 * Path the dashboard pages are mounted under. A dedicated dashboard host serves them from its
 * root, so the prefix is empty; otherwise they sit under `/dashboard`, which keeps them off the
 * slug namespace. Changing `NUXT_PUBLIC_DASHBOARD_URL` moves them without a rebuild.
 */
export function resolveDashboardRoutePrefix(dashboardURL: string): string {
  return dashboardURL ? '' : DASHBOARD_ROUTE_PREFIX
}

/**
 * Host (including port) of the configured dashboard origin, or `undefined` when no dashboard
 * URL is set. Throws on a malformed value rather than falling back to `both`, because that
 * fallback would quietly serve the dashboard and `/api/**` on every host.
 */
export function parseDashboardHost(dashboardURL: string): string | undefined {
  if (!dashboardURL)
    return undefined

  try {
    return new URL(dashboardURL).host.toLowerCase()
  }
  catch {
    throw new Error(`NUXT_PUBLIC_DASHBOARD_URL must be a full origin such as https://dash.example.com, received "${dashboardURL}"`)
  }
}

export function resolveHostSurface(dashboardURL: string, requestHost: string): HostSurface {
  const dashboardHost = parseDashboardHost(dashboardURL)
  if (!dashboardHost)
    return 'both'

  return requestHost.toLowerCase() === dashboardHost ? 'dashboard' : 'links'
}
