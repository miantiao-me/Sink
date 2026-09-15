import type { PublicConfig } from '#shared/types/config'

// Public, unauthenticated runtime configuration for the SPA client.
// Only expose booleans or values that are safe for anonymous visitors;
// never leak secrets or redirect targets.
export default eventHandler((event): PublicConfig => {
  const { homeURL } = useRuntimeConfig(event)
  return {
    homeRedirect: Boolean(homeURL),
  }
})
