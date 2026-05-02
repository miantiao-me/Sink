<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

provide(LINK_ID_KEY, computed(() => undefined))

const analysisStore = useDashboardAnalysisStore()

function handleFilterChange(type: string, value: string) {
  analysisStore.updateFilter(type, value)
}
</script>

<template>
  <main class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardDatePicker />
      <DashboardFilters :filters="analysisStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardAnalysis />
  </main>
</template>
