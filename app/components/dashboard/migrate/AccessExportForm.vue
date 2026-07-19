<script setup lang="ts">
import type { DateRange } from 'reka-ui'
import { Download, Loader } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { createExportFilename } from '#shared/utils/export-file'

interface AccessExportValues {
  datePreset: string | null
  startAt: number
  endAt: number
  slug: string
}

const { t, locale } = useI18n()
const openCustomDateRange = ref(false)
const customDateRange = ref<DateRange | undefined>()
const isExporting = ref(false)

const defaultDateRange = computeDateRange('last-7d', locale.value)
const defaultValues: AccessExportValues = {
  datePreset: 'last-7d',
  startAt: defaultDateRange[0],
  endAt: defaultDateRange[1],
  slug: '',
}

const form = useForm({
  defaultValues,
  onSubmit: async ({ value }) => {
    isExporting.value = true
    try {
      const csv = await useAPI<string>('/api/stats/export', {
        responseType: 'text',
        query: {
          startAt: value.startAt,
          endAt: value.endAt,
          slug: value.slug || undefined,
        },
      })

      saveAsCsv(csv, createExportFilename('sink-access', 'csv'))
      toast.success(t('migrate.access_export.success'))
    }
    catch (error) {
      toast.error(t('migrate.access_export.failed'), {
        description: error instanceof Error ? error.message : String(error),
      })
    }
    finally {
      isExporting.value = false
    }
  },
})

const currentStartAt = form.useStore(state => state.values.startAt)
const currentEndAt = form.useStore(state => state.values.endAt)
const currentDatePreset = form.useStore(state => state.values.datePreset)

const dateRangeLabel = computed(() => `${shortDate(currentStartAt.value, locale.value)} - ${shortDate(currentEndAt.value, locale.value)}`)

const slugFilterSchema = z.string().max(2048)
const validateSlugFilter = makeZodValidator(slugFilterSchema)

function setDateRange(range: [number, number]) {
  form.setFieldValue('startAt', range[0])
  form.setFieldValue('endAt', range[1])
}

function onPresetChange(value: string | number | bigint | Record<string, unknown> | null) {
  if (typeof value !== 'string')
    return

  if (value === 'custom') {
    customDateRange.value = {
      start: unix2date(currentStartAt.value),
      end: unix2date(currentEndAt.value),
    }
    openCustomDateRange.value = true
    form.setFieldValue('datePreset', null)
    return
  }

  form.setFieldValue('datePreset', value)
  setDateRange(computeDateRange(value, locale.value))
}

function updateCustomDateRange(value: DateRange) {
  if (!value.start || !value.end)
    return

  setDateRange([date2unix(value.start, 'start'), date2unix(value.end, 'end')])
  customDateRange.value = value
  form.setFieldValue('datePreset', null)
  openCustomDateRange.value = false
}
</script>

<template>
  <form class="space-y-4" :aria-busy="isExporting" @submit.prevent="form.handleSubmit">
    <FieldGroup>
      <form.Field name="datePreset">
        <Field>
          <FieldLabel for="access-export-date-range">
            {{ $t('migrate.access_export.date_range') }}
          </FieldLabel>
          <Select :model-value="currentDatePreset" @update:model-value="onPresetChange">
            <SelectTrigger id="access-export-date-range">
              <SelectValue v-if="currentDatePreset" />
              <div v-else>
                {{ dateRangeLabel }}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">
                {{ $t('dashboard.date_picker.today') }}
              </SelectItem>
              <SelectItem value="last-24h">
                {{ $t('dashboard.date_picker.last_24h') }}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="this-week">
                {{ $t('dashboard.date_picker.this_week') }}
              </SelectItem>
              <SelectItem value="last-7d">
                {{ $t('dashboard.date_picker.last_7d') }}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="this-month">
                {{ $t('dashboard.date_picker.this_month') }}
              </SelectItem>
              <SelectItem value="last-30d">
                {{ $t('dashboard.date_picker.last_30d') }}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="last-90d">
                {{ $t('dashboard.date_picker.last_90d') }}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="custom">
                {{ $t('dashboard.date_picker.custom') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </form.Field>

      <form.Field
        v-slot="{ field }"
        name="slug"
        :validators="{ onChange: validateSlugFilter }"
      >
        <Field>
          <FieldLabel id="access-export-slug-label">
            {{ $t('migrate.access_export.slug_label') }}
          </FieldLabel>
          <DashboardFilters
            :filters="{ slug: field.state.value }"
            :debounce="0"
            aria-labelledby="access-export-slug-label"
            @change="(_, value) => field.handleChange(value)"
          />
          <FieldDescription>{{ $t('migrate.access_export.slug_description') }}</FieldDescription>
          <FieldError :errors="field.state.meta.errors" />
        </Field>
      </form.Field>
    </FieldGroup>

    <Button
      type="submit"
      :disabled="isExporting"
      :aria-busy="isExporting"
    >
      <Loader
        v-if="isExporting" aria-hidden="true" class="
          mr-2 size-4
          motion-safe:animate-spin
        "
      />
      <Download v-else aria-hidden="true" class="mr-2 size-4" />
      <template v-if="isExporting">
        {{ $t('migrate.access_export.exporting') }}
      </template>
      <template v-else>
        {{ $t('migrate.access_export.button') }}
      </template>
    </Button>
  </form>

  <DashboardMigrateAccessExportDateRangeDialog
    v-model:open="openCustomDateRange"
    :range="customDateRange"
    @select="updateCustomDateRange"
  />
</template>
