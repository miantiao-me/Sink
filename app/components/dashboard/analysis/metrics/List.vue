<script setup lang="ts">
import type { MetricItem } from '@/types'
import { VList } from 'virtua/vue'

const props = withDefaults(defineProps<{
  metrics: MetricItem[]
  type: string
  viewportHeight?: number
}>(), {
  viewportHeight: 342,
})

const { locale } = useI18n()
</script>

<template>
  <div class="w-full text-sm">
    <div
      class="
        flex justify-between border-b leading-[48px] transition-colors
        hover:bg-muted/50
        motion-reduce:transition-none
      "
    >
      <div
        class="
          h-12 px-4 text-left align-middle font-medium text-muted-foreground
        "
      >
        {{ $t('dashboard.name') }}
      </div>
      <div
        class="
          h-12 px-4 text-right align-middle font-medium text-muted-foreground
        "
      >
        {{ $t('dashboard.count') }}
      </div>
    </div>
    <VList
      v-slot="{ item: metric }"
      :data="metrics"
      :style="{ height: `${props.viewportHeight}px` }"
    >
      <div
        class="
          border-b px-4 py-2 transition-colors
          hover:bg-muted/50
          motion-reduce:transition-none
        "
      >
        <div class="flex items-start justify-between gap-3">
          <div
            class="min-w-0 flex-1 leading-5"
          >
            <DashboardAnalysisMetricsName
              :name="metric.name"
              :type="type"
            />
          </div>
          <div
            class="shrink-0 text-right tabular-nums"
          >
            {{ formatNumber(metric.count, locale) }}
            <span class="text-xs text-muted-foreground">({{ metric.percent }}%)</span>
          </div>
        </div>
        <div
          class="flex-1"
        >
          <Progress
            v-model="metric.percent"
            class="h-2"
            :aria-label="`${$t('dashboard.count')}: ${metric.percent}%`"
          />
        </div>
      </div>
    </VList>
  </div>
</template>

<style scoped>
:deep([data-slot='progress']) {
  background-color: var(--muted);
}

:deep([data-slot='progress-indicator']) {
  background-color: var(--chart-1);
}
</style>
