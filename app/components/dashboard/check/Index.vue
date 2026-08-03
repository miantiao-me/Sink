<script setup lang="ts">
import type { LinkCheckConfig, LinkCheckResult } from '@/types'
import { toast } from 'vue-sonner'
import { generateCsv } from '#shared/utils/csv'
import { toErrorMessage } from '#shared/utils/error'
import { createExportFilename } from '#shared/utils/export-file'

const { t } = useI18n()
const {
  hasLinks,
  totalCount,
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

const checkedCount = computed(() => results.value.length)
const normalCount = computed(() => results.value.filter(result => result.ok).length)
const abnormalCount = computed(() => results.value.filter(result => !result.ok).length)
const networkErrorCount = computed(() => results.value.filter(result => result.status === 0).length)
const progress = computed(() => totalCount.value ? Math.round((checkedCount.value / totalCount.value) * 100) : 0)
const hasResults = computed(() => results.value.length > 0)
const completed = computed(() => hasLinks.value && checkedCount.value === totalCount.value && !checking.value && !wasStopped.value)

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
        <CardTitle><h2>{{ $t('check.title') }}</h2></CardTitle>
        <CardDescription>{{ $t('check.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardCheckConfigForm
          :checking="checking"
          :loading-links="loadingLinks"
          :has-links="hasLinks"
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
      :aria-label="$t('check.title')"
      class="
        grid grid-cols-2 gap-4
        lg:grid-cols-5
      "
    >
      <Card size="sm">
        <CardHeader>
          <CardDescription>{{ $t('check.stats.total') }}</CardDescription>
          <CardTitle class="tabular-nums">
            <h3 :aria-label="`${$t('check.stats.total')}: ${totalCount}`">
              {{ totalCount }}
            </h3>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>{{ $t('check.stats.checked') }}</CardDescription>
          <CardTitle class="tabular-nums">
            <h3 :aria-label="`${$t('check.stats.checked')}: ${checkedCount}`">
              {{ checkedCount }}
            </h3>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>{{ $t('check.stats.normal') }}</CardDescription>
          <CardTitle class="tabular-nums">
            <h3 :aria-label="`${$t('check.stats.normal')}: ${normalCount}`">
              {{ normalCount }}
            </h3>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>{{ $t('check.stats.abnormal') }}</CardDescription>
          <CardTitle class="tabular-nums">
            <h3 :aria-label="`${$t('check.stats.abnormal')}: ${abnormalCount}`">
              {{ abnormalCount }}
            </h3>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card
        size="sm" class="
          col-span-2
          lg:col-span-1
        "
      >
        <CardHeader>
          <CardDescription>{{ $t('check.stats.network_error') }}</CardDescription>
          <CardTitle class="tabular-nums">
            <h3 :aria-label="`${$t('check.stats.network_error')}: ${networkErrorCount}`">
              {{ networkErrorCount }}
            </h3>
          </CardTitle>
        </CardHeader>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle><h2>{{ $t('check.progress.title') }}</h2></CardTitle>
        <CardDescription class="tabular-nums" :role="checking ? 'status' : undefined" :aria-live="checking ? 'polite' : undefined">
          {{ wasStopped ? $t('check.progress.stopped') : $t('check.progress.description', { checked: checkedCount, total: totalCount }) }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress
          :model-value="progress"
          :aria-label="$t('check.progress.title')"
          :aria-valuetext="$t('check.progress.description', { checked: checkedCount, total: totalCount })"
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle><h2>{{ $t('check.results.title') }}</h2></CardTitle>
        <CardDescription>{{ $t('check.results.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <DashboardCheckStatusTabs v-model="activeFilter" :results="results" />
        <DashboardCheckResultsTable :results="filteredResults" :empty-message="emptyMessage" />
      </CardContent>
    </Card>
  </div>
</template>
