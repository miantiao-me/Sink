import type { AuthMethod, VerifyResponse } from '@/types'
import { readonly, useState } from '#imports'

export function useAuthSession() {
  const authMethod = useState<AuthMethod | null>('auth-method', () => null)
  const userID = useState<string | null>('user-id', () => null)
  const userEmail = useState<string | null>('user-email', () => null)
  const accessEnabled = useState('access-enabled', () => false)
  const isAdmin = useState('is-admin', () => false)

  function setAuthSession(response: VerifyResponse) {
    authMethod.value = response.authMethod
    userID.value = response.userID
    userEmail.value = response.userEmail
    accessEnabled.value = response.accessEnabled
    isAdmin.value = response.isAdmin
  }

  function clearAuthSession() {
    authMethod.value = null
    userID.value = null
    userEmail.value = null
    accessEnabled.value = false
    isAdmin.value = false
  }

  return {
    authMethod: readonly(authMethod),
    userID: readonly(userID),
    userEmail: readonly(userEmail),
    accessEnabled: readonly(accessEnabled),
    isAdmin: readonly(isAdmin),
    setAuthSession,
    clearAuthSession,
  }
}
