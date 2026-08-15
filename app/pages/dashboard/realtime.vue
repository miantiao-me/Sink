<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'

definePageMeta({
  layout: 'dashboard',
})

const realtimeStore = useDashboardRealtimeStore()
const isPaused = shallowRef(false)
provide(REALTIME_PAUSED_KEY, isPaused)
useDashboardRealtimeRouteState()

function handleFilterChange(type: string, value: string) {
  realtimeStore.updateFilter(type, value)
}
</script>

<template>
  <main
    class="
      w-full
      lg:h-full lg:overflow-hidden
    "
  >
    <h1 class="sr-only">
      {{ $t('nav.realtime') }}
    </h1>

    <Teleport to="#dashboard-header-actions" defer>
      <Button
        type="button"
        variant="outline"
        :aria-label="$t(isPaused ? 'dashboard.realtime.resume' : 'dashboard.realtime.pause')"
        :aria-pressed="isPaused"
        @click="isPaused = !isPaused"
      >
        <Play v-if="isPaused" aria-hidden="true" />
        <Pause v-else aria-hidden="true" />
        {{ $t(isPaused ? 'dashboard.realtime.resume' : 'dashboard.realtime.pause') }}
      </Button>
      <DashboardTimePicker />
      <DashboardFilters :filters="realtimeStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardRealtime />
  </main>
</template>
