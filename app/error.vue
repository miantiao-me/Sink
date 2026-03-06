<script setup lang="ts">
import type { NuxtError } from '#app'
import errorImage from './assets/images/404.svg?raw'

defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <NuxtLayout name="default">
    <a
      class="
        mx-auto flex h-full w-full max-w-[600px] items-center justify-center
        [&_svg]:w-full
      "
      href="/"
      v-html="errorImage"
    />
  </NuxtLayout>
</template>
