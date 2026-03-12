<script setup lang="ts">
defineProps<{
  name?: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/dashboard/link?slug=${name}`"
    class="inline-flex w-full items-center justify-start"
  >
    <span class="w-full truncate">{{ name }}</span>
  </NuxtLink>
</template>
