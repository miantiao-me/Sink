import { defineStore } from '#imports'
import { getLocalTimeZone, now, startOfMonth, startOfWeek } from '@internationalized/date'
import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'
import { ref, watch } from 'vue'
import { date2unix, getLocale } from '@/utils/time'

function computeDateRange(name: string): [number, number] {
  const tz = getLocalTimeZone()
  const currentTime = now(tz)

  const presets: Record<string, () => [number, number]> = {
    'today': () => [date2unix(currentTime, 'start'), date2unix(currentTime)],
    'last-24h': () => [date2unix(currentTime.subtract({ hours: 24 })), date2unix(currentTime)],
    'this-week': () => [date2unix(startOfWeek(currentTime, getLocale()), 'start'), date2unix(currentTime)],
    'last-7d': () => [date2unix(currentTime.subtract({ days: 7 })), date2unix(currentTime)],
    'this-month': () => [date2unix(startOfMonth(currentTime), 'start'), date2unix(currentTime)],
    'last-30d': () => [date2unix(currentTime.subtract({ days: 30 })), date2unix(currentTime)],
    'last-90d': () => [date2unix(currentTime.subtract({ days: 90 })), date2unix(currentTime)],
  }

  const getRange = presets[name]
  return getRange ? getRange() : presets['last-7d']!()
}

export const useDashboardAnalysisStore = defineStore('dashboard-analysis', () => {
  const searchParams = useUrlSearchParams('history')
  let initialized = false

  const dateRange = ref({ startAt: 0, endAt: 0 })
  const datePreset = ref<string | null>('last-7d')
  const filters = ref<Record<string, string>>({})

  function updateDateRange(range: [number, number]) {
    dateRange.value.startAt = range[0]
    dateRange.value.endAt = range[1]
  }

  function selectPreset(name: string) {
    datePreset.value = name
    updateDateRange(computeDateRange(name))
  }

  function updateFilter(type: string, value: string) {
    filters.value[type] = value
  }

  function clearFilters() {
    filters.value = {}
  }

  // URL > Store > Default, then enable URL sync
  function init() {
    if (initialized)
      return

    // Restore from URL
    // Custom time range takes priority over preset
    if (searchParams.time) {
      const time = safeDestr<{ startAt: number, endAt: number }>(searchParams.time)
      if (Number.isFinite(time?.startAt) && Number.isFinite(time?.endAt)) {
        dateRange.value.startAt = time.startAt
        dateRange.value.endAt = time.endAt
        datePreset.value = null
      }
    }
    else if (searchParams.preset) {
      datePreset.value = searchParams.preset as string
    }
    if (searchParams.filters) {
      const restored = safeDestr<Record<string, string>>(searchParams.filters)
      if (restored) {
        Object.assign(filters.value, restored)
      }
    }

    // Apply default date range from preset if not restored
    if (dateRange.value.startAt === 0 && datePreset.value) {
      const [start, end] = computeDateRange(datePreset.value)
      dateRange.value.startAt = start
      dateRange.value.endAt = end
    }

    initialized = true
  }

  // Store → URL sync (only after init)
  watch(dateRange, () => {
    if (!initialized)
      return
    searchParams.time = JSON.stringify(dateRange.value)
  }, { deep: true })

  watch(datePreset, (val) => {
    if (!initialized)
      return
    searchParams.preset = val || ''
  })

  watch(filters, (val) => {
    if (!initialized)
      return
    searchParams.filters = Object.keys(val).length ? JSON.stringify(val) : ''
  }, { deep: true })

  return {
    dateRange,
    datePreset,
    filters,
    updateDateRange,
    selectPreset,
    updateFilter,
    clearFilters,
    init,
  }
})
