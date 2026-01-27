<script setup lang="ts">
import type { ChartConfig } from '@/components/ui/chart'
import type { ViewDataPoint } from '@/types'
import { VisArea, VisAxis, VisGroupedBar, VisLine, VisXYContainer } from '@unovis/vue'
import {
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'

const props = withDefaults(defineProps<{
  mode?: 'full' | 'simple'
  chartType?: 'area' | 'bar'
  startAt?: number
  endAt?: number
  filters?: Record<string, string>
}>(), {
  mode: 'full',
  chartType: 'area',
})

const { t } = useI18n()

const views = ref<ViewDataPoint[]>([])

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
    const normalizedTime = timePart.includes(':')
      ? timePart
      : `${timePart.padStart(2, '0')}:00`
    return new Date(`${date}T${normalizedTime}:00`).getTime()
  }
  return new Date(time).getTime()
}

async function getLinkViews() {
  views.value = []
  const { startAt, endAt } = effectiveTimeRange.value
  const result = await useAPI<{ data: ViewDataPoint[] }>('/api/stats/views', {
    query: {
      id: id.value,
      unit: getUnit(startAt, endAt),
      clientTimezone: getTimeZone(),
      startAt,
      endAt,
      ...effectiveFilters.value,
    },
  })
  views.value = (result.data || []).map((item) => {
    item.visitors = +item.visitors
    item.visits = +item.visits
    return item
  })
}

watch(
  [effectiveTimeRange, effectiveFilters],
  getLinkViews,
  { deep: true },
)

onMounted(async () => {
  getLinkViews()
})

type Data = ViewDataPoint
</script>

<template>
  <Card
    class="
      px-0 py-6
      md:px-6
    "
  >
    <CardTitle
      v-if="mode === 'full'"
      class="
        px-6
        md:px-0
      "
    >
      {{ $t('dashboard.views') }}
    </CardTitle>
    <ChartContainer :config="chartConfig" class="aspect-[4/1] w-full">
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
            :group-width="getUnit(startAt, endAt) === 'minute' ? 8 : undefined"
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

      <!-- Legend -->
      <ChartLegendContent v-if="mode === 'full'" />
    </ChartContainer>
  </Card>
</template>
