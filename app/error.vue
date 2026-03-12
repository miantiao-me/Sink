<script setup lang="ts">
import type { NuxtError } from '#app'
import { sendRedirect } from 'h3'

defineProps<{ error: NuxtError }>()

const slug = useRoute().path.replace(/^\//, '')
const event = useRequestEvent()

if (event) {
  await sendRedirect(event, `https://onyst.it/${slug}`, 301)
}
else {
  window.location.replace(`https://onyst.it/${slug}`)
}
</script>

<template>
  <div />
</template>
