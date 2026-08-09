<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
</script>

<template>
  <div class="flex flex-1 items-center justify-center px-6 py-16">
    <Loader2
      aria-hidden="true"
      class="
        size-6 text-muted-foreground
        motion-safe:animate-spin
      "
    />
  </div>
</template>
