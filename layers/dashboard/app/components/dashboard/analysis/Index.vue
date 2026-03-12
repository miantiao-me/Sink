<script setup lang="ts">
import type { Link } from '@/types'

withDefaults(defineProps<{
  link?: Link | null
}>(), {
  link: null,
})

const analysisStore = useDashboardAnalysisStore()

const viewMode = ref<'trend' | 'heatmap'>('trend')
const heatmapMetric = ref<'visits' | 'visitors'>('visits')

onBeforeMount(() => {
  analysisStore.init()
})
</script>

<template>
  <h3 v-if="link" class="text-xl leading-10 font-bold">
    {{ link.slug }} {{ $t('dashboard.stats') }}
  </h3>
  <DashboardAnalysisCounters />
  <Tabs v-model="viewMode" default-value="trend">
    <div class="mb-4 flex items-center justify-between">
      <TabsList>
        <TabsTrigger value="trend">
          {{ $t('dashboard.trend') }}
        </TabsTrigger>
        <TabsTrigger value="heatmap">
          {{ $t('dashboard.weekly_trend') }}
        </TabsTrigger>
      </TabsList>

      <Select v-if="viewMode === 'heatmap'" v-model="heatmapMetric">
        <SelectTrigger class="h-8 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="visits">
            {{ $t('dashboard.visits') }}
          </SelectItem>
          <SelectItem value="visitors">
            {{ $t('dashboard.visitors') }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <TabsContent value="trend" class="mt-0">
      <DashboardAnalysisViews v-if="viewMode === 'trend'" />
    </TabsContent>
    <TabsContent value="heatmap" class="mt-0">
      <DashboardAnalysisHeatmap v-if="viewMode === 'heatmap'" :metric="heatmapMetric" />
    </TabsContent>
  </Tabs>
  <DashboardAnalysisMetrics />
</template>
