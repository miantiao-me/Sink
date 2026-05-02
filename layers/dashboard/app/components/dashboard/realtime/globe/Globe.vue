<script setup lang="ts">
import { useGlobeColors, useGlobeData, useWebGLGlobe } from '#layers/dashboard/app/composables/globe'
import { useDebounceFn, useElementSize } from '@vueuse/core'

const trafficEventBus = useTrafficEventBus()

const containerRef = useTemplateRef('containerRef')
const canvasRef = useTemplateRef('canvasRef')
const { width, height } = useElementSize(containerRef)

const globeData = useGlobeData()
const { arcColor, colors, countryColorTiers, heatmapColorTiers } = useGlobeColors()

const globe = useWebGLGlobe({
  canvasRef,
  width,
  height,
  countries: globeData.countries,
  locations: globeData.locations,
  countryStats: globeData.countryStats,
  maxCountryVisits: globeData.maxCountryVisits,
  highest: globeData.highest,
  colors,
  countryColorTiers,
  heatmapColorTiers,
})

const trafficEvent = useTrafficEvent({
  colos: globeData.colos,
  arcColor,
  globe: {
    isReady: () => globe.isReady.value,
    drawArc: globe.drawArc,
    drawRipple: globe.drawRipple,
  },
})

// Rebuild texture when data/colors change
watch([globeData.countryStats, countryColorTiers, heatmapColorTiers, colors, globeData.countries, globeData.locations], () => {
  globe.updateCountryTexture()
})

const handleResize = useDebounceFn(() => {
  globe.updateCanvasSize()
}, 100)
watch([width, height], handleResize)

onMounted(async () => {
  await globeData.init()

  const glInitialized = await globe.init()
  if (!glInitialized) {
    console.error('Failed to initialize WebGL')
    return
  }

  globe.updateCanvasSize()
  await globe.updateCountryTexture()

  const { latitude, longitude } = globeData.currentLocation.value
  const parsedLat = Number(latitude)
  const parsedLng = Number(longitude)
  const targetLat = Number.isFinite(parsedLat) ? parsedLat : 0
  const targetLng = Number.isFinite(parsedLng) ? parsedLng : 0
  globe.setPointOfView(targetLat, targetLng, true)

  globe.startRenderLoop()
  trafficEventBus.on(trafficEvent.handleTrafficEvent)
})

onBeforeUnmount(() => {
  globe.stopRenderLoop()
  globe.destroy()
  trafficEventBus.off(trafficEvent.handleTrafficEvent)
  trafficEvent.cleanup()
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full"
    @mousedown="globe.stopAutoRotate"
    @touchstart="globe.stopAutoRotate"
  >
    <canvas ref="canvasRef" class="absolute inset-0" />
  </div>
</template>
