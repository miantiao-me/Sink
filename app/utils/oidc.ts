import { useAPI } from './api'

export function signInWithOidc(returnTo = '/dashboard'): void {
  if (!import.meta.client)
    return

  const safeReturnTo = returnTo.startsWith('/dashboard') && !returnTo.startsWith('//')
    ? returnTo
    : '/dashboard'
  window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}`)
}

export async function signOutFromOidc(): Promise<void> {
  await useAPI('/api/auth/logout', {
    method: 'POST',
  })
  window.location.assign('/dashboard/login')
}
