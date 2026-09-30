import type { VerifyResponse } from '@/types'

// Dashboard pages sit at the root of the dashboard host, so every matched route except
// the homepage needs a verified session. `login` runs too, so an already authenticated
// visitor is sent on to the dashboard instead of seeing the form again.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (!to.matched.length || to.name === 'index')
    return

  const { setAuthSession, clearAuthSession } = useAuthSession()

  try {
    const response = await useAPI<VerifyResponse>('/api/verify')
    setAuthSession(response)

    if (to.name === 'login')
      return navigateTo({ name: 'links' })
  }
  catch {
    clearAuthSession()
    if (to.name !== 'login')
      return abortNavigation()
  }
})
