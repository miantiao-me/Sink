<script setup lang="ts">
import type { HeatmapDataPoint } from '@/types'
import { watchThrottled } from '@vueuse/core'

const props = withDefaults(defineProps<{
  metric?: 'visits' | 'visitors'
}>(), {
  metric: 'visits',
})

const heatmapData = shallowRef<HeatmapDataPoint[]>([])
const isLoaded = ref(false)
const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const effectiveTimeRange = computed(() => ({
  startAt: analysisStore.dateRange.startAt,
  endAt: analysisStore.dateRange.endAt,
}))

const effectiveFilters = computed(() => analysisStore.filters)

const weekdays = getWeekdayNames('short')
// weekday indices: Monday=1, Tuesday=2, ..., Sunday=7 (ISO 8601)
const weekdayIndices = [1, 2, 3, 4, 5, 6, 7]

const hours = Array.from({ length: 24 }, (_, i) => i)

const gridData = computed(() => {
  const grid: Record<string, number> = {}
  let maxValue = 0

  for (const item of heatmapData.value) {
    const key = `${item.weekday}-${item.hour}`
    const value = +item[props.metric]
    grid[key] = value
    if (value > maxValue)
      maxValue = value
  }

  return { grid, maxValue }
})

function getCellValue(weekday: number, hour: number): number {
  const key = `${weekday}-${hour}`
  return gridData.value.grid[key] || 0
}

function getCellColor(weekday: number, hour: number): string {
  const value = getCellValue(weekday, hour)
  const { maxValue } = gridData.value

  // Calculate alpha based on value intensity
  let alpha = 0.05 // empty cell
  if (value > 0 && maxValue > 0) {
    alpha = Math.max(0.1, value / maxValue)
  }

  const baseColor = props.metric === 'visits' ? 'var(--chart-1)' : 'var(--chart-2)'
  const emptyColor = 'var(--foreground)'

  // Use color-mix to apply alpha to the color
  const color = value === 0 ? emptyColor : baseColor
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

async function getHeatmapData() {
  isLoaded.value = false
  const { startAt, endAt } = effectiveTimeRange.value
  const result = await useAPI<{ data: HeatmapDataPoint[] }>('/api/stats/heatmap', {
    query: {
      id: id.value,
      clientTimezone: getTimeZone(),
      startAt,
      endAt,
      ...effectiveFilters.value,
    },
  })
  heatmapData.value = (result.data || []).map(item => ({
    ...item,
    visitors: +item.visitors,
    visits: +item.visits,
    weekday: +item.weekday,
    hour: +item.hour,
  }))
  await nextTick()
  isLoaded.value = true
}

watchThrottled(
  [effectiveTimeRange, effectiveFilters],
  getHeatmapData,
  {
    deep: true,
    throttle: 500,
    leading: true,
    trailing: true,
  },
)

onMounted(() => {
  getHeatmapData()
})
</script>

<template>
  <Card
    class="
      p-4
      md:p-10
    "
  >
    <!-- Heatmap container with same aspect ratio as Views -->
    <div
      class="
        aspect-[4/1] w-full overflow-x-auto transition-opacity duration-500
        ease-out
      "
      :class="isLoaded ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex h-full min-w-[600px] flex-col">
        <!-- Hours header -->
        <div
          class="
            mb-2 ml-12 grid flex-none grid-cols-24 gap-2 text-[10px]
            text-muted-foreground
          "
        >
          <div v-for="hour in hours" :key="hour" class="text-center">
            {{ hour }}
          </div>
        </div>

        <!-- Heatmap grid -->
        <div class="flex flex-1 flex-col gap-3">
          <div
            v-for="(weekdayIdx, arrayIdx) in weekdayIndices"
            :key="weekdayIdx"
            class="flex flex-1 items-center gap-3"
          >
            <div
              class="w-9 shrink-0 text-right text-[10px] text-muted-foreground"
            >
              {{ weekdays[arrayIdx] }}
            </div>
            <div class="grid h-full flex-1 grid-cols-24 gap-2">
              <Tooltip v-for="hour in hours" :key="hour">
                <TooltipTrigger as-child>
                  <div
                    class="
                      h-full cursor-pointer rounded-sm
                      transition-[background-color,box-shadow] duration-300
                      hover:ring-1 hover:ring-foreground/10
                    "
                    role="gridcell"
                    :aria-label="`${weekdays[arrayIdx]} ${hour}:00 - ${metric === 'visits' ? $t('dashboard.visits') : $t('dashboard.visitors')}: ${formatNumber(getCellValue(weekdayIdx, hour))}`"
                    :style="{
                      backgroundColor: getCellColor(weekdayIdx, hour),
                    }"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p class="font-medium">
                    {{ weekdays[arrayIdx] }} {{ hour }}:00
                  </p>
                  <p class="text-muted-foreground">
                    {{ metric === 'visits' ? $t('dashboard.visits') : $t('dashboard.visitors') }}:
                    {{ formatNumber(getCellValue(weekdayIdx, hour)) }}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.grid-cols-24 {
  grid-template-columns: repeat(24, minmax(0, 1fr));
}
</style>
