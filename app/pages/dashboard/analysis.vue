<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

provide(LINK_ID_KEY, computed(() => undefined))
</script>

<template>
  <main class="space-y-6">
    <DashboardAnalysis />
  </main>
</template>
