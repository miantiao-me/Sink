export function getCountryCodes() {
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
  const result: string[] = []

  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j)

      if (regionNames.of(code) !== code) {
        result.push(code)
      }
    }
  }

  return result
}

function getDisplayName(code: string, locale: string, type: 'region' | 'language'): string {
  if (!code || typeof Intl === 'undefined')
    return code

  try {
    const displayNames = new Intl.DisplayNames([locale], { type })
    return displayNames.of(code) ?? code
  }
  catch {
    return code
  }
}

/**
 * Get region/country display name
 * @param code - ISO 3166-1 alpha-2 country code (e.g., 'CN', 'JP', 'US')
 * @param locale - Locale string (e.g., 'zh-CN', 'en')
 */
export function getRegionName(code: string, locale: string): string {
  return getDisplayName(code, locale, 'region')
}

/**
 * Get language display name
 * @param code - Language code (e.g., 'zh', 'en', 'ja')
 * @param locale - Locale string
 */
export function getLanguageName(code: string, locale: string): string {
  return getDisplayName(code, locale, 'language')
}
