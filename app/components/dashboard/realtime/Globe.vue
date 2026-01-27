<script setup lang="ts">
import type { ColoData, CurrentLocation, GeoJSONData, LocationData } from '@/types'
import { useDebounceFn, useElementSize } from '@vueuse/core'
import { scaleSequentialSqrt } from 'd3-scale'
import { interpolateYlOrRd } from 'd3-scale-chromatic'
import Globe from 'globe.gl'
import { MeshPhongMaterial } from 'three'

const realtimeStore = useDashboardRealtimeStore()

const countries = ref<GeoJSONData>({ features: [] })
const locations = ref<LocationData[]>([])
const colos = ref<Record<string, ColoData>>({})
const currentLocation = ref<CurrentLocation>({})

const el = useTemplateRef('globeEl')
const { width, height } = useElementSize(el)
const size = computed(() => ({
  width: width.value,
  height: height.value || width.value,
}))

const globeEl = ref()
const hexAltitude = ref(0.001)
const highest = computed(() => {
  return locations.value.reduce((acc, curr) => Math.max(acc, curr.count), 0) || 1
})

let globe = null
const pendingTimers = []

function trackTimer(id) {
  pendingTimers.push(id)
  return id
}

function clearAllTimers() {
  pendingTimers.forEach(id => clearTimeout(id))
  pendingTimers.length = 0
}

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

interface RawLocationData {
  latitude: number
  longitude: number
  count: string | number
}

async function getLiveLocations() {
  const result = await useAPI<{ data: RawLocationData[] }>('/api/logs/locations', {
    query: {
      startAt: realtimeStore.timeRange.startAt,
      endAt: realtimeStore.timeRange.endAt,
      ...realtimeStore.filters,
    },
  })

  locations.value = result.data?.map(e => ({
    lat: e.latitude,
    lng: e.longitude,
    count: +e.count,
  })) || []
}

function trafficEvent({ props }, { delay = 0 }) {
  const arc = {
    startLat: props.item.latitude,
    startLng: props.item.longitude,
    endLat: colos.value[props.item.COLO]?.lat,
    endLng: colos.value[props.item.COLO]?.lon,
    color: 'darkOrange',
    arcAltitude: 0.2,
  }
  console.info(`from ${props.item.city}(${arc.startLat}, ${arc.startLng}) to ${props.item.COLO}(${arc.endLat}, ${arc.endLng})`)
  const isNear = Math.abs(arc.endLat - arc.startLat) < 5 && Math.abs(arc.endLng - arc.startLng) < 5
  if (isNear) {
    console.info(`from ${props.item.city} to ${props.item.COLO} is near, skip`)
    return
  }
  const random = Math.random()
  globe.arcsData([arc])
    .arcColor('color')
    .arcDashLength(() => random)
    .arcDashGap(() => 1 - random)
    .arcDashAnimateTime(delay * 2)
    .ringRepeatPeriod(delay * 2)

  const srcRing = { lat: arc.startLat, lng: arc.startLng }
  globe.ringsData([...(globe.ringsData() as object[]), srcRing])
  trackTimer(setTimeout(() => globe.ringsData((globe.ringsData() as object[]).filter(r => r !== srcRing)), delay * 2))

  trackTimer(setTimeout(() => {
    const targetRing = { lat: arc.endLat, lng: arc.endLng }
    globe.ringsData([...(globe.ringsData() as object[]), targetRing])
    trackTimer(setTimeout(() => globe.ringsData((globe.ringsData() as object[]).filter(r => r !== targetRing)), delay * 2))
  }, delay * 2))

  trackTimer(setTimeout(() => {
    globe.arcsData([])
  }, delay * 2))
}

function createWeightColor() {
  const domainMax = highest.value * 3
  return scaleSequentialSqrt(interpolateYlOrRd).domain([0, domainMax])
}

const debouncedControlsEnd = useDebounceFn(() => {
  if (!globe)
    return
  const distance = Math.round(globe.controls().getDistance())
  let nextAlt = 0.005
  if (distance <= 300)
    nextAlt = 0.001
  else if (distance >= 600)
    nextAlt = 0.02
  if (nextAlt !== hexAltitude.value)
    hexAltitude.value = nextAlt
}, 200)

function initGlobe() {
  const weightColor = createWeightColor()

  globe = new Globe(globeEl.value)
    .width(size.value.width)
    .height(size.value.height)
    // .globeOffset([width.value > 768 ? -100 : 0, width.value > 768 ? 0 : 100])
    .atmosphereColor('rgb(170, 170, 200)')
    .globeMaterial(new MeshPhongMaterial({
      color: 'rgb(228, 228, 231)',
      transparent: false,
      opacity: 1,
    }))
    .backgroundColor('rgba(0,0,0,0)')
    .hexPolygonsData(countries.value.features as object[])
    .hexPolygonResolution(3)
    .hexPolygonMargin(0.2)
    .hexBinResolution(3)
    .hexBinPointsData(locations.value)
    .hexPolygonAltitude(() => hexAltitude.value)
    .hexBinMerge(true)
    .hexBinPointWeight('count')
    .hexPolygonColor(() => `rgba(54, 211, 153, ${Math.random() / 1.5 + 0.5})`)
    .hexTopColor(d => weightColor(d.sumWeight))
    .hexSideColor(d => weightColor(d.sumWeight))
    .ringColor(() => t => `rgba(255,100,50,${1 - t})`)
    .ringMaxRadius(3)
    .ringPropagationSpeed(3)
    .onGlobeReady(() => {
      globe.pointOfView({ lat: currentLocation.value.latitude, lng: currentLocation.value.longitude, altitude: width.value > 768 ? 2 : 3 })
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.3
    })

  globe.controls().addEventListener('end', debouncedControlsEnd)

  globalTrafficEvent.on(trafficEvent)
}

function stopRotation() {
  if (globe) {
    globe.controls().autoRotate = false
  }
}

watch([() => realtimeStore.timeRange, () => realtimeStore.filters], getLiveLocations, {
  deep: true,
})

watch([width, height], () => {
  if (globe) {
    globe.width(size.value.width)
    globe.height(size.value.height)
  }
})

watch(locations, () => {
  if (globe) {
    const weightColor = createWeightColor()
    globe.hexBinPointsData(locations.value)
    globe.hexTopColor(d => weightColor(d.sumWeight))
    globe.hexSideColor(d => weightColor(d.sumWeight))
  }
})

onMounted(async () => {
  await Promise.all([
    getLiveLocations(),
    getCurrentLocation(),
    getGlobeJSON(),
    getColosJSON(),
  ])
  initGlobe()
})

onBeforeUnmount(() => {
  clearAllTimers()
  globalTrafficEvent.off(trafficEvent)
  if (globe) {
    globe.controls().removeEventListener('end', debouncedControlsEnd)
    globe._destructor?.()
    globe = null
  }
})
</script>

<template>
  <div ref="globeEl" class="h-full w-full" @mousedown="stopRotation" />
</template>
