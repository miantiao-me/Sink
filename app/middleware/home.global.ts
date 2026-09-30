import { isDashboardHost } from '@/utils/dashboard-url'

// What `/` means depends on the host, and on SPA navigations there is no server request to
// decide it. The initial load is already handled by `server/middleware/0.host.ts` (dashboard
// host) and `server/middleware/1.redirect.ts` (NUXT_PUBLIC_HOME_URL), so only client-side
// navigations to `/` need handling here.
export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server)
    return

  if (to.path !== '/' || from.path === '/')
    return

  const { homeURL, dashboardURL } = useRuntimeConfig().public

  // Only a dedicated dashboard host has no homepage of its own.
  if (dashboardURL && isDashboardHost(dashboardURL))
    return navigateTo({ name: 'links' })

  if (homeURL)
    return navigateTo(homeURL, { external: true })
})
