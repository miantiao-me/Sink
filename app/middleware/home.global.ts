// When NUXT_PUBLIC_HOME_URL is set, `/` must always resolve through the server
// (server/middleware/1.redirect.ts) instead of the prerendered SPA homepage.
export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server)
    return

  // Initial load (from === to) is already handled server-side; only SPA
  // navigations bypass the server and need a forced full-page load.
  if (to.path !== '/' || from.path === '/')
    return

  const { homeURL } = useRuntimeConfig().public
  if (homeURL)
    return navigateTo(homeURL, { external: true })
})
