const TOKEN_KEY = 'SinkSiteToken'

export function useAuthToken() {
  function getToken() {
    if (import.meta.client) {
      return localStorage.getItem(TOKEN_KEY)
    }
    return null
  }

  function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY)
  }

  return { getToken, setToken, removeToken }
}
