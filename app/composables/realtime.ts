import type { DashboardSlugFilters, RealtimeQueryState } from '@/utils/dashboard-query'
import { ref } from 'vue'
import { defineStore } from '#imports'
import { toSlugFilters } from '@/utils/dashboard-query'
import { computeRealtimeRange } from '@/utils/time'

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const timeRange = ref({ startAt: 0, endAt: 0 })
  const timeName = ref<RealtimeQueryState['window']>('last-1h')
  const filters = ref<DashboardSlugFilters>({})

  function selectPreset(name: RealtimeQueryState['window']) {
    timeName.value = name
    const [start, end] = computeRealtimeRange(name)
    timeRange.value = { startAt: start, endAt: end }
  }

  function updateFilter(type: string, value: string) {
    if (type !== 'slug')
      return

    filters.value = toSlugFilters(value)
  }

  function clearFilters() {
    filters.value = {}
  }

  function applyRouteState(state: RealtimeQueryState) {
    selectPreset(state.window)
    filters.value = toSlugFilters(state.slugs)
  }

  return {
    timeRange,
    timeName,
    filters,
    selectPreset,
    updateFilter,
    clearFilters,
    applyRouteState,
  }
})
