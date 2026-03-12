<script setup lang="ts">
import type { CounterData } from '@/types'
import NumberFlow from '@number-flow/vue'
import { watchThrottled } from '@vueuse/core'
import { Flame, MousePointerClick, Users } from 'lucide-vue-next'

const defaultData: CounterData = Object.freeze({
  visits: 0,
  visitors: 0,
  referers: 0,
})

const counters = ref<CounterData>(defaultData)

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

async function getLinkCounters() {
  counters.value = defaultData
  const result = await useAPI<{ data: CounterData[] }>('/api/stats/counters', {
    query: {
      id: id.value,
      startAt: analysisStore.dateRange.startAt,
      endAt: analysisStore.dateRange.endAt,
      ...analysisStore.filters,
    },
  })
  counters.value = result.data?.[0] ?? defaultData
}

watchThrottled([() => analysisStore.dateRange, () => analysisStore.filters], getLinkCounters, {
  deep: true,
  throttle: 500,
  leading: true,
  trailing: true,
})

onMounted(async () => {
  getLinkCounters()
})
</script>

<template>
  <div
    class="
      grid gap-4
      sm:grid-cols-3 sm:gap-3
      lg:gap-4
    "
  >
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.visits') }}
        </CardTitle>
        <MousePointerClick
          aria-hidden="true" class="h-4 w-4 text-muted-foreground"
        />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.visits }" :value="counters.visits" />
      </CardContent>
    </Card>
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.visitors') }}
        </CardTitle>
        <Users aria-hidden="true" class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.visitors }" :value="counters.visitors" />
      </CardContent>
    </Card>
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.referers') }}
        </CardTitle>
        <Flame aria-hidden="true" class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.referers }" :value="counters.referers" />
      </CardContent>
    </Card>
  </div>
</template>
