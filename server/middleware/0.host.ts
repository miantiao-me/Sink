import { resolveDashboardRoutePrefix, resolveHostSurface } from '#shared/utils/host-surface'

// Paths that belong to the dashboard host and must not answer on a short-link host.
const DASHBOARD_ONLY_PATHS = ['/api', '/_docs']

function isDashboardOnlyPath(pathname: string): boolean {
  return DASHBOARD_ONLY_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

// Runs before `1.redirect.ts` so every later handler can read one decision about what this host
// is allowed to serve instead of deriving it again from the path.
export default eventHandler((event) => {
  const { dashboardURL } = useRuntimeConfig(event).public
  const surface = resolveHostSurface(dashboardURL, getRequestHost(event))
  event.context.hostSurface = surface

  const { pathname } = getRequestURL(event)

  if (surface === 'links') {
    if (isDashboardOnlyPath(pathname))
      throw createError({ status: 404, statusText: 'Not found' })

    return
  }

  if (surface === 'dashboard')
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  // Neither the dashboard host root nor the `/dashboard` prefix has a page of its own, so send
  // both to the landing page, with or without a trailing slash. On a short-link host `/` stays
  // the homepage. Running before `1.redirect.ts` is what stops a stored link with the slug
  // `dashboard` from taking the prefix away once no dashboard host is configured.
  const prefix = resolveDashboardRoutePrefix(dashboardURL)
  const requestedPath = pathname.replace(/\/$/, '').toLowerCase()
  if (requestedPath === prefix)
    return sendRedirect(event, `${prefix}/links`)
})
