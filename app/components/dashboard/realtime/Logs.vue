<script setup lang="ts">
import type { LogEvent } from '@/types'
import AnimatedList from '@/components/spark-ui/AnimatedList.vue'
import Notification from '@/components/spark-ui/Notification.vue'

const realtimeStore = useDashboardRealtimeStore()
const logs = ref<LogEvent[]>([])
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

function onUpdateItems(...args) {
  globalTrafficEvent.emit(...args)
}
</script>

<template>
  <AnimatedList v-if="logs.length" :key="logskey" class="md:w-72" @update:items="onUpdateItems">
    <template #default>
      <Notification
        v-for="item in logs"
        :key="item.id"
        :name="item.slug"
        :description="[item.os, item.browser].filter(Boolean).join(' ')"
        :icon="getFlag(item.country)"
        :time="item.timestamp"
        :item="item"
        class="w-full"
      />
    </template>
  </AnimatedList>
</template>
