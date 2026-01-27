<script setup lang="ts">
withDefaults(defineProps<{
  page: string
  mobileButtons?: boolean
  mobileSearch?: boolean
}>(), {
  mobileButtons: false,
  mobileSearch: false,
})

const analysisStore = useDashboardAnalysisStore()
const realtimeStore = useDashboardRealtimeStore()

function handleDateChange(dateRange: [number, number]) {
  analysisStore.updateDateRange(dateRange)
}

function handleTimeChange(timeRange: [number, number], timeName?: string) {
  realtimeStore.updateTimeRange(timeRange, timeName)
}

function handleAnalysisFilterChange(type: string, value: string) {
  analysisStore.updateFilter(type, value)
}

function handleRealtimeFilterChange(type: string, value: string) {
  realtimeStore.updateFilter(type, value)
}
</script>

<template>
  <template v-if="page === 'links'">
    <template v-if="mobileSearch">
      <LazyDashboardLinksSearch class="w-full" />
    </template>
    <template v-else-if="mobileButtons">
      <LazyDashboardLinksEditor />
      <div class="flex-1" />
      <DashboardLinksSort />
    </template>
    <template v-else>
      <LazyDashboardLinksEditor />
      <DashboardLinksSort />
      <LazyDashboardLinksSearch />
    </template>
  </template>

  <template v-else-if="page === 'link'">
    <template v-if="!mobileSearch">
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardDatePicker @update:date-range="handleDateChange" />
    </template>
  </template>

  <template v-else-if="page === 'analysis'">
    <template v-if="!mobileSearch">
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardDatePicker @update:date-range="handleDateChange" />
      <DashboardFilters @change="handleAnalysisFilterChange" />
    </template>
  </template>

  <template v-else-if="page === 'realtime'">
    <template v-if="!mobileSearch">
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardTimePicker @update:time-range="handleTimeChange" />
      <DashboardFilters @change="handleRealtimeFilterChange" />
    </template>
  </template>
</template>
