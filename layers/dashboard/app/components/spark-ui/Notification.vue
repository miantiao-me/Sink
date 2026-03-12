<script setup lang='ts'>
import { cn } from '@/lib/utils'

const props = defineProps<{
  name: string
  class?: string
  description: string
  icon?: string
  color?: string
  time: number
}>()
</script>

<template>
  <figure
    :class="cn(
      'relative mx-auto my-1 min-h-fit w-full cursor-pointer rounded-2xl border',
      `
        transform-gpu transition-transform duration-200 ease-in-out
        hover:scale-[103%]
      `,
      'bg-white',
      `
        dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]
        dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]
      `,
      props.class,
    )"
  >
    <div class="flex flex-row items-center gap-2 px-2 py-2">
      <div
        class="flex size-10 items-center justify-center rounded-2xl"
        :style="{ backgroundColor: props.color || 'transparent' }"
      >
        <span class="text-lg">{{ props.icon }}</span>
      </div>
      <div class="flex flex-col overflow-hidden">
        <div
          class="flex flex-row items-center text-lg font-medium whitespace-pre"
        >
          <span
            class="
              text-sm text-foreground
              sm:text-lg
            "
          >{{ props.name }}</span>
          <span class="mx-1">·</span>
          <span class="text-xs text-gray-500">{{ shortTime(props.time) }}</span>
        </div>
        <p class="text-sm font-normal">
          {{ props.description }}
        </p>
      </div>
    </div>
  </figure>
</template>
