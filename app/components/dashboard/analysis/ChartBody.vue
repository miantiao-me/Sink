<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ChartConfig } from '@/components/ui/chart'
import type { ViewDataPoint } from '@/types'
import type { DashboardSlugFilters } from '@/utils/dashboard-query'
import { VisArea, VisAxis, VisGroupedBar, VisLine, VisXYContainer } from '@unovis/vue'
import {
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  mode?: 'full' | 'simple'
  chartType?: 'area' | 'bar'
  startAt?: number
  endAt?: number
  filters?: DashboardSlugFilters
}>(), {
  mode: 'full',
  chartType: 'area',
})

const { locale, t } = useI18n()
const isPaused = inject(REALTIME_PAUSED_KEY, shallowRef(false))

const views = shallowRef<ViewDataPoint[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const hasLoaded = shallowRef(false)
const retryKey = shallowRef(0)

const isAreaMode = computed(() => props.chartType === 'area' && views.value.length > 1)

const chartConfig = computed<ChartConfig>(() => {
  const config: ChartConfig = {
    visits: {
      label: t('dashboard.visits'),
      color: 'var(--chart-1)',
    },
  }
  if (props.mode === 'full') {
    config.visitors = {
      label: t('dashboard.visitors'),
      color: 'var(--chart-2)',
    }
  }
  return config
})

const categories = computed(() =>
  props.mode === 'full' ? ['visits', 'visitors'] : ['visits'],
)
const summaryId = `trend-summary-${useId()}`
const totalVisits = computed(() => views.value.reduce((sum, item) => sum + item.visits, 0))
const totalVisitors = computed(() => views.value.reduce((sum, item) => sum + item.visitors, 0))
const peak = computed(() => views.value.reduce<ViewDataPoint | undefined>(
  (current, item) => !current || item.visits > current.visits ? item : current,
  undefined,
))
const chartSummary = computed(() => {
  if (!peak.value)
    return t('dashboard.no_data')

  const key = props.mode === 'full'
    ? 'dashboard.analysis.chart_summary_with_visitors'
    : 'dashboard.analysis.chart_summary'
  return t(key, {
    totalVisits: formatNumber(totalVisits.value),
    totalVisitors: formatNumber(totalVisitors.value),
    peakVisits: formatNumber(peak.value.visits),
    peakTime: formatPeakTime(peak.value.time),
  })
})

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const effectiveTimeRange = computed(() => ({
  startAt: props.startAt ?? analysisStore.dateRange.startAt,
  endAt: props.endAt ?? analysisStore.dateRange.endAt,
}))

const effectiveFilters = computed(() =>
  props.filters ?? analysisStore.filters,
)

const OneHour = 60 * 60
const OneDay = 24 * 60 * 60

function getUnit(startAt: number, endAt: number): 'minute' | 'hour' | 'day' {
  if (startAt && endAt && endAt - startAt <= OneHour)
    return 'minute'

  if (startAt && endAt && endAt - startAt <= OneDay)
    return 'hour'

  return 'day'
}

function parseTimeString(time: string): number {
  if (time.includes(' ')) {
    const [date, timePart] = time.split(' ')
    const normalizedTime = (timePart ?? '').includes(':')
      ? timePart
      : `${(timePart ?? '').padStart(2, '0')}:00`
    return new Date(`${date}T${normalizedTime}:00`).getTime()
  }
  return new Date(time).getTime()
}

function formatPeakTime(time: string): string {
  const timestamp = parseTimeString(time)
  if (!Number.isFinite(timestamp))
    return time

  const { startAt, endAt } = effectiveTimeRange.value
  const unit = getUnit(startAt, endAt)
  return new Intl.DateTimeFormat(locale.value, unit === 'day'
    ? { dateStyle: 'medium' }
    : { dateStyle: 'short', timeStyle: 'short' }).format(timestamp)
}

watch([effectiveTimeRange, effectiveFilters, isPaused, retryKey], async (_values, _oldValues, onCleanup) => {
  if (isPaused.value) {
    loading.value = false
    return
  }

  const { startAt, endAt } = effectiveTimeRange.value
  if (!startAt || !endAt)
    return

  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false

  try {
    const result = await useAPI<{ data: ViewDataPoint[] }>('/api/stats/views', {
      signal: controller.signal,
      query: {
        ...effectiveFilters.value,
        id: id.value,
        unit: getUnit(startAt, endAt),
        clientTimezone: getTimeZone(),
        startAt,
        endAt,
      },
    })
    if (controller.signal.aborted || isPaused.value)
      return
    views.value = (result.data || []).map(item => ({
      ...item,
      visitors: +item.visitors,
      visits: +item.visits,
    }))
    hasLoaded.value = true
  }
  catch {
    if (!controller.signal.aborted && !isPaused.value)
      error.value = true
  }
  finally {
    if (!controller.signal.aborted && !isPaused.value)
      loading.value = false
  }
}, { immediate: true })

type Data = ViewDataPoint
</script>

<template>
  <div :class="props.class">
    <div
      v-if="loading && !hasLoaded"
      class="relative aspect-4/1 w-full"
      role="status"
      aria-busy="true"
    >
      <span class="sr-only">{{ $t('dashboard.loading') }}</span>
      <div aria-hidden="true" class="absolute inset-0">
        <div
          class="
            absolute inset-y-2 right-2 left-6 overflow-hidden border-b border-l
            border-border
          "
        >
          <div class="absolute top-1/3 w-full border-t border-border/60" />
          <div class="absolute top-2/3 w-full border-t border-border/60" />
          <Skeleton
            class="
              absolute inset-x-2 bottom-1 h-3/4 rounded-sm opacity-70
              [clip-path:polygon(0_82%,18%_62%,36%_72%,54%_24%,72%_48%,88%_10%,100%_34%,100%_100%,0_100%)]
            "
          />
        </div>
        <div class="absolute right-2 bottom-0 left-6 flex justify-between">
          <Skeleton v-for="index in 4" :key="index" class="h-1.5 w-8 rounded-sm" />
        </div>
      </div>
    </div>
    <div
      v-else-if="error" class="
        flex aspect-4/1 items-center justify-center text-sm text-destructive
      "
      role="alert"
    >
      {{ $t('dashboard.realtime.stats_error') }}
      <Button variant="link" @click="retryKey++">
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <div
      v-else-if="hasLoaded && !views.length" class="
        flex aspect-4/1 items-center justify-center text-sm
        text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </div>
    <ChartContainer
      v-else
      :config="chartConfig"
      class="aspect-4/1 w-full"
      role="img"
      :aria-label="$t('dashboard.visits')"
      :aria-describedby="summaryId"
    >
      <VisXYContainer :data="views" :margin="{ left: 0, right: 0 }">
        <template v-if="isAreaMode">
          <template v-for="cat in categories" :key="cat">
            <VisArea
              :x="(d: Data) => parseTimeString(d.time)"
              :y="(d: Data) => d[cat as keyof Data] as number"
              :color="chartConfig[cat]?.color ?? 'var(--chart-1)'"
              :opacity="0.4"
            />
            <VisLine
              :x="(d: Data) => parseTimeString(d.time)"
              :y="(d: Data) => d[cat as keyof Data] as number"
              :color="chartConfig[cat]?.color ?? 'var(--chart-1)'"
              :line-width="2"
            />
          </template>
        </template>

        <template v-else>
          <VisGroupedBar
            :x="(d: Data) => parseTimeString(d.time)"
            :y="categories.map(cat => (d: Data) => d[cat as keyof Data] as number)"
            :color="categories.map(cat => chartConfig[cat]?.color ?? 'var(--chart-1)')"
            :rounded-corners="4"
            :group-width="getUnit(startAt ?? 0, endAt ?? 0) === 'minute' ? 8 : undefined"
          />
        </template>

        <VisAxis
          v-if="mode === 'full' && views.length"
          type="y"
          :tick-format="formatNumber"
          :tick-line="false"
          :domain-line="false"
          :grid-line="true"
          :num-ticks="3"
        />

        <!-- Tooltip -->
        <ChartTooltip />
        <ChartCrosshair
          :template="componentToString(chartConfig, ChartTooltipContent, { labelKey: 'time' })"
          :color="categories.map(cat => chartConfig[cat]?.color ?? 'var(--chart-1)')"
        />
      </VisXYContainer>
    </ChartContainer>
    <p v-if="hasLoaded && views.length" :id="summaryId" class="sr-only">
      {{ chartSummary }}
    </p>
  </div>
</template>
