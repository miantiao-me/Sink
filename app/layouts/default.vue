<script setup>
const error = useError()
const is404 = computed(() => error.value?.statusCode === 404)
</script>

<template>
  <main class="flex min-h-screen flex-col">
    <LayoutsHeader v-if="!is404" />
    <section class="flex flex-1">
      <div class="container">
        <slot />
      </div>
    </section>
    <LayoutsFooter v-if="!is404" />
  </main>
</template>
