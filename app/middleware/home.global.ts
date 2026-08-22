// When NUXT_HOME_URL is set, `/` must always resolve through the server
// (server/middleware/1.redirect.ts) instead of the prerendered SPA homepage.
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server)
    return

  // Initial load (from === to) is already handled server-side; only SPA
  // navigations bypass the server and need a forced full-page load.
  if (to.path !== '/' || from.path === '/')
    return

  try {
    const { homeRedirect } = await usePublicConfig()
    if (homeRedirect)
      return navigateTo('/', { external: true })
  }
  catch {
    // Config unavailable: fall through to the SPA homepage.
  }
})
