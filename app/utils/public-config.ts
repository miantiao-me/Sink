import type { PublicConfig } from '@/types'

let pending: Promise<PublicConfig> | null = null

// Fetches the public `/_config` endpoint once per session (retries on failure).
export function fetchPublicConfig(): Promise<PublicConfig> {
  pending ??= $fetch<PublicConfig>('/_config').catch((error) => {
    pending = null
    throw error
  })
  return pending
}

// The link proxy switch stays hidden unless the backend explicitly enables it.
export function isLinkProxyEnabled(config: PublicConfig | undefined): boolean {
  return config?.linkProxyEnabled === true
}
