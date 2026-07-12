import type { AuthMethod, VerifyResponse } from '@/types'
import { readonly, useState } from '#imports'

export function useAuthSession() {
  const authMethod = useState<AuthMethod | null>('auth-method', () => null)
  const accessEnabled = useState('access-enabled', () => false)

  function setAuthSession(response: VerifyResponse) {
    authMethod.value = response.authMethod
    accessEnabled.value = response.accessEnabled
  }

  function clearAuthSession() {
    authMethod.value = null
    accessEnabled.value = false
  }

  return {
    authMethod: readonly(authMethod),
    accessEnabled: readonly(accessEnabled),
    setAuthSession,
    clearAuthSession,
  }
}
