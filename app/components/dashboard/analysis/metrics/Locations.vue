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

const chartConfig = computed<ChartConfig>(() => ({
  count: {
    label: t('dashboard.visits'),
    color: 'var(--chart-1)',
  },
}))

async function getWorldMapJSON() {
  const data = await $fetch('/world.json')
  worldMapTopoJSON.value = data as Record<string, unknown>
}

async function getMapData() {
  areaData.value = []
  const result = await useAPI<{ data: Array<{ name: string, count: number }> }>('/api/stats/metrics', {
    query: {
      type: 'country',
      id: id.value,
      startAt: analysisStore.dateRange.startAt,
      endAt: analysisStore.dateRange.endAt,
      ...analysisStore.filters,
    },
  })
  if (Array.isArray(result.data)) {
    areaData.value = result.data.map(country => ({
      ...country,
      id: country.name,
    }))
  }
}

watch([() => analysisStore.dateRange, () => analysisStore.filters], getMapData, {
  deep: true,
})

onMounted(() => {
  getWorldMapJSON()
  getMapData()
})

let tooltipCache = new WeakMap<object, string>()

watch(locale, () => {
  tooltipCache = new WeakMap()
})

function tooltipTemplate(d: any): string {
  // VisTopoJSONMap 传入的数据结构可能是嵌套的
  const data = d?.data ?? d
  if (!data?.name)
    return ''

  // 检查缓存
  if (tooltipCache.has(data))
    return tooltipCache.get(data) as string

  data.displayName = getRegionName(data.name, locale.value)

  const div = document.createElement('div')
  const vnode = h(ChartTooltipContent, {
    payload: { count: data.count },
    config: chartConfig.value,
    x: data.displayName,
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
      md:h-[500px]
    "
  >
    <CardHeader>
      <CardTitle>{{ $t('dashboard.locations') }}</CardTitle>
    </CardHeader>
    <CardContent class="relative flex-1">
      <VisSingleContainer
        v-if="worldMapTopoJSON.type"
        :data="{ areas: areaData }"
        :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
        class="absolute inset-0"
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
    </CardContent>
  </Card>
</template>
