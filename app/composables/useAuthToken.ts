const TOKEN_KEY = 'SinkSiteToken'

export function getAuthToken() {
  if (!import.meta.client)
    return null

  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  if (!import.meta.client)
    return

  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken() {
  if (!import.meta.client)
    return

  localStorage.removeItem(TOKEN_KEY)
}

export function useAuthToken() {
  return {
    getToken: getAuthToken,
    setToken: setAuthToken,
    removeToken: removeAuthToken,
  }
}
