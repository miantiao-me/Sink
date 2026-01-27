import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'

export const useDashboardAnalysisStore = defineStore('dashboard-analysis', () => {
  const searchParams = useUrlSearchParams('history')

  const dateRange = ref({
    startAt: 0,
    endAt: 0,
  })
  const filters = ref<Record<string, string>>({})

  function setDateRange(range: [number, number]) {
    dateRange.value.startAt = range[0]
    dateRange.value.endAt = range[1]
  }

  function updateDateRange(range: [number, number]) {
    setDateRange(range)
    searchParams.time = JSON.stringify(dateRange.value)
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
      if (searchParams.time) {
        const time = safeDestr<{ startAt: number, endAt: number }>(searchParams.time)
        if (Number.isFinite(time?.startAt) && Number.isFinite(time?.endAt)) {
          dateRange.value.startAt = time.startAt
          dateRange.value.endAt = time.endAt
        }
      }
      if (searchParams.filters) {
        const restored = safeDestr<Record<string, string>>(searchParams.filters)
        if (restored) {
          Object.entries(restored).forEach(([key, value]) => {
            filters.value[key] = String(value)
          })
        }
      }
    }
    catch (error) {
      console.error('Failed to restore analysis searchParams', error)
    }
  }

  return {
    dateRange,
    filters,
    setDateRange,
    updateDateRange,
    updateFilter,
    clearFilters,
    restoreFromUrl,
  }
})
