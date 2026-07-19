<script setup lang="ts">
import type { HeatmapDataPoint } from '@/types'

const props = withDefaults(defineProps<{
  metric?: 'visits' | 'visitors'
}>(), {
  metric: 'visits',
})

const heatmapData = shallowRef<HeatmapDataPoint[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const hasLoaded = shallowRef(false)
const retryKey = shallowRef(0)
const activeCellIndex = shallowRef(0)
const openTooltipIndex = shallowRef<number>()
const cellButtons = shallowRef<(HTMLButtonElement | undefined)[]>([])
const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()
const { locale, t } = useI18n()

const effectiveTimeRange = computed(() => ({
  startAt: analysisStore.dateRange.startAt,
  endAt: analysisStore.dateRange.endAt,
}))

const effectiveFilters = computed(() => analysisStore.filters)

const weekdays = computed(() => getWeekdayNames('short', locale.value))
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

const metricLabel = computed(() => t(props.metric === 'visits' ? 'dashboard.visits' : 'dashboard.visitors'))

const chartSummary = computed(() => {
  const total = heatmapData.value.reduce((sum, item) => sum + Number(item[props.metric]), 0)
  const peak = heatmapData.value.reduce<HeatmapDataPoint | undefined>((current, item) =>
    !current || Number(item[props.metric]) > Number(current[props.metric]) ? item : current, undefined)

  const summary = `${t('dashboard.weekly_trend')}. ${metricLabel.value}: ${formatNumber(total, locale.value)}.`
  if (!peak)
    return summary

  const weekdayIndex = weekdayIndices.indexOf(Number(peak.weekday))
  const weekday = weekdays.value[weekdayIndex]
  return `${summary} ${weekday} ${Number(peak.hour)}:00: ${formatNumber(Number(peak[props.metric]), locale.value)}.`
})

function getCellValue(weekday: number, hour: number): number {
  const key = `${weekday}-${hour}`
  return gridData.value.grid[key] || 0
}

function getCellColor(weekday: number, hour: number): string {
  const value = getCellValue(weekday, hour)
  const { maxValue } = gridData.value

  let alpha = 0.05
  if (value > 0 && maxValue > 0) {
    alpha = Math.max(0.1, value / maxValue)
  }

  const baseColor = props.metric === 'visits' ? 'var(--chart-1)' : 'var(--chart-2)'
  const emptyColor = 'var(--foreground)'

  const color = value === 0 ? emptyColor : baseColor
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

function getCellLabel(weekdayIndex: number, weekday: number, hour: number): string {
  return `${weekdays.value[weekdayIndex]} ${hour}:00. ${metricLabel.value}: ${formatNumber(getCellValue(weekday, hour), locale.value)}.`
}

function setCellButton(element: unknown, index: number) {
  cellButtons.value[index] = element instanceof HTMLButtonElement ? element : undefined
}

function setTooltipOpen(index: number, open: boolean) {
  if (open) {
    openTooltipIndex.value = index
  }
  else if (openTooltipIndex.value === index) {
    openTooltipIndex.value = undefined
  }
}

function activateCell(index: number) {
  activeCellIndex.value = index
  openTooltipIndex.value = index
}

async function handleCellKeydown(event: KeyboardEvent, index: number) {
  const row = Math.floor(index / hours.length)
  const column = index % hours.length
  let nextIndex: number

  switch (event.key) {
    case 'ArrowLeft':
      nextIndex = row * hours.length + Math.max(0, column - 1)
      break
    case 'ArrowRight':
      nextIndex = row * hours.length + Math.min(hours.length - 1, column + 1)
      break
    case 'ArrowUp':
      nextIndex = Math.max(0, row - 1) * hours.length + column
      break
    case 'ArrowDown':
      nextIndex = Math.min(weekdayIndices.length - 1, row + 1) * hours.length + column
      break
    default:
      return
  }

  event.preventDefault()
  activeCellIndex.value = nextIndex
  await nextTick()
  cellButtons.value[nextIndex]?.focus()
}

watch([effectiveTimeRange, effectiveFilters, retryKey], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false
  const { startAt, endAt } = effectiveTimeRange.value
  try {
    const result = await useAPI<{ data: HeatmapDataPoint[] }>('/api/stats/heatmap', {
      signal: controller.signal,
      query: {
        ...effectiveFilters.value,
        id: id.value,
        clientTimezone: getTimeZone(),
        startAt,
        endAt,
      },
    })
    if (controller.signal.aborted)
      return
    heatmapData.value = (result.data || []).map(item => ({
      ...item,
      visitors: +item.visitors,
      visits: +item.visits,
      weekday: +item.weekday,
      hour: +item.hour,
    }))
    hasLoaded.value = true
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
  <Card>
    <CardContent>
      <div
        v-if="loading && !hasLoaded"
        role="status"
        aria-busy="true"
        class="aspect-4/1 w-full overflow-x-auto rounded-sm"
      >
        <span class="sr-only">{{ $t('dashboard.loading') }}</span>
        <div aria-hidden="true" class="flex h-full min-w-[600px] flex-col">
          <div class="mb-2 ml-12 grid flex-none grid-cols-12 gap-2">
            <Skeleton
              v-for="hour in 12"
              :key="hour"
              class="h-1.5 w-full rounded-sm"
            />
          </div>
          <div class="flex flex-1 flex-col gap-3">
            <div
              v-for="weekday in weekdayIndices"
              :key="weekday"
              class="flex flex-1 items-center gap-3"
            >
              <Skeleton class="h-2 w-9 shrink-0 rounded-sm" />
              <Skeleton class="h-full flex-1 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="error"
        role="alert"
        class="
          flex aspect-4/1 items-center justify-center gap-2 text-sm
          text-destructive
        "
      >
        {{ $t('dashboard.realtime.stats_error') }}
        <Button
          type="button"
          variant="link"
          size="sm"
          class="text-destructive"
          @click="retryKey++"
        >
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <div
        v-else-if="hasLoaded && !heatmapData.length"
        role="status"
        class="
          flex aspect-4/1 items-center justify-center text-sm
          text-muted-foreground
        "
      >
        {{ $t('dashboard.no_data') }}
      </div>
      <div
        v-else
        class="
          aspect-4/1 w-full overflow-x-auto rounded-sm transition-opacity
          duration-500 ease-out
          motion-reduce:transition-none
        "
        :class="loading ? 'opacity-60' : 'opacity-100'"
      >
        <div class="flex h-full min-w-[600px] flex-col">
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

          <div
            class="flex flex-1 flex-col gap-3"
            role="grid"
            :aria-busy="loading"
            :aria-label="chartSummary"
            :aria-colcount="hours.length"
            :aria-rowcount="weekdayIndices.length"
          >
            <div
              v-for="(weekdayIdx, arrayIdx) in weekdayIndices"
              :key="weekdayIdx"
              class="flex flex-1 items-center gap-3"
              role="row"
            >
              <div
                class="
                  w-9 shrink-0 text-right text-[10px] text-muted-foreground
                "
                role="rowheader"
              >
                {{ weekdays[arrayIdx] }}
              </div>
              <div class="grid h-full flex-1 grid-cols-24 gap-2">
                <div
                  v-for="hour in hours"
                  :key="hour"
                  class="size-full"
                  role="gridcell"
                >
                  <Tooltip
                    :open="openTooltipIndex === arrayIdx * hours.length + hour"
                    disable-closing-trigger
                    @update:open="setTooltipOpen(arrayIdx * hours.length + hour, $event)"
                  >
                    <TooltipTrigger as-child>
                      <button
                        :ref="element => setCellButton(element, arrayIdx * hours.length + hour)"
                        type="button"
                        class="
                          relative block size-full rounded-sm border-0 p-0
                          transition-[background-color,box-shadow] duration-300
                          hover:ring-1 hover:ring-foreground/10
                          focus-visible:z-10 focus-visible:ring-2
                          focus-visible:ring-ring focus-visible:outline-none
                          motion-reduce:transition-none
                        "
                        :style="{
                          backgroundColor: getCellColor(weekdayIdx, hour),
                        }"
                        :tabindex="activeCellIndex === arrayIdx * hours.length + hour ? 0 : -1"
                        :aria-label="getCellLabel(arrayIdx, weekdayIdx, hour)"
                        @click="activateCell(arrayIdx * hours.length + hour)"
                        @focus="activeCellIndex = arrayIdx * hours.length + hour"
                        @keydown="handleCellKeydown($event, arrayIdx * hours.length + hour)"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="font-medium">
                        {{ weekdays[arrayIdx] }} {{ hour }}:00
                      </p>
                      <p class="text-muted-foreground">
                        {{ metric === 'visits' ? $t('dashboard.visits') : $t('dashboard.visitors') }}:
                        {{ formatNumber(getCellValue(weekdayIdx, hour), locale) }}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.grid-cols-24 {
  grid-template-columns: repeat(24, minmax(0, 1fr));
}
</style>
