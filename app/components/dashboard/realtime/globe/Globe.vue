<script setup lang="ts">
import { RotateCcw, ZoomIn, ZoomOut } from '@lucide/vue'
import { useDevicePixelRatio, useElementSize, useEventListener, usePreferredReducedMotion } from '@vueuse/core'
import { useGlobeColors, useGlobeData, useWebGLGlobe } from '@/composables/globe'

const { t } = useI18n()
const trafficEventBus = useTrafficEventBus()

const containerRef = useTemplateRef('containerRef')
const canvasRef = useTemplateRef('canvasRef')
const { width, height } = useElementSize(containerRef)
const { pixelRatio } = useDevicePixelRatio()
const preferredMotion = usePreferredReducedMotion()
const reducedMotion = computed(() => preferredMotion.value === 'reduce')
const isPaused = inject(REALTIME_PAUSED_KEY, shallowRef(false))
const instructionsId = useId()
const isLoading = shallowRef(true)
const hasLoaded = shallowRef(false)
const hasError = shallowRef(false)
const isUnsupported = shallowRef(false)
const isContextLost = shallowRef(false)
let disposed = false
let initializationController: AbortController | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let textureResizePending = false
let trafficListening = false

const globeData = useGlobeData()
const { arcColor, colors, countryColorTiers, heatmapColorTiers } = useGlobeColors()

const globe = useWebGLGlobe({
  canvasRef,
  width,
  height,
  pixelRatio,
  countries: globeData.countries,
  locations: globeData.locations,
  countryStats: globeData.countryStats,
  maxCountryVisits: globeData.maxCountryVisits,
  highest: globeData.highest,
  colors,
  countryColorTiers,
  heatmapColorTiers,
  reducedMotion,
  paused: isPaused,
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

function handleTextureError(error: unknown) {
  if (disposed)
    return
  console.error('Failed to update globe texture', error)
  isLoading.value = false
  hasError.value = true
}

const stopTextureWatch = watch([globeData.countryStats, countryColorTiers, heatmapColorTiers, colors, globeData.countries, globeData.locations], () => {
  if (isPaused.value)
    return
  void globe.updateCountryTexture().catch(handleTextureError)
})

const stopDataErrorWatch = watch(globeData.error, (value) => {
  if (!disposed) {
    hasError.value = value
    if (value)
      isLoading.value = false
  }
})

const stopResizeWatch = watch([width, height, pixelRatio], ([nextWidth, nextHeight], [previousWidth, previousHeight]) => {
  textureResizePending ||= nextWidth !== previousWidth || nextHeight !== previousHeight
  if (resizeTimer)
    clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (!disposed) {
      globe.updateCanvasSize()
      if (textureResizePending && !isPaused.value)
        void globe.updateCountryTexture().catch(handleTextureError)
    }
    textureResizePending = false
  }, 100)
})

async function initialize() {
  initializationController?.abort()
  trafficEventBus.setReady(false)
  globe.destroy()
  trafficEvent.cleanup()
  if (trafficListening) {
    trafficEventBus.off(trafficEvent.handleTrafficEvent)
    trafficListening = false
  }

  const controller = new AbortController()
  initializationController = controller
  isLoading.value = true
  hasError.value = false
  isUnsupported.value = false

  try {
    await globeData.init(controller.signal)
    if (disposed || controller.signal.aborted)
      return

    const glInitialized = await globe.init(controller.signal)
    if (disposed || controller.signal.aborted)
      return
    if (!glInitialized)
      throw new Error('Failed to initialize WebGL')

    globe.updateCanvasSize()
    await globe.updateCountryTexture()
    if (disposed || controller.signal.aborted)
      return

    const { latitude, longitude } = globeData.currentLocation.value
    const parsedLat = Number(latitude)
    const parsedLng = Number(longitude)
    const targetLat = Number.isFinite(parsedLat) ? parsedLat : 0
    const targetLng = Number.isFinite(parsedLng) ? parsedLng : 0
    globe.setPointOfView(targetLat, targetLng, true)

    if (disposed || controller.signal.aborted)
      return
    trafficEventBus.on(trafficEvent.handleTrafficEvent)
    trafficListening = true
    trafficEventBus.setReady(true)
    hasLoaded.value = true
  }
  catch (error) {
    if (!disposed && !controller.signal.aborted) {
      globe.destroy()
      isUnsupported.value = !globe.isSupported.value
      if (!isUnsupported.value)
        console.error('Failed to initialize globe', error)
      hasError.value = true
    }
  }
  finally {
    if (!disposed && initializationController === controller)
      isLoading.value = false
  }
}

