<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  name: string
  class?: string
  description: string
  icon?: string
  time: number
}>()

const { locale } = useI18n()

const dateTime = computed(() => new Date(props.time * 1000).toISOString())
</script>

<template>
  <article
    :class="cn(
      `
        relative mx-auto my-1 min-h-fit w-full rounded-lg border border-border
        bg-card text-card-foreground shadow-sm
      `,
      props.class,
    )"
  >
    <div class="flex flex-row items-center gap-2 p-2">
      <div
        class="
          flex size-10 shrink-0 items-center justify-center rounded-md
          bg-secondary text-secondary-foreground
        "
      >
        <span aria-hidden="true" class="text-lg">{{ props.icon }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div
          class="flex min-w-0 flex-row items-center text-lg font-medium"
        >
          <span
            :title="props.name"
            class="
              min-w-0 truncate text-sm text-card-foreground
              sm:text-lg
            "
          >{{ props.name }}</span>
          <span aria-hidden="true" class="mx-1 shrink-0">·</span>
          <time
            :datetime="dateTime"
            class="shrink-0 text-xs text-muted-foreground"
          >
            {{ shortTime(props.time, locale) }}
          </time>
        </div>
        <p
          v-if="props.description" class="
            text-sm font-normal wrap-break-word text-muted-foreground
          "
        >
          {{ props.description }}
        </p>
      </div>
    </div>
  </article>
</template>
