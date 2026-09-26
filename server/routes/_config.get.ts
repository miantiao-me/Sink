import type { PublicConfig } from '#shared/types/config'

// Public, unauthenticated runtime configuration for the SPA client.
// Only expose booleans or values that are safe for anonymous visitors;
// never leak secrets or redirect targets.
export default eventHandler((event): PublicConfig => {
  const { homeURL, linkProxyEnabled } = useRuntimeConfig(event)
  // Never cache: feature flags can change between deploys and must be visible
  // to the client on the next fetch.
  setHeader(event, 'Cache-Control', 'no-store')
  return {
    homeRedirect: Boolean(homeURL),
    linkProxyEnabled: Boolean(linkProxyEnabled),
  }
})
