export interface UtmFields {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

const UTM_PARAM_MAP = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  term: 'utm_term',
  content: 'utm_content',
} as const

const UTM_KEYS = Object.keys(UTM_PARAM_MAP) as Array<keyof UtmFields>

function normalizeUtmValue(value?: string | null) {
  if (value === null || value === undefined)
    return undefined

  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

export function normalizeUtmFields(utm?: UtmFields) {
  if (!utm)
    return undefined

  const normalized: UtmFields = {}
  for (const key of UTM_KEYS) {
    const value = normalizeUtmValue(utm[key])
    if (value)
      normalized[key] = value
  }

  return Object.keys(normalized).length ? normalized : undefined
}

export function extractUtmFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    const extracted: UtmFields = {
      source: normalizeUtmValue(parsed.searchParams.get(UTM_PARAM_MAP.source)),
      medium: normalizeUtmValue(parsed.searchParams.get(UTM_PARAM_MAP.medium)),
      campaign: normalizeUtmValue(parsed.searchParams.get(UTM_PARAM_MAP.campaign)),
      term: normalizeUtmValue(parsed.searchParams.get(UTM_PARAM_MAP.term)),
      content: normalizeUtmValue(parsed.searchParams.get(UTM_PARAM_MAP.content)),
    }

    return normalizeUtmFields(extracted)
  }
  catch {
    return undefined
  }
}

export function applyUtmToUrl(url: string, utm?: UtmFields) {
  const normalized = normalizeUtmFields(utm)
  if (!normalized)
    return url

  const parsed = new URL(url)

  for (const param of Object.values(UTM_PARAM_MAP))
    parsed.searchParams.delete(param)

  for (const key of UTM_KEYS) {
    const value = normalized[key]
    if (value)
      parsed.searchParams.set(UTM_PARAM_MAP[key], value)
  }

  return parsed.toString()
}

export function stripUtmFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    for (const param of Object.values(UTM_PARAM_MAP))
      parsed.searchParams.delete(param)
    return parsed.toString()
  }
  catch {
    return url
  }
}
