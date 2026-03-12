import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { AreaData, ColoData, CurrentLocation, GeoJSONData, LocationData } from '@/types'
import { watchDeep } from '@vueuse/core'
import { computed, ref, shallowRef } from 'vue'
import { useAPI } from '@/utils/api'
import { useDashboardRealtimeStore } from '../realtime'

interface RawLocationData {
  latitude: number
  longitude: number
  count: string | number
}

export interface GlobeDataState {
  countries: ShallowRef<GeoJSONData>
  locations: ShallowRef<LocationData[]>
  colos: ShallowRef<Record<string, ColoData>>
  currentLocation: Ref<CurrentLocation>
  countryStats: ShallowRef<Map<string, number>>
  highest: ComputedRef<number>
  maxCountryVisits: ComputedRef<number>
}

export function useGlobeData() {
  const realtimeStore = useDashboardRealtimeStore()

  const countries = shallowRef<GeoJSONData>({ features: [] })
  const locations = shallowRef<LocationData[]>([])
  const colos = shallowRef<Record<string, ColoData>>({})
  const currentLocation = ref<CurrentLocation>({})
  const countryStats = shallowRef<Map<string, number>>(new Map())

  // Request version for race condition control
  let requestVersion = 0

  const getBaseQuery = () => ({
    startAt: realtimeStore.timeRange.startAt,
    endAt: realtimeStore.timeRange.endAt,
    ...realtimeStore.filters,
  })

  const nextRequestVersion = () => ++requestVersion
  const isStale = (version: number) => version !== requestVersion

  const highest = computed(() => Math.max(...locations.value.map(l => l.count), 1))
  const maxCountryVisits = computed(() => Math.max(...countryStats.value.values(), 1))

  async function getGlobeJSON() {
    const data = await $fetch('/countries.geojson')
    countries.value = data as GeoJSONData
  }

  async function getColosJSON() {
    const data = await $fetch('/colos.json')
    colos.value = data as Record<string, ColoData>
  }

  async function getCurrentLocation() {
    const data = await useAPI<CurrentLocation>('/api/location')
    currentLocation.value = data
  }

  async function getCountryStats(version: number) {
    const result = await useAPI<{ data: AreaData[] }>('/api/stats/metrics', {
      query: {
        type: 'country',
        ...getBaseQuery(),
      },
    })

    // Discard stale response
    if (isStale(version))
      return

    const statsMap = new Map<string, number>()
    if (Array.isArray(result.data)) {
      result.data.forEach((item) => {
        statsMap.set(item.name, item.count)
      })
    }
    countryStats.value = statsMap
  }

  async function getLiveLocations(version: number) {
    const result = await useAPI<{ data: RawLocationData[] }>('/api/logs/locations', {
      query: {
        ...getBaseQuery(),
      },
    })

    // Discard stale response
    if (isStale(version))
      return

    locations.value = result.data?.map(e => ({
      lat: e.latitude,
      lng: e.longitude,
      count: +e.count,
    })) || []
  }

  async function init() {
    const version = nextRequestVersion()
    await Promise.all([
      getLiveLocations(version),
      getCurrentLocation(),
      getGlobeJSON(),
      getColosJSON(),
      getCountryStats(version),
    ])
  }

  async function refresh() {
    const version = nextRequestVersion()
    await Promise.all([
      getLiveLocations(version),
      getCountryStats(version),
    ])
  }

  // Watch store changes
  watchDeep([() => realtimeStore.timeRange, () => realtimeStore.filters], refresh)

  return {
    countries,
    locations,
    colos,
    currentLocation,
    countryStats,
    highest,
    maxCountryVisits,
    init,
    refresh,
  }
}
