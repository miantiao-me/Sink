export type DashboardQueryValue = string | null | (string | null)[] | undefined
export type DashboardQuery = Record<string, DashboardQueryValue>
export type DashboardQueryOutput = Record<string, string | string[]>

export const ANALYSIS_DATE_PRESETS = [
  'today',
  'last-24h',
  'this-week',
  'last-7d',
  'this-month',
  'last-30d',
  'last-90d',
] as const

export const REALTIME_WINDOWS = [
  'today',
  'last-5m',
  'last-10m',
  'last-30m',
  'last-1h',
  'last-6h',
  'last-12h',
  'last-24h',
] as const

export const LINK_SORTS = ['newest', 'oldest', 'az', 'za'] as const
export const LINK_STATUSES = ['active', 'expired'] as const
export const ANALYSIS_VIEWS = ['trend', 'heatmap'] as const
export const HEATMAP_METRICS = ['visits', 'visitors'] as const

export type AnalysisDatePreset = typeof ANALYSIS_DATE_PRESETS[number]
export type RealtimeWindow = typeof REALTIME_WINDOWS[number]
export type DashboardLinkSort = typeof LINK_SORTS[number]
export type DashboardLinkStatusQuery = typeof LINK_STATUSES[number]
export type AnalysisView = typeof ANALYSIS_VIEWS[number]
export type HeatmapMetric = typeof HEATMAP_METRICS[number]

export interface AnalysisQueryState {
  datePreset: AnalysisDatePreset | null
  dateRange?: [number, number]
  slugs: string[]
  view: AnalysisView
  metric: HeatmapMetric
}

export interface RealtimeQueryState {
  window: RealtimeWindow
  slugs: string[]
}

export interface LinksQueryState {
  status: DashboardLinkStatusQuery
  sort: DashboardLinkSort
  tag?: string
}

export interface DashboardSlugFilters {
  slug?: string
}

export function toSlugFilters(value: string | string[]): DashboardSlugFilters {
  const values = Array.isArray(value) ? value : [value]
  const slugs = [...new Set(values.flatMap(item => item.split(',')).map(slug => slug.trim()).filter(Boolean))]
  return slugs.length ? { slug: slugs.join(',') } : {}
}

const DEFAULT_ANALYSIS_PRESET: AnalysisDatePreset = 'last-7d'
const DEFAULT_REALTIME_WINDOW: RealtimeWindow = 'last-1h'
const DEFAULT_LINK_STATUS: DashboardLinkStatusQuery = 'active'
const DEFAULT_LINK_SORT: DashboardLinkSort = 'newest'
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

function firstQueryValue(value: DashboardQueryValue): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && candidate ? candidate : undefined
}

function queryValues(value: DashboardQueryValue): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.filter((item): item is string => typeof item === 'string')
}

function comparableQueryValues(value: DashboardQueryValue): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values
    .filter((item): item is string | null => item !== undefined)
    .map(item => item === null ? 'null:' : `string:${item}`)
}

function enumValue<const T extends readonly string[]>(value: DashboardQueryValue, values: T): T[number] | undefined {
  const candidate = firstQueryValue(value)
  return candidate && values.includes(candidate) ? candidate as T[number] : undefined
}

function unixTimestamp(value: DashboardQueryValue): number | undefined {
  const candidate = firstQueryValue(value)
  if (!candidate || !/^\d+$/.test(candidate))
    return undefined

  const timestamp = Number(candidate)
  return Number.isSafeInteger(timestamp) ? timestamp : undefined
}

function normalizeSlugs(values: string[]): string[] {
  return [...new Set(
    values
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(value => SLUG_PATTERN.test(value)),
  )].sort((a, b) => a.localeCompare(b))
}

