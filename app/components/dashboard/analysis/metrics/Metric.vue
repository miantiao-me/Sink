<script setup lang="ts">
import type { MetricItem } from '@/types'
import { Maximize } from 'lucide-vue-next'

const props = defineProps<{
  type: string
  name: string
}>()

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const total = ref(0)
const metrics = ref<MetricItem[]>([])
const top10 = ref<MetricItem[]>([])

interface RawMetricData {
  name: string
  count: number
}

async function getLinkMetrics() {
  total.value = 0
  metrics.value = []
  top10.value = []
  const result = await useAPI<{ data: RawMetricData[] }>('/api/stats/metrics', {
    query: {
      type: props.type,
      id: id.value,
      startAt: analysisStore.dateRange.startAt,
      endAt: analysisStore.dateRange.endAt,
      ...analysisStore.filters,
    },
  })
  if (Array.isArray(result.data)) {
    total.value = result.data.reduce((acc, cur) => acc + Number(cur.count), 0)
    metrics.value = result.data.map(item => ({
      ...item,
      percent: Math.floor(item.count / total.value * 100) || (item.count ? 1 : 0),
    }))
    top10.value = metrics.value.slice(0, 10)
  }
}

watch([() => analysisStore.dateRange, () => analysisStore.filters], getLinkMetrics, {
  deep: true,
})

onMounted(() => {
  getLinkMetrics()
})
</script>

<template>
  <Card class="flex flex-col gap-0 p-0">
    <template v-if="metrics.length">
      <CardContent class="p-0">
        <DashboardAnalysisMetricsList
          class="flex-1"
          :metrics="top10"
          :type="type"
        />
      </CardContent>
      <CardFooter class="py-2">
        <Dialog>
          <DialogTrigger
            as-child
            class="w-full"
          >
            <Button
              variant="link"
            >
              <Maximize class="mr-2 h-4 w-4" />
              {{ $t('dashboard.details') }}
            </Button>
          </DialogTrigger>
          <DialogContent
            class="
              max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
              md:max-w-(--breakpoint-md)
            "
          >
            <DialogHeader>
              <DialogTitle>{{ name }}</DialogTitle>
            </DialogHeader>
            <DashboardAnalysisMetricsList
              class="overflow-y-auto"
              :metrics="metrics"
              :type="type"
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </template>
    <template v-else>
      <div class="flex h-12 items-center justify-between px-4">
        <Skeleton
          class="h-4 w-32 rounded-full"
        />
        <Skeleton
          class="h-4 w-20 rounded-full"
        />
      </div>
      <div
        v-for="i in 5"
        :key="i"
        class="px-4 py-4"
      >
        <Skeleton
          class="h-4 w-full rounded-full"
        />
      </div>
    </template>
  </Card>
</template>
