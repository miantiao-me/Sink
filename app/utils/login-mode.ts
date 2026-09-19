export type LoginMode = 'loading' | 'oidc' | 'single-user' | 'error'
export type LoginConfigStatus = 'idle' | 'pending' | 'success' | 'error'

export function resolveLoginMode(status: LoginConfigStatus, oidcEnabled?: boolean): LoginMode {
  if (status === 'idle' || status === 'pending')
    return 'loading'
  if (status === 'error')
    return 'error'
  return oidcEnabled ? 'oidc' : 'single-user'
}