export function parseAnalysisQuery(query: DashboardQuery, allowSlugs = true): AnalysisQueryState {
  const from = unixTimestamp(query.from)
  const to = unixTimestamp(query.to)
  const customRange = from !== undefined && to !== undefined && from <= to
    ? [from, to] as [number, number]
    : undefined
  const datePreset = customRange
    ? null
    : enumValue(query.range, ANALYSIS_DATE_PRESETS)
      ?? DEFAULT_ANALYSIS_PRESET
  const routeSlugs = normalizeSlugs(queryValues(query.slugs))

  return {
    datePreset,
    dateRange: customRange,
    slugs: allowSlugs ? routeSlugs : [],
    view: enumValue(query.view, ANALYSIS_VIEWS) ?? 'trend',
    metric: enumValue(query.metric, HEATMAP_METRICS) ?? 'visits',
  }
}

export function serializeAnalysisQuery(
  state: AnalysisQueryState,
  options: { slug?: string, allowSlugs?: boolean } = {},
): DashboardQueryOutput {
  const query: DashboardQueryOutput = {}
  if (options.slug)
    query.slug = options.slug

  if (state.datePreset) {
    if (state.datePreset !== DEFAULT_ANALYSIS_PRESET)
      query.range = state.datePreset
  }
  else if (state.dateRange) {
    query.from = String(state.dateRange[0])
    query.to = String(state.dateRange[1])
  }

  if (options.allowSlugs !== false && state.slugs.length)
    query.slugs = normalizeSlugs(state.slugs)
  if (state.view !== 'trend')
    query.view = state.view
  if (state.view === 'heatmap' && state.metric !== 'visits')
    query.metric = state.metric
  return query
}

export function parseRealtimeQuery(query: DashboardQuery): RealtimeQueryState {
  const routeSlugs = normalizeSlugs(queryValues(query.slugs))
  return {
    window: enumValue(query.window, REALTIME_WINDOWS) ?? DEFAULT_REALTIME_WINDOW,
    slugs: routeSlugs,
  }
}

export function serializeRealtimeQuery(state: RealtimeQueryState): DashboardQueryOutput {
  const query: DashboardQueryOutput = {}
  if (state.window !== DEFAULT_REALTIME_WINDOW)
    query.window = state.window
  if (state.slugs.length)
    query.slugs = normalizeSlugs(state.slugs)
  return query
}

export function parseLinksQuery(query: DashboardQuery): LinksQueryState {
  const tag = firstQueryValue(query.tag)?.trim().toLowerCase()
  return {
    status: enumValue(query.status, LINK_STATUSES) ?? DEFAULT_LINK_STATUS,
    sort: enumValue(query.sort, LINK_SORTS) ?? DEFAULT_LINK_SORT,
    tag: tag && tag.length <= 32 ? tag : undefined,
  }
}

export function serializeLinksQuery(state: LinksQueryState): DashboardQueryOutput {
  const query: DashboardQueryOutput = {}
  if (state.status !== DEFAULT_LINK_STATUS)
    query.status = state.status
  if (state.sort !== DEFAULT_LINK_SORT)
    query.sort = state.sort
  if (state.tag)
    query.tag = state.tag
  return query
}

export function parseDashboardSlug(value: DashboardQueryValue): string | undefined {
  const slug = firstQueryValue(value)?.trim()
  return slug && SLUG_PATTERN.test(slug) ? slug : undefined
}

export function isAnalysisDatePreset(value: unknown): value is AnalysisDatePreset {
  return typeof value === 'string' && ANALYSIS_DATE_PRESETS.includes(value as AnalysisDatePreset)
}

export function isRealtimeWindow(value: unknown): value is RealtimeWindow {
  return typeof value === 'string' && REALTIME_WINDOWS.includes(value as RealtimeWindow)
}

export function isSameDashboardQuery(query: DashboardQuery, expected: DashboardQueryOutput): boolean {
  const actualEntries = Object.entries(query)
    .flatMap(([key, value]) => comparableQueryValues(value).map(item => [key, item] as const))
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
  const expectedEntries = Object.entries(expected)
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(item => [key, `string:${item}`] as const))
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
  return JSON.stringify(actualEntries) === JSON.stringify(expectedEntries)
}
