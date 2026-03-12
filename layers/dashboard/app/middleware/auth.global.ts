export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const { getToken } = useAuthToken()

  if (to.path.startsWith('/dashboard') && to.path !== '/dashboard/login') {
    if (!getToken())
      return navigateTo('/dashboard/login')
  }

  if (to.path === '/dashboard/login') {
    try {
      await useAPI('/api/verify')
      return navigateTo('/dashboard')
    }
    catch (e) {
      console.warn(e)
    }
  }
})
