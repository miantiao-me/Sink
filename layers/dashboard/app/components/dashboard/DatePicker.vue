<script setup lang="ts">
import type { DateRange, DateValue } from 'reka-ui'
import { getLocalTimeZone } from '@internationalized/date'

const analysisStore = useDashboardAnalysisStore()

const openCustomDateRange = ref(false)
const customDate = ref<DateValue | undefined>()
const customDateRange = ref<DateRange | undefined>()

const tz = getLocalTimeZone()

function updateCustomDate(customDateValue: DateValue) {
  analysisStore.datePreset = null
  analysisStore.updateDateRange([date2unix(customDateValue, 'start'), date2unix(customDateValue, 'end')])
  openCustomDateRange.value = false
  customDate.value = undefined
}

function updateCustomDateRange(customDateRangeValue: DateRange) {
  if (customDateRangeValue.start && customDateRangeValue.end) {
    analysisStore.datePreset = null
    analysisStore.updateDateRange([date2unix(customDateRangeValue.start, 'start'), date2unix(customDateRangeValue.end, 'end')])
    openCustomDateRange.value = false
    customDateRange.value = undefined
  }
}

function isDateDisabled(dateValue: DateValue) {
  return dateValue.toDate(tz) > new Date()
}

function onPresetChange(value: string | number | bigint | Record<string, any> | null) {
  if (typeof value !== 'string')
    return

  if (value === 'custom') {
    openCustomDateRange.value = true
    analysisStore.datePreset = null
    return
  }

  analysisStore.selectPreset(value)
}
</script>

<template>
  <Select :model-value="analysisStore.datePreset" @update:model-value="onPresetChange">
    <SelectTrigger>
      <SelectValue v-if="analysisStore.datePreset" />
      <div v-else>
        {{ shortDate(analysisStore.dateRange.startAt) }} - {{ shortDate(analysisStore.dateRange.endAt) }}
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

  <ResponsiveModal
    v-model:open="openCustomDateRange"
    :title="$t('dashboard.date_picker.custom_title')"
    content-class="w-auto md:max-w-(--breakpoint-md)"
  >
    <Tabs
      default-value="range"
    >
      <div class="flex justify-center">
        <TabsList>
          <TabsTrigger value="date">
            {{ $t('dashboard.date_picker.single_date') }}
          </TabsTrigger>
          <TabsTrigger value="range">
            {{ $t('dashboard.date_picker.date_range') }}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="date"
        class="h-80 overflow-y-auto"
      >
        <Calendar
          :model-value="customDate"
          weekday-format="short"
          :is-date-disabled="isDateDisabled"
          @update:model-value="(date) => date && updateCustomDate(date)"
        />
      </TabsContent>
      <TabsContent
        value="range"
        class="h-80 overflow-y-auto"
      >
        <RangeCalendar
          :model-value="customDateRange"
          initial-focus
          weekday-format="short"
          :number-of-months="2"
          :is-date-disabled="isDateDisabled"
          @update:model-value="updateCustomDateRange"
        />
      </TabsContent>
    </Tabs>
  </ResponsiveModal>
</template>
