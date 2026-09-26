// Shape of the public, unauthenticated `/_config` endpoint.
export interface PublicConfig {
  /** Whether `/` redirects to an external home URL (NUXT_HOME_URL is set). */
  homeRedirect: boolean
  /** Whether links may opt into reverse proxy mode (NUXT_LINK_PROXY_ENABLED=true). */
  linkProxyEnabled: boolean
}
