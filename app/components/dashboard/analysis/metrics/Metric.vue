<script setup lang="ts">
import type { MetricItem } from '@/types'
import { LoaderCircle } from '@lucide/vue'

const props = defineProps<{
  type: string
  name: string
}>()

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const total = ref(0)
const metrics = ref<MetricItem[]>([])
const top10 = ref<MetricItem[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const hasLoaded = shallowRef(false)
const retryKey = shallowRef(0)

interface RawMetricData {
  name: string
  count: number
}

watch([() => analysisStore.dateRange, () => analysisStore.filters, retryKey], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false
  try {
    const result = await useAPI<{ data: RawMetricData[] }>('/api/stats/metrics', {
      signal: controller.signal,
      query: {
        ...analysisStore.filters,
        type: props.type,
        id: id.value,
        startAt: analysisStore.dateRange.startAt,
        endAt: analysisStore.dateRange.endAt,
      },
    })
    if (!controller.signal.aborted && Array.isArray(result.data)) {
      total.value = result.data.reduce((acc, cur) => acc + Number(cur.count), 0)
      metrics.value = result.data.map(item => ({
        ...item,
        percent: Math.floor(item.count / total.value * 100) || (item.count ? 1 : 0),
      }))
      top10.value = metrics.value.slice(0, 10)
      hasLoaded.value = true
    }
  }
  catch {
    if (!controller.signal.aborted)
      error.value = true
  }
  finally {
    if (!controller.signal.aborted)
      loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <Card
    size="sm"
    class="
      min-h-0 transition-opacity
      motion-reduce:transition-none
    "
    :class="loading && hasLoaded ? 'opacity-60' : 'opacity-100'"
    :aria-busy="loading"
  >
    <template v-if="error">
      <CardContent
        class="
          flex min-h-40 flex-1 flex-col items-center justify-center gap-2
          text-sm text-destructive
        " role="alert"
      >
        <span>{{ $t('dashboard.realtime.stats_error') }}</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          class="text-destructive"
          @click="retryKey++"
        >
          {{ $t('common.try_again') }}
        </Button>
      </CardContent>
    </template>
    <template v-else-if="loading && !hasLoaded">
      <div class="h-[364px] overflow-hidden">
        <div class="flex h-12 items-center justify-between px-4">
          <Skeleton class="h-4 w-32 rounded-full" />
          <Skeleton class="h-4 w-20 rounded-full" />
        </div>
        <div class="h-[316px] overflow-hidden">
          <div
            v-for="index in 7"
            :key="index"
            class="space-y-2 border-b px-4 py-2"
          >
            <div class="flex items-center justify-between gap-3">
              <Skeleton class="h-4 w-2/5" />
              <Skeleton class="h-4 w-20 shrink-0" />
            </div>
            <Skeleton class="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
      <CardFooter>
        <Skeleton class="h-9 w-full rounded-md" />
      </CardFooter>
    </template>
    <template v-else-if="metrics.length">
      <DashboardAnalysisMetricsList
        :metrics="top10"
        :type="type"
        :viewport-height="316"
      />
      <CardFooter>
        <DashboardAnalysisMetricsMetricDetailsDialog
          :title="name"
          :metrics="metrics"
          :type="type"
        />
      </CardFooter>
    </template>
    <CardContent
      v-else-if="loading"
      class="
        flex min-h-40 flex-1 items-center justify-center text-sm
        text-muted-foreground
      "
      role="status"
    >
      <LoaderCircle
        class="
          size-5
          motion-safe:animate-spin
        "
        aria-hidden="true"
      />
      <span class="sr-only">{{ $t('dashboard.loading') }}</span>
    </CardContent>
    <CardContent
      v-else
      class="
        flex min-h-40 flex-1 items-center justify-center text-sm
        text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </CardContent>
  </Card>
</template>
