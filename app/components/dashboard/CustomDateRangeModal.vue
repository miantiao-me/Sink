<script setup lang="ts">
import type { DateRange, DateValue } from 'reka-ui'
import { getLocalTimeZone } from '@internationalized/date'
import { useMediaQuery } from '@vueuse/core'

const emit = defineEmits<{
  select: [range: [number, number]]
}>()

const open = defineModel<boolean>('open', { default: false })
const isDesktop = useMediaQuery('(min-width: 640px)')
const customDate = ref<DateValue | undefined>()
const customDateRange = ref<DateRange | undefined>()
const tz = getLocalTimeZone()

function updateCustomDate(customDateValue: DateValue) {
  emit('select', [date2unix(customDateValue, 'start'), date2unix(customDateValue, 'end')])
  open.value = false
  customDate.value = undefined
}

function updateCustomDateRange(customDateRangeValue: DateRange) {
  if (!customDateRangeValue.start || !customDateRangeValue.end)
    return

  emit('select', [
    date2unix(customDateRangeValue.start, 'start'),
    date2unix(customDateRangeValue.end, 'end'),
  ])
  open.value = false
  customDateRange.value = undefined
}

function isDateDisabled(dateValue: DateValue) {
  return dateValue.toDate(tz) > new Date()
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="$t('dashboard.date_picker.custom_title')"
    content-class="w-[calc(100vw_-_2rem)] overflow-x-hidden sm:w-auto md:max-w-(--breakpoint-md)"
  >
    <Tabs
      default-value="range"
    >
      <div class="flex justify-center">
        <TabsList>
          <TabsTrigger
            value="date"
          >
            {{ $t('dashboard.date_picker.single_date') }}
          </TabsTrigger>
          <TabsTrigger
            value="range"
          >
            {{ $t('dashboard.date_picker.date_range') }}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="date"
        class="h-80 overflow-x-hidden overflow-y-auto"
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
        class="h-80 overflow-x-hidden overflow-y-auto"
      >
        <RangeCalendar
          :model-value="customDateRange"
          initial-focus
          weekday-format="short"
          :number-of-months="isDesktop ? 2 : 1"
          :is-date-disabled="isDateDisabled"
          @update:model-value="updateCustomDateRange"
        />
      </TabsContent>
    </Tabs>
  </ResponsiveModal>
</template>