function handleContextLost(event: Event) {
  event.preventDefault()
  if (disposed)
    return
  isContextLost.value = true
  isLoading.value = false
  hasError.value = true
  initializationController?.abort()
  globe.destroy()
  trafficEventBus.setReady(false)
  trafficEvent.cleanup()
  if (trafficListening) {
    trafficEventBus.off(trafficEvent.handleTrafficEvent)
    trafficListening = false
  }
}

function handleContextRestored() {
  if (disposed)
    return
  isContextLost.value = false
  void initialize()
}

function resetView() {
  globe.stopAutoRotate()
  globe.resetView()
}

function retry() {
  if (isContextLost.value) {
    window.location.reload()
    return
  }
  void initialize()
}

watch(hasError, (value) => {
  if (value)
    canvasRef.value?.blur()
})

useEventListener(canvasRef, 'webglcontextlost', handleContextLost)
useEventListener(canvasRef, 'webglcontextrestored', handleContextRestored)

onMounted(() => {
  void initialize()
})

onBeforeUnmount(() => {
  disposed = true
  initializationController?.abort()
  initializationController = null
  if (resizeTimer)
    clearTimeout(resizeTimer)
  resizeTimer = null
  stopTextureWatch()
  stopDataErrorWatch()
  stopResizeWatch()
  globeData.dispose()
  globe.destroy()
  trafficEventBus.setReady(false)
  if (trafficListening)
    trafficEventBus.off(trafficEvent.handleTrafficEvent)
  trafficEvent.cleanup()
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative size-full"
    :aria-busy="isLoading"
  >
    <p :id="instructionsId" class="sr-only">
      {{ t('dashboard.realtime.globe_instructions') }}
    </p>
    <canvas
      ref="canvasRef"
      class="
        absolute inset-0 touch-pan-y outline-none
        focus-visible:ring-2 focus-visible:ring-ring
      "
      :tabindex="isLoading || hasError ? -1 : 0"
      :class="[
        globe.isDragging.value ? 'cursor-grabbing' : 'cursor-grab',
        { 'opacity-0': isLoading },
      ]"
      :aria-hidden="isLoading || hasError"
      :aria-label="t('dashboard.realtime.globe_label')"
      :aria-describedby="instructionsId"
    >
      {{ t('dashboard.realtime.globe_fallback') }}
    </canvas>
    <div
      v-if="globe.isReady.value && !isLoading && !hasError"
      class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1"
    >
      <Button
        variant="outline"
        size="icon-lg"
        class="size-11 bg-background/80 backdrop-blur-sm"
        :aria-label="t('dashboard.realtime.globe_zoom_out')"
        :disabled="globe.zoom.value <= 0"
        @click="globe.zoomBy(-0.1)"
      >
        <ZoomOut aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        class="size-11 bg-background/80 backdrop-blur-sm"
        :aria-label="t('dashboard.realtime.globe_reset')"
        @click="resetView"
      >
        <RotateCcw aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        class="size-11 bg-background/80 backdrop-blur-sm"
        :aria-label="t('dashboard.realtime.globe_zoom_in')"
        :disabled="globe.zoom.value >= 1"
        @click="globe.zoomBy(0.1)"
      >
        <ZoomIn aria-hidden="true" />
      </Button>
    </div>
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center"
      role="status"
      aria-busy="true"
    >
      <div
        v-if="!hasLoaded"
        aria-hidden="true"
        class="relative aspect-square max-h-3/4 w-2/3 max-w-md"
      >
        <Skeleton class="size-full rounded-full" />
        <div
          class="absolute inset-[18%] rounded-full border border-background/50"
        />
        <div
          class="absolute inset-y-[12%] left-1/2 border-l border-background/50"
        />
        <div
          class="absolute inset-x-[12%] top-1/2 border-t border-background/50"
        />
      </div>
      <span class="sr-only">{{ t('dashboard.loading') }}</span>
    </div>
    <div
      v-else-if="hasError"
      class="
        absolute inset-0 flex flex-col items-center justify-center gap-2
        text-center text-sm text-muted-foreground
      "
      role="alert"
    >
      <span>{{ t(isUnsupported || isContextLost ? 'dashboard.realtime.globe_fallback' : 'dashboard.realtime.globe_error') }}</span>
      <Button v-if="!isUnsupported" variant="outline" size="sm" @click="retry">
        {{ t('common.try_again') }}
      </Button>
    </div>
  </div>
</template>
