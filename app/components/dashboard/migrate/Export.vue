<script setup lang="ts">
import type { Link } from '@@/app/types'
import { Download, Loader } from 'lucide-vue-next'
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
const isExporting = ref(false)
const exportedCount = ref(0)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function handleExport() {
  isExporting.value = true
  exportedCount.value = 0

  try {
    const allLinks: Link[] = []
    let cursor: string | undefined
    let listComplete = false

    while (!listComplete) {
      const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const data = await useAPI<ExportResponse>(`/api/link/export${params}`)

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

    saveAsJson(exportData, `sink-links-${Date.now()}.json`)

    toast.success(t('migrate.export.success'))
  }
  catch (error) {
    toast.error(t('migrate.export.failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    isExporting.value = false
    exportedCount.value = 0
  }
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader>
      <CardTitle>{{ $t('migrate.export.title') }}</CardTitle>
      <CardDescription>{{ $t('migrate.export.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button :disabled="isExporting" @click="handleExport">
        <Loader v-if="isExporting" class="mr-2 h-4 w-4 animate-spin" />
        <Download v-else class="mr-2 h-4 w-4" />
        <template v-if="isExporting && exportedCount > 0">
          {{ exportedCount }} {{ $t('migrate.export.total_links') }}...
        </template>
        <template v-else>
          {{ $t('migrate.export.button') }}
        </template>
      </Button>
    </CardContent>
  </Card>
</template>
