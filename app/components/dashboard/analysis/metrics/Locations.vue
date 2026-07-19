<script setup lang="ts">
import type { ChartConfig } from '@/components/ui/chart'
import type { AreaData } from '@/types'
import { VisSingleContainer, VisTooltip, VisTopoJSONMap, VisTopoJSONMapSelectors } from '@unovis/vue'
import { useMounted } from '@vueuse/core'
import { render } from 'vue'
import { ChartTooltipContent } from '@/components/ui/chart'

const isMounted = useMounted()
const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()
const { t, locale } = useI18n()

const worldMapTopoJSON = ref<Record<string, unknown>>({})
const areaData = ref<AreaData[]>([])
const loading = shallowRef(false)
const mapLoading = shallowRef(true)
const metricsError = shallowRef(false)
const mapError = shallowRef(false)
const hasLoaded = shallowRef(false)
const metricsRetryKey = shallowRef(0)
const summaryId = `locations-summary-${useId()}`
const totalVisits = computed(() => areaData.value.reduce((sum, item) => sum + Number(item.count), 0))
const topAreas = computed(() => [...areaData.value]
  .sort((a, b) => Number(b.count) - Number(a.count))
  .slice(0, 5))
const locationsSummary = computed(() => t('dashboard.analysis.locations_summary', {
  totalVisits: formatNumber(totalVisits.value),
  countryCount: areaData.value.length,
}))

const chartConfig = computed<ChartConfig>(() => ({
  count: {
    label: t('dashboard.visits'),
    color: 'var(--chart-1)',
  },
}))

async function getWorldMapJSON() {
  mapLoading.value = true
  mapError.value = false
  try {
    const data = await $fetch('/world.json')
    worldMapTopoJSON.value = data as Record<string, unknown>
  }
  catch {
    mapError.value = true
  }
  finally {
    mapLoading.value = false
  }
}

watch([() => analysisStore.dateRange, () => analysisStore.filters, metricsRetryKey], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  metricsError.value = false
  try {
    const result = await useAPI<{ data: Array<{ name: string, count: number }> }>('/api/stats/metrics', {
      signal: controller.signal,
      query: {
        ...analysisStore.filters,
        type: 'country',
        id: id.value,
        startAt: analysisStore.dateRange.startAt,
        endAt: analysisStore.dateRange.endAt,
      },
    })
    if (!controller.signal.aborted && Array.isArray(result.data)) {
      areaData.value = result.data.map(country => ({
        ...country,
        id: country.name,
      }))
      hasLoaded.value = true
    }
  }
  catch {
    if (!controller.signal.aborted)
      metricsError.value = true
  }
  finally {
    if (!controller.signal.aborted)
      loading.value = false
  }
}, { immediate: true })

onMounted(() => {
  getWorldMapJSON()
})

let tooltipCache = new WeakMap<object, string>()

watch(locale, () => {
  tooltipCache = new WeakMap()
})

function tooltipTemplate(d: any): string {
  const data = d?.data ?? d
  if (!data?.name)
    return ''

  if (tooltipCache.has(data))
    return tooltipCache.get(data) as string

  data.displayName = getRegionName(data.name, locale.value)

  const div = document.createElement('div')
  // ChartTooltipContent.x is typed as number | Date; use labelKey for region names.
  const vnode = h(ChartTooltipContent, {
    payload: { count: data.count, name: data.displayName },
    config: chartConfig.value,
    labelKey: 'name',
  })
  render(vnode, div)
  const html = div.innerHTML
  tooltipCache.set(data, html)
  return html
}
</script>

<template>
  <Card
    class="
      flex flex-col
      lg:h-[500px]
    "
  >
    <CardHeader>
      <CardTitle><h2>{{ $t('dashboard.locations') }}</h2></CardTitle>
    </CardHeader>
    <CardContent class="relative min-h-64 flex-1" :aria-busy="loading || mapLoading">
      <div
        v-if="mapError || metricsError"
        class="
          absolute inset-0 flex flex-col items-center justify-center gap-4
          text-sm text-destructive
        "
        role="alert"
      >
        <div v-if="mapError" class="flex flex-col items-center gap-2">
          <span>{{ $t('dashboard.realtime.stats_error') }}</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            class="text-destructive"
            :aria-label="`${$t('common.try_again')}: ${$t('dashboard.locations')}`"
            @click="getWorldMapJSON"
          >
            {{ $t('common.try_again') }}
          </Button>
        </div>
        <div v-if="metricsError" class="flex flex-col items-center gap-2">
          <span>{{ $t('dashboard.realtime.stats_error') }}</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            class="text-destructive"
            :aria-label="`${$t('common.try_again')}: ${$t('dashboard.metrics.country')}`"
            @click="metricsRetryKey++"
          >
            {{ $t('common.try_again') }}
          </Button>
        </div>
      </div>
      <div
        v-else-if="(loading && !hasLoaded) || (mapLoading && !worldMapTopoJSON.type)"
        class="absolute inset-0 overflow-hidden"
        role="status"
        aria-busy="true"
      >
        <span class="sr-only">{{ $t('dashboard.loading') }}</span>
        <Skeleton aria-hidden="true" class="size-full rounded-none" />
      </div>
      <div
        v-else-if="hasLoaded && !areaData.length"
        class="
          absolute inset-0 flex items-center justify-center text-sm
          text-muted-foreground
        "
        role="status"
      >
        {{ $t('dashboard.no_data') }}
      </div>
      <VisSingleContainer
        v-else-if="worldMapTopoJSON.type"
        :data="{ areas: areaData }"
        :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
        class="absolute inset-0"
        role="img"
        :aria-label="locationsSummary"
        :aria-describedby="summaryId"
      >
        <VisTopoJSONMap
          :topojson="worldMapTopoJSON"
          map-feature-name="countries"
        />
        <VisTooltip
          :horizontal-shift="20"
          :vertical-shift="20"
          :triggers="{
            [VisTopoJSONMapSelectors.feature]: tooltipTemplate,
          }"
          :attributes="{
            style: '--vis-tooltip-padding: 0; --vis-tooltip-background-color: transparent; --vis-tooltip-border-color: transparent; --vis-tooltip-shadow-color: transparent;',
          }"
        />
      </VisSingleContainer>
      <div v-if="hasLoaded && areaData.length" :id="summaryId" class="sr-only">
        <p>{{ locationsSummary }}</p>
        <ul>
          <li v-for="area in topAreas" :key="area.id">
            {{ getRegionName(area.name, locale) }}: {{ formatNumber(Number(area.count)) }}
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
</template>
