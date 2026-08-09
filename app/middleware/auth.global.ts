import type { VerifyResponse } from '@/types'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (to.path !== '/' && !to.path.startsWith('/dashboard'))
    return

  const { setAuthSession, clearAuthSession } = useAuthSession()

  try {
    const response = await useAPI<VerifyResponse>('/api/verify')
    setAuthSession(response)

    if (to.path === '/')
      return navigateTo('/dashboard/links')
    if (to.path === '/dashboard/login')
      return navigateTo('/dashboard')
  }
  catch {
    clearAuthSession()
    if (to.path === '/')
      return navigateTo('/dashboard/login')
    if (to.path !== '/dashboard/login')
      return abortNavigation()
  }
})
