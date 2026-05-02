import { defineStore } from '#imports'
import { getLocalTimeZone, now } from '@internationalized/date'
import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'
import { ref, watch } from 'vue'
import { date2unix } from '@/utils/time'

const TIME_PRESETS: Record<string, { minutes?: number, hours?: number } | 'today'> = {
  'today': 'today',
  'last-5m': { minutes: 5 },
  'last-10m': { minutes: 10 },
  'last-30m': { minutes: 30 },
  'last-1h': { hours: 1 },
  'last-6h': { hours: 6 },
  'last-12h': { hours: 12 },
  'last-24h': { hours: 24 },
}

function computeTimeRange(name: string): [number, number] {
  const tz = getLocalTimeZone()
  const currentTime = now(tz)
  const preset = TIME_PRESETS[name] ?? { hours: 1 }

  if (preset === 'today') {
    return [date2unix(currentTime, 'start'), date2unix(currentTime)]
  }

  return [date2unix(currentTime.subtract(preset)), date2unix(currentTime)]
}

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const searchParams = useUrlSearchParams('history')
  let initialized = false

  const timeRange = ref({ startAt: 0, endAt: 0 })
  const timeName = ref('last-1h')
  const filters = ref<Record<string, string>>({})

  function selectPreset(name: string) {
    timeName.value = name
    const [start, end] = computeTimeRange(name)
    timeRange.value.startAt = start
    timeRange.value.endAt = end
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
    if (searchParams.time && typeof searchParams.time === 'string') {
      timeName.value = searchParams.time
    }
    if (searchParams.filters && typeof searchParams.filters === 'string') {
      const restored = safeDestr<Record<string, string>>(searchParams.filters)
      if (restored) {
        Object.assign(filters.value, restored)
      }
    }

    // Apply default time range from preset if not restored
    if (timeRange.value.startAt === 0) {
      const [start, end] = computeTimeRange(timeName.value)
      timeRange.value.startAt = start
      timeRange.value.endAt = end
    }

    initialized = true
  }

  // Store → URL sync (only after init)
  watch(timeName, (val) => {
    if (!initialized)
      return
    searchParams.time = val
  })

  watch(filters, (val) => {
    if (!initialized)
      return
    searchParams.filters = Object.keys(val).length ? JSON.stringify(val) : ''
  }, { deep: true })

  return {
    timeRange,
    timeName,
    filters,
    selectPreset,
    updateFilter,
    clearFilters,
    init,
  }
})
