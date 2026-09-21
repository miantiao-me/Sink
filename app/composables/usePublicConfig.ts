import type { PublicConfig } from '@/types'

let pending: Promise<PublicConfig> | null = null

// Fetches the public `/_config` endpoint once per session (retries on failure).
export function usePublicConfig(): Promise<PublicConfig> {
  pending ??= $fetch<PublicConfig>('/_config').catch((error) => {
    pending = null
    throw error
  })
  return pending
}
