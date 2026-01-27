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
    class="block w-full truncate"
  >
    <Avatar
      class="float-left h-5 w-5 p-0.5"
    >
      <AvatarImage
        :src="`https://unavatar.webp.se/${name}?fallback=false`"
        :alt="name"
        loading="lazy"
      />
      <AvatarFallback>
        <img
          src="/icon.png"
          :alt="name"
          loading="lazy"
        >
      </AvatarFallback>
    </Avatar>
    <span>{{ name }}</span>
  </a>
</template>
