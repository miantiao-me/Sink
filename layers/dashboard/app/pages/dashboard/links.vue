<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})
</script>

<template>
  <main class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <DashboardLinksEditor />
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardLinksSort />
      <DashboardLinksSearch
        class="max-sm:w-full"
      />
    </Teleport>

    <DashboardLinks />
  </main>
</template>
