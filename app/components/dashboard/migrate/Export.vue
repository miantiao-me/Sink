<script setup lang="ts">
import type { Link } from '@/types'
import { createExportFilename } from '#shared/utils/export-file'
import { Download, Loader } from '@lucide/vue'
import { toast } from 'vue-sonner'

interface ExportResponse {
  version: string
  exportedAt: string
  count: number
  links: Link[]
  cursor?: string
  list_complete: boolean
}

const { t } = useI18n()
const exportingStatus = ref<'all' | 'active' | 'expired' | null>(null)
const exportedCount = ref(0)
const isExporting = computed(() => exportingStatus.value !== null)

const exportOptions = [
  { status: 'all', labelKey: 'migrate.export.button', variant: 'default' },
  { status: 'active', labelKey: 'migrate.export.button_active', variant: 'secondary' },
  { status: 'expired', labelKey: 'migrate.export.button_expired', variant: 'secondary' },
] as const

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function handleExport(status: 'all' | 'active' | 'expired') {
  exportingStatus.value = status
  exportedCount.value = 0

  try {
    const allLinks: Link[] = []
    let cursor: string | undefined
    let listComplete = false

    while (!listComplete) {
      const params = new URLSearchParams({ status })
      if (cursor)
        params.set('cursor', cursor)
      const data = await useAPI<ExportResponse>(`/api/link/export?${params}`)

      allLinks.push(...data.links)
      exportedCount.value = allLinks.length
      listComplete = data.list_complete
      cursor = data.cursor

      if (!listComplete) {
        await sleep(1000)
      }
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: allLinks.length,
      links: allLinks,
    }

    saveAsJson(exportData, createExportFilename('sink-links', 'json'))

    toast.success(t('migrate.export.success'))
  }
  catch (error) {
    toast.error(t('migrate.export.failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    exportingStatus.value = null
    exportedCount.value = 0
  }
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader>
      <CardTitle><h2>{{ $t('migrate.export.title') }}</h2></CardTitle>
      <CardDescription>{{ $t('migrate.export.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap gap-2">
      <Button
        v-for="option in exportOptions"
        :key="option.status"
        :variant="option.variant"
        class="tabular-nums"
        :disabled="isExporting"
        :aria-busy="exportingStatus === option.status"
        @click="handleExport(option.status)"
      >
        <Loader
          v-if="exportingStatus === option.status" aria-hidden="true" class="
            size-4
            motion-safe:animate-spin
          "
        />
        <Download v-else aria-hidden="true" class="size-4" />
        <template v-if="exportingStatus === option.status && exportedCount > 0">
          {{ exportedCount }} {{ $t('migrate.export.total_links') }}…
        </template>
        <template v-else>
          {{ $t(option.labelKey) }}
        </template>
      </Button>
    </CardContent>
  </Card>
</template>
