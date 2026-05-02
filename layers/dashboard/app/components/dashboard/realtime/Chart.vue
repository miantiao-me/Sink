<script setup lang="ts">
import type { CounterData } from '@/types'
import NumberFlow from '@number-flow/vue'
import { watchDeep } from '@vueuse/core'
import { MousePointerClick } from 'lucide-vue-next'

provide(LINK_ID_KEY, computed(() => undefined))

const realtimeStore = useDashboardRealtimeStore()
const stats = ref<CounterData>({ visits: 0, visitors: 0, referers: 0 })

async function getRealtimeStats() {
  if (realtimeStore.timeRange.startAt === 0) {
    return
  }
  const result = await useAPI<{ data: CounterData[] }>('/api/stats/counters', {
    query: {
      startAt: realtimeStore.timeRange.startAt,
      endAt: realtimeStore.timeRange.endAt,
      ...realtimeStore.filters,
    },
  })

  stats.value = result.data?.[0] || { visits: 0, visitors: 0, referers: 0 }
}

watchDeep([() => realtimeStore.timeRange, () => realtimeStore.filters], getRealtimeStats)

onMounted(() => {
  getRealtimeStats()
})
</script>

<template>
  <Card
    class="
      flex h-72 flex-col gap-0 p-4
      md:m-2 md:w-80
    "
  >
    <div class="h-24">
      <CardHeader
        v-if="stats.visits" class="
          flex flex-row items-center justify-between space-y-0 px-0 pt-2 pb-2
        "
      >
        <CardTitle class="flex items-center gap-2 text-sm font-medium">
          <span
            class="
              inline-flex size-1.5 animate-ping rounded-full bg-green-400
              opacity-75
            "
          />
          {{ $t('dashboard.visits') }}
        </CardTitle>
        <MousePointerClick class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent class="px-0 pb-4">
        <NumberFlow class="text-2xl font-bold" :class="{ 'opacity-60 blur-md': !stats.visits }" :value="stats.visits" />
      </CardContent>
    </div>
    <DashboardAnalysisViews
      class="h-40 w-full border-none p-0! shadow-none"
      mode="simple"
      chart-type="bar"
      :start-at="realtimeStore.timeRange.startAt"
      :end-at="realtimeStore.timeRange.endAt"
      :filters="realtimeStore.filters"
    />
  </Card>
</template>
