<script setup lang="ts">
import type { LinkCheckConfig, LinkCheckResult } from '@/types'
import { generateCsv } from '#shared/utils/csv'
import { toErrorMessage } from '#shared/utils/error'
import { createExportFilename } from '#shared/utils/export-file'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const {
  links,
  results,
  loadingLinks,
  checking,
  wasStopped,
  loadLinks,
  startCheck,
  stopCheck,
  clearResults,
} = useLinkCheck()
const activeFilter = ref('abnormal')

const totalCount = computed(() => links.value.length)
const checkedCount = computed(() => results.value.length)
const normalCount = computed(() => results.value.filter(result => result.ok).length)
const abnormalCount = computed(() => results.value.filter(result => !result.ok).length)
const networkErrorCount = computed(() => results.value.filter(result => result.status === 0).length)
const progress = computed(() => totalCount.value ? Math.round((checkedCount.value / totalCount.value) * 100) : 0)
const hasResults = computed(() => results.value.length > 0)
const completed = computed(() => totalCount.value > 0 && checkedCount.value === totalCount.value && !checking.value)

const filteredResults = computed(() => {
  if (activeFilter.value === 'all')
    return results.value

  if (activeFilter.value === 'abnormal')
    return results.value.filter(result => !result.ok)

  if (activeFilter.value.startsWith('status:')) {
    const status = Number(activeFilter.value.replace('status:', ''))
    return results.value.filter(result => result.status === status)
  }

  return results.value
})

const emptyMessage = computed(() => {
  if (!hasResults.value)
    return t('check.empty.not_started')

  if (completed.value && activeFilter.value === 'abnormal' && abnormalCount.value === 0)
    return t('check.empty.no_broken_links')

  return t('check.empty.no_matching_results')
})

const exportDisabled = computed(() => checking.value || abnormalCount.value === 0)

async function reloadLinks() {
  try {
    await loadLinks()
    activeFilter.value = 'abnormal'
  }
  catch (error) {
    console.error(error)
    toast.error(t('check.messages.load_failed'), {
      description: toErrorMessage(error),
    })
  }
}

async function runCheck(config: LinkCheckConfig) {
  try {
    activeFilter.value = 'abnormal'
    const result = await startCheck(config)
    if (result === 'stopped')
      toast(t('check.messages.stopped'))
    else if (result === 'completed')
      toast(t('check.messages.completed'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('check.messages.load_failed'), {
      description: toErrorMessage(error),
    })
  }
}

function resetResults() {
  clearResults()
  activeFilter.value = 'abnormal'
}

function resultText(result: LinkCheckResult): string {
  if (result.status === 0)
    return t('check.result.network_error')

  return result.ok ? t('check.result.normal') : t('check.result.broken')
}

function exportResults() {
  const rows = results.value.filter(result => !result.ok)
  if (!rows.length)
    return

  const header = ['slug', 'url', 'status', 'result', 'error', 'duration', 'checkedAt', 'detailUrl']
  const body = rows.map(result => [
    result.slug,
    result.url,
    result.status,
    resultText(result),
    result.error ?? '',
    result.duration,
    result.checkedAt,
    `${window.location.origin}${getDashboardLinkDetailUrl(result.slug)}`,
  ])

  saveAsCsv(
    generateCsv(header, body),
    createExportFilename('sink-link-check', 'csv'),
  )
}

onMounted(() => {
  reloadLinks()
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>{{ $t('check.title') }}</CardTitle>
        <CardDescription>{{ $t('check.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardCheckConfigForm
          :checking="checking"
          :loading-links="loadingLinks"
          :has-links="links.length > 0"
          :has-results="hasResults"
          :export-disabled="exportDisabled"
          @start="runCheck"
          @stop="stopCheck"
          @clear="resetResults"
          @export="exportResults"
          @reload="reloadLinks"
        />
      </CardContent>
    </Card>

    <section
      class="
        grid grid-cols-2 gap-4
        lg:grid-cols-5
      "
    >
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ $t('check.stats.total') }}</CardDescription>
          <CardTitle>{{ totalCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ $t('check.stats.checked') }}</CardDescription>
          <CardTitle>{{ checkedCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ $t('check.stats.normal') }}</CardDescription>
          <CardTitle>{{ normalCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ $t('check.stats.abnormal') }}</CardDescription>
          <CardTitle>{{ abnormalCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ $t('check.stats.network_error') }}</CardDescription>
          <CardTitle>{{ networkErrorCount }}</CardTitle>
        </CardHeader>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('check.progress.title') }}</CardTitle>
        <CardDescription>
          {{ wasStopped ? $t('check.progress.stopped') : $t('check.progress.description', { checked: checkedCount, total: totalCount }) }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress :model-value="progress" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ $t('check.results.title') }}</CardTitle>
        <CardDescription>{{ $t('check.results.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <DashboardCheckStatusTabs v-model="activeFilter" :results="results" />
        <DashboardCheckResultsTable :results="filteredResults" :empty-message="emptyMessage" />
      </CardContent>
    </Card>
  </div>
</template>
