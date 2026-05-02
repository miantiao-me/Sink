<script setup lang="ts">
import type { LogEvent, TrafficEventParams } from '@/types'

const trafficEventBus = useTrafficEventBus()

const realtimeStore = useDashboardRealtimeStore()
const logs = shallowRef<LogEvent[]>([])
const logskey = ref(0)

async function getEvents() {
  if (realtimeStore.timeRange.startAt === 0) {
    return
  }
  const data = await useAPI<LogEvent[]>('/api/logs/events', {
    query: {
      startAt: realtimeStore.timeRange.startAt,
      endAt: realtimeStore.timeRange.endAt,
      ...realtimeStore.filters,
    },
  })
  logs.value = data?.reverse() ?? []
  logskey.value = Date.now()
}

watch([() => realtimeStore.timeRange, () => realtimeStore.filters], getEvents, {
  deep: true,
})

onMounted(async () => {
  getEvents()
})

function onUpdateItems(item: unknown, props: { delay?: number }) {
  if (item && typeof item === 'object' && 'props' in item) {
    trafficEventBus.emit(item as TrafficEventParams, props)
  }
}
</script>

<template>
  <SparkUiAnimatedList v-if="logs.length" :key="logskey" class="md:w-72" @update:items="onUpdateItems">
    <template #default>
      <SparkUiNotification
        v-for="item in logs"
        :key="item.id"
        :name="item.slug"
        :description="[item.os, item.browser].filter(Boolean).join(' ')"
        :icon="getFlag(item.country || '')"
        :time="item.timestamp"
        :item="item"
        class="w-full"
      />
    </template>
  </SparkUiAnimatedList>
</template>
