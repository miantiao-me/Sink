import { defineStore, useI18n } from '#imports'
import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'
import { ref, watch } from 'vue'
import { computeDateRange } from '@/utils/time'

export const useDashboardAnalysisStore = defineStore('dashboard-analysis', () => {
  const { locale } = useI18n()
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
    updateDateRange(computeDateRange(name, locale.value))
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
      const [start, end] = computeDateRange(datePreset.value, locale.value)
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
