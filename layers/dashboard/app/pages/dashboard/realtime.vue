<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const realtimeStore = useDashboardRealtimeStore()

function handleFilterChange(type: string, value: string) {
  realtimeStore.updateFilter(type, value)
}
</script>

<template>
  <main
    class="
      w-full
      md:h-full md:overflow-hidden
    "
  >
    <Teleport to="#dashboard-header-actions" defer>
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardTimePicker />
      <DashboardFilters :filters="realtimeStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardRealtime />
  </main>
</template>
