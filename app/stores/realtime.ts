import { getLocalTimeZone, now } from '@internationalized/date'
import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const searchParams = useUrlSearchParams('history')

  const timeRange = ref({
    startAt: 0,
    endAt: 0,
  })
  const filters = ref<Record<string, string>>({})
  const timeName = ref('last-1h')

  function updateTimeRange(range: [number, number], name?: string) {
    timeRange.value.startAt = range[0]
    timeRange.value.endAt = range[1]
    if (name) {
      timeName.value = name
      searchParams.time = name
    }
  }

  function updateFilter(type: string, value: string) {
    filters.value[type] = value
    searchParams.filters = JSON.stringify(filters.value)
  }

  function clearFilters() {
    filters.value = {}
    searchParams.filters = ''
  }

  function restoreFromUrl() {
    try {
      if (searchParams.time && typeof searchParams.time === 'string') {
        timeName.value = searchParams.time
      }

      if (searchParams.filters && typeof searchParams.filters === 'string') {
        const restored = safeDestr<Record<string, string>>(searchParams.filters)
        if (restored) {
          Object.entries(restored).forEach(([key, value]) => {
            filters.value[key] = String(value)
          })
        }
      }
    }
    catch (error) {
      console.error('Failed to restore realtime searchParams', error)
    }
  }

  function initDefaultTimeRange() {
    if (timeRange.value.startAt === 0) {
      const tz = getLocalTimeZone()
      const range = computeTimeRangeFromName(timeName.value, tz)
      timeRange.value.startAt = range[0]
      timeRange.value.endAt = range[1]
    }
  }

  return {
    timeRange,
    timeName,
    filters,
    updateTimeRange,
    updateFilter,
    clearFilters,
    restoreFromUrl,
    initDefaultTimeRange,
  }
})

function computeTimeRangeFromName(name: string, tz: string): [number, number] {
  const currentTime = now(tz)
  switch (name) {
    case 'today':
      return [date2unix(currentTime, 'start'), date2unix(currentTime)]
    case 'last-5m':
      return [date2unix(currentTime.subtract({ minutes: 5 })), date2unix(currentTime)]
    case 'last-10m':
      return [date2unix(currentTime.subtract({ minutes: 10 })), date2unix(currentTime)]
    case 'last-30m':
      return [date2unix(currentTime.subtract({ minutes: 30 })), date2unix(currentTime)]
    case 'last-1h':
      return [date2unix(currentTime.subtract({ hours: 1 })), date2unix(currentTime)]
    case 'last-6h':
      return [date2unix(currentTime.subtract({ hours: 6 })), date2unix(currentTime)]
    case 'last-12h':
      return [date2unix(currentTime.subtract({ hours: 12 })), date2unix(currentTime)]
    case 'last-24h':
      return [date2unix(currentTime.subtract({ hours: 24 })), date2unix(currentTime)]
    default:
      return [date2unix(currentTime.subtract({ hours: 1 })), date2unix(currentTime)]
  }
}
