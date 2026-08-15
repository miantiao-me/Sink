<script setup lang="ts">
import { AlertCircle, CheckCircle2, Database, Loader, RefreshCw } from '@lucide/vue'

const migration = useLinkMigration()
const manualRunStarted = shallowRef(false)

const markerDate = computed(() => {
  if (!migration.marker.value)
    return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(migration.marker.value.completedAt))
})

onMounted(() => {
  migration.refreshStatus()
})

function runAgain() {
  manualRunStarted.value = true
  void migration.forceMigration()
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader>
      <div class="flex items-start gap-3">
        <Database
          aria-hidden="true" class="
            mt-0.5 size-5 shrink-0 text-muted-foreground
          "
        />
        <div class="space-y-1">
          <CardTitle><h2>{{ $t('migrate.d1.title') }}</h2></CardTitle>
          <CardDescription>{{ $t('migrate.d1.description') }}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <Alert role="status" :aria-live="migration.running.value ? 'polite' : undefined">
        <CheckCircle2
          v-if="migration.completed.value && !migration.running.value"
          aria-hidden="true"
          class="size-4 text-foreground"
        />
        <Loader
          v-else-if="migration.running.value"
          aria-hidden="true"
          class="
            size-4
            motion-safe:animate-spin
          "
        />
        <AlertCircle
          v-else aria-hidden="true" class="size-4 text-muted-foreground"
        />
        <AlertTitle>{{ $t('migrate.d1.status_title') }}</AlertTitle>
        <AlertDescription>
          <p>
            {{ $t(migration.running.value ? 'migrate.d1.running' : migration.completed.value ? 'migrate.d1.status_completed' : 'migrate.d1.status_pending') }}
          </p>
          <p v-if="markerDate" class="text-xs">
            {{ $t('migrate.d1.completed_at', { date: markerDate }) }}
          </p>
          <p
            v-else-if="migration.checked.value && !migration.running.value" class="
              text-xs
            "
          >
            {{ $t('migrate.d1.no_marker') }}
          </p>
        </AlertDescription>
      </Alert>

      <div
        v-if="migration.running.value || migration.totals.value.scanned > 0"
        :role="migration.running.value ? 'status' : undefined"
        :aria-live="migration.running.value ? 'polite' : undefined"
        class="space-y-3"
      >
        <div
          v-if="migration.running.value" class="
            h-1.5 overflow-hidden rounded-full bg-muted
          "
        >
          <div
            class="
              h-full w-1/3 rounded-full bg-primary
              motion-safe:animate-pulse
            "
          />
        </div>
        <div
          class="
            grid grid-cols-2 gap-2 text-sm tabular-nums
            sm:grid-cols-3
          "
        >
          <span>{{ $t('migrate.d1.scanned') }}: {{ migration.totals.value.scanned }}</span>
          <span>{{ $t('migrate.d1.inserted') }}: {{ migration.totals.value.inserted }}</span>
          <span>{{ $t('migrate.d1.skipped') }}: {{ migration.totals.value.skipped }}</span>
          <span>{{ $t('migrate.d1.expired') }}: {{ migration.totals.value.expired }}</span>
          <span>{{ $t('migrate.d1.failed_count') }}: {{ migration.totals.value.failed }}</span>
        </div>
      </div>

      <Alert
        v-if="migration.error.value"
        variant="destructive"
      >
        <AlertCircle aria-hidden="true" />
        <AlertTitle>
          {{ $t('migrate.d1.failed') }}
        </AlertTitle>
        <AlertDescription class="wrap-break-word">
          {{ migration.error.value }}
        </AlertDescription>
      </Alert>
      <Alert
        v-else-if="manualRunStarted && migration.completed.value && !migration.running.value"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>{{ $t('migrate.d1.success') }}</AlertTitle>
      </Alert>

      <Button
        variant="outline"
        :disabled="migration.running.value"
        @click="runAgain"
      >
        <Loader
          v-if="migration.running.value" aria-hidden="true" class="
            size-4
            motion-safe:animate-spin
          "
        />
        <RefreshCw v-else aria-hidden="true" class="size-4" />
        {{ $t(migration.running.value ? 'migrate.d1.running' : 'migrate.d1.run_again') }}
      </Button>
    </CardContent>
  </Card>
</template>
