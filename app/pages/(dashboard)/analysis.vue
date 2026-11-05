<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

provide(LINK_ID_KEY, computed(() => undefined))

const analysisStore = useDashboardAnalysisStore()
useDashboardAnalysisRouteState()

function handleFilterChange(type: string, value: string) {
  analysisStore.updateFilter(type, value)
}
</script>

<template>
  <main class="space-y-6">
    <h1 class="sr-only">
      {{ $t('nav.analysis') }}
    </h1>
    <Teleport to="#dashboard-header-actions" defer>
      <DashboardDatePicker />
      <DashboardFilters :filters="analysisStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardAnalysis />
  </main>
</template>
