<script setup>
const { title } = useAppConfig()
</script>

<template>
  <section class="md:pt-6">
    <div
      class="
        container flex flex-col items-center justify-center py-8
        sm:flex-row
      "
    >
      <span
        class="text-sm text-gray-500"
      >
        Powered by
        <a
          href="https://sink.cool"
          target="_blank"
          class="hover:text-gray-700 dark:hover:text-gray-300 underline"
          title="Sink"
        >sink.cool</a>
      </span>
    </div>
  </section>
</template>
