<script setup lang="ts">
defineProps<{
  name?: string
}>()
</script>

<template>
  <a
    :href="`http://${name}`"
    target="_blank"
    rel="noopener noreferrer"
    class="flex w-full min-w-0 items-start gap-1"
  >
    <Avatar
      class="size-5 shrink-0 p-0.5"
    >
      <AvatarImage
        :src="`https://unavatar.webp.se/${name}?fallback=false`"
        :alt="name"
        loading="lazy"
        width="20"
        height="20"
      />
      <AvatarFallback>
        <img
          src="/icon.png"
          :alt="name"
          loading="lazy"
          width="20"
          height="20"
        >
      </AvatarFallback>
    </Avatar>
    <span class="min-w-0 break-all">{{ name }}</span>
  </a>
</template>
