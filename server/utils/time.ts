import type { H3Event } from 'h3'

export function getExpiration(event: H3Event, expiration: number | undefined) {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    const { previewTTL } = useAppConfig()
    const previewExpiration = Math.floor(Date.now() / 1000) + previewTTL
    if (!expiration || expiration > previewExpiration)
      expiration = Math.floor(Date.now() / 1000) + previewTTL
  }

  return expiration
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  }
  catch {
    return false
  }
}

export function getSafeTimezone(tz: string): string {
  return isValidTimezone(tz) ? tz : 'Etc/UTC'
}
