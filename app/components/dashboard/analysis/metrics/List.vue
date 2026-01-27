<script setup lang="ts">
import type { MetricItem } from '@/types'
import { VList } from 'virtua/vue'

defineProps<{
  metrics: MetricItem[]
  type: string
}>()
</script>

<template>
  <div class="w-full text-sm">
    <div
      class="
        flex justify-between border-b leading-[48px] transition-colors
        hover:bg-muted/50
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
      :style="{ height: '342px' }"
    >
      <div
        class="
          border-b px-4 py-2 transition-colors
          hover:bg-muted/50
        "
      >
        <div class="flex justify-between">
          <div
            class="flex-1 truncate leading-5"
          >
            <DashboardAnalysisMetricsName
              :name="metric.name"
              :type="type"
            />
          </div>
          <div
            class="text-right"
          >
            {{ formatNumber(metric.count) }}
            <span class="text-xs text-gray-500">({{ metric.percent }}%)</span>
          </div>
        </div>
        <div
          class="flex-1"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger class="w-full">
                <Progress
                  v-model="metric.percent"
                  class="h-2"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ metric.percent }}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
