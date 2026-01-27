<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})
</script>

<template>
  <main
    class="
      w-full
      md:h-full md:overflow-hidden
    "
  >
    <DashboardRealtime />
  </main>
</template>
