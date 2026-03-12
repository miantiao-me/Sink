/**
 * Get region/country display name
 * @param code - ISO 3166-1 alpha-2 country code (e.g., 'CN', 'JP', 'US')
 * @param locale - Locale string (e.g., 'zh-CN', 'en')
 */
export function getRegionName(code: string, locale: string): string {
  if (!code || typeof Intl === 'undefined')
    return code
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return displayNames.of(code) ?? code
  }
  catch {
    return code
  }
}

/**
 * Get language display name
 * @param code - Language code (e.g., 'zh', 'en', 'ja')
 * @param locale - Locale string
 */
export function getLanguageName(code: string, locale: string): string {
  if (!code || typeof Intl === 'undefined')
    return code
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' })
    return displayNames.of(code) ?? code
  }
  catch {
    return code
  }
}
