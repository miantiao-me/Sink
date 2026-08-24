<script setup lang="ts">
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

const realtimeStore = useDashboardRealtimeStore()
const showGlobe = shallowRef(false)
const visibility = useDocumentVisibility()
const isPaused = inject(REALTIME_PAUSED_KEY, shallowRef(false))
const logsError = shallowRef(false)
const statusKey = computed(() => {
  if (isPaused.value)
    return 'dashboard.realtime.paused'
  return logsError.value ? 'dashboard.realtime.events_error' : 'dashboard.realtime.running'
})

const rIC = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 50))
const cancelRIC = window.cancelIdleCallback || clearTimeout
let idleCallbackId: number | undefined
const { pause, resume } = useIntervalFn(
  () => realtimeStore.selectPreset(realtimeStore.timeName),
  10_000,
  { immediate: false, immediateCallback: false },
)

onMounted(() => {
  if (visibility.value === 'visible' && !isPaused.value) {
    void realtimeStore.selectPreset(realtimeStore.timeName)
    resume()
  }

  idleCallbackId = rIC(() => {
    showGlobe.value = true
  }, { timeout: 1000 })
})

watch([visibility, isPaused], ([state, paused], previous) => {
  if (state === 'hidden' || paused) {
    pause()
    return
  }
  if (previous?.[0] === 'hidden' || previous?.[1])
    void realtimeStore.selectPreset(realtimeStore.timeName)
  resume()
})

onBeforeUnmount(() => {
  pause()
  if (idleCallbackId !== undefined)
    cancelRIC(idleCallbackId)
})
</script>

<template>
  <div
    class="
      relative flex w-full flex-col gap-4
      lg:block lg:h-full
    "
  >
    <DashboardRealtimeChart
      class="
        z-10
        lg:absolute lg:top-0 lg:left-0
      "
    />
    <div
      class="
        aspect-square
        lg:absolute lg:inset-0 lg:aspect-auto
      "
    >
      <LazyDashboardRealtimeGlobe
        v-if="showGlobe"
        class="size-full"
      />
      <div
        v-else
        class="flex size-full items-center justify-center"
        role="status"
      >
        <div
          class="
            size-3/4 rounded-full bg-muted/20
            motion-safe:animate-pulse
          "
        />
        <span class="sr-only">{{ $t('dashboard.loading') }}</span>
      </div>
    </div>
    <div
      class="
        absolute top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2
        text-xs text-muted-foreground
      "
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        class="size-1.5 rounded-full bg-chart-2"
        :class="{ 'motion-safe:animate-pulse': !isPaused && !logsError }"
      />
      {{ $t(statusKey) }}
    </div>
    <DashboardRealtimeLogs
      class="
        z-10 h-[400px]
        lg:absolute lg:top-0 lg:right-0 lg:h-full
      "
      @error-change="logsError = $event"
    />
  </div>
</template>
