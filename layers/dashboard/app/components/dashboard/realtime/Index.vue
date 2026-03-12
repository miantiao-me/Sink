<script setup lang="ts">
const realtimeStore = useDashboardRealtimeStore()

const showGlobe = ref(false)

const rIC = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 50))

onBeforeMount(() => {
  realtimeStore.init()
})

onMounted(() => {
  rIC(() => {
    showGlobe.value = true
  })
})
</script>

<template>
  <div
    class="
      relative flex w-full flex-col gap-4
      md:block md:h-full
    "
  >
    <DashboardRealtimeChart
      class="
        z-10
        md:absolute md:top-0 md:left-0
      "
    />
    <div
      class="
        aspect-square
        md:absolute md:inset-0 md:aspect-auto
      "
    >
      <LazyDashboardRealtimeGlobe
        v-if="showGlobe"
        class="h-full w-full"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center"
      >
        <div class="size-3/4 animate-pulse rounded-full bg-muted/20" />
      </div>
    </div>
    <DashboardRealtimeLogs
      class="
        z-10 h-[400px]
        md:absolute md:top-0 md:right-0 md:h-full
      "
    />
  </div>
</template>
