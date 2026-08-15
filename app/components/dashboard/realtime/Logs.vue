<script setup lang="ts">
const emit = defineEmits<{
  errorChange: [value: boolean]
}>()

const { logs, loading, error, hasSnapshot, isPaused, retry } = useRealtimeLogs()

watch(error, value => emit('errorChange', value), { immediate: true })
</script>

<template>
  <section class="lg:w-72" :aria-label="$t('nav.realtime')">
    <div
      v-if="error && !logs.length"
      class="flex h-full items-center justify-center text-sm text-destructive"
      role="alert"
    >
      {{ $t('dashboard.realtime.events_error') }}
      <Button type="button" variant="link" class="text-destructive" @click="retry">
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <div
      v-else-if="loading && !hasSnapshot"
      class="h-full overflow-hidden"
      role="status"
      aria-busy="true"
    >
      <span class="sr-only">{{ $t('dashboard.loading') }}</span>
      <div
        aria-hidden="true"
        class="flex h-full flex-col gap-2 overflow-hidden p-2"
      >
        <div
          v-for="index in 5"
          :key="index"
          class="
            relative mx-auto my-1 w-full shrink-0 rounded-lg border
            border-border bg-card p-2 shadow-sm
          "
        >
          <div class="flex items-center gap-2">
            <Skeleton class="size-10 shrink-0 rounded-md" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex min-w-0 items-center gap-2">
                <Skeleton class="h-4 min-w-0 flex-1" />
                <Skeleton class="h-3 w-10 shrink-0" />
              </div>
              <Skeleton class="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else-if="!logs.length"
      class="
        flex h-full items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </div>
    <div v-else class="flex h-full min-h-0 flex-col">
      <div
        v-if="error"
        class="flex items-center justify-center text-sm text-destructive"
        role="alert"
      >
        {{ $t('dashboard.realtime.events_error') }}
        <Button type="button" variant="link" class="text-destructive" @click="retry">
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <SparkUiAnimatedList
        class="min-h-0 flex-1"
        role="log"
        :aria-live="isPaused ? 'off' : 'polite'"
        aria-relevant="additions"
      >
        <SparkUiNotification
          v-for="item in logs"
          :key="item.id"
          :name="item.slug"
          :description="[item.os, item.browser].filter(Boolean).join(' ')"
          :icon="getFlag(item.country || '')"
          :time="item.timestamp"
          class="w-full"
        />
      </SparkUiAnimatedList>
    </div>
  </section>
</template>
