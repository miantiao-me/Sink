<script setup lang="ts">
import type { Link } from '@/types'
import { getLocalTimeZone, now } from '@internationalized/date'

withDefaults(defineProps<{
  link?: Link | null
}>(), {
  link: null,
})

const analysisStore = useDashboardAnalysisStore()
const tz = getLocalTimeZone()

function initDateRange() {
  if (analysisStore.dateRange.startAt === 0) {
    analysisStore.setDateRange([
      date2unix(now(tz).subtract({ days: 7 })),
      date2unix(now(tz)),
    ])
  }
}

onBeforeMount(() => {
  analysisStore.restoreFromUrl()
  initDateRange()
})
</script>

<template>
  <h3 v-if="link" class="text-xl leading-10 font-bold">
    {{ link.slug }} {{ $t('dashboard.stats') }}
  </h3>
  <DashboardAnalysisCounters />
  <DashboardAnalysisViews />
  <DashboardAnalysisMetrics />
</template>
