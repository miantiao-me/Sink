import type { ImportData, ImportResult, ImportResultItem } from '#shared/schemas/import'
import { computed, readonly, shallowRef } from 'vue'
import { toast } from 'vue-sonner'
import { ImportDataSchema } from '#shared/schemas/import'
import { createExportFilename } from '#shared/utils/export-file'
import { useAPI } from '@/utils/api'
import { saveAsJson } from '@/utils/file'

type ImportStatus = 'selecting' | 'ready' | 'importing' | 'complete'

interface UseLinkImportOptions {
  batchSize?: number
  requestImport?: (data: ImportData) => Promise<ImportResult>
  delay?: (ms: number) => Promise<void>
}

function emptyResult(): ImportResult {
  return {
    success: 0,
    skipped: 0,
    failed: 0,
    successItems: [],
    skippedItems: [],
    failedItems: [],
  }
}

export function useLinkImport(options: UseLinkImportOptions = {}) {
  const { t } = useI18n()
  const batchSize = options.batchSize ?? Math.floor(+useRuntimeConfig().public.kvBatchLimit / 2)
  const requestImport = options.requestImport ?? (data => useAPI<ImportResult>('/api/link/import', {
    method: 'POST',
    body: data,
  }))
  const delay = options.delay ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))

  const status = shallowRef<ImportStatus>('selecting')
  const selectedFile = shallowRef<File | null>(null)
  const parsedData = shallowRef<ImportData | null>(null)
  const parseError = shallowRef<string | null>(null)
  const validationErrors = shallowRef<string[]>([])
  const importProgress = shallowRef(0)
  const importResult = shallowRef<ImportResult | null>(null)
  const isImporting = computed(() => status.value === 'importing')

  async function handleFile(file: File) {
    selectedFile.value = file
    parsedData.value = null
    parseError.value = null
    validationErrors.value = []
    importResult.value = null
    importProgress.value = 0
    status.value = 'selecting'

    if (!file.name.endsWith('.json')) {
      parseError.value = t('migrate.import.errors.invalid_json')
      return
    }

    let data: unknown
    try {
      data = JSON.parse(await file.text())
    }
    catch {
      parseError.value = t('migrate.import.errors.parse_error')
      return
    }

    const result = ImportDataSchema.safeParse(data)
    if (!result.success) {
      const errors = result.error.issues.slice(0, 10).map((error) => {
        const path = error.path.join('.')
        return `${path}: ${error.message}`
      })
      if (result.error.issues.length > 10)
        errors.push(`… (+${result.error.issues.length - 10})`)

      validationErrors.value = errors
      parseError.value = t('migrate.import.errors.invalid_format')
      return
    }

    parsedData.value = result.data
    status.value = 'ready'
  }

  function mergeBatchResult(result: ImportResult, batchResult: ImportResult, batchStart: number) {
    result.success += batchResult.success
    result.skipped += batchResult.skipped
    result.failed += batchResult.failed
    result.successItems.push(...offsetItems(batchResult.successItems, batchStart))
    result.skippedItems.push(...offsetItems(batchResult.skippedItems, batchStart))
    result.failedItems.push(...offsetItems(batchResult.failedItems, batchStart))
  }

  function offsetItems<T extends ImportResultItem>(items: T[], offset: number): T[] {
    return items.map(item => ({ ...item, index: item.index + offset }))
  }

  async function importLinks() {
    if (!parsedData.value || status.value !== 'ready')
      return

    status.value = 'importing'
    importProgress.value = 0
    importResult.value = null

    const importData = parsedData.value
    const allLinks = importData.links
    const totalBatches = Math.ceil(allLinks.length / batchSize)
    const result = emptyResult()

    for (let index = 0; index < totalBatches; index++) {
      const batchStart = index * batchSize
      const batch = allLinks.slice(batchStart, Math.min((index + 1) * batchSize, allLinks.length))

      try {
        const batchResult = await requestImport({
          version: importData.version,
          links: batch,
        })
        mergeBatchResult(result, batchResult, batchStart)
      }
      catch (error) {
        for (const [itemIndex, link] of batch.entries()) {
          result.failed++
          result.failedItems.push({
            index: batchStart + itemIndex,
            slug: link.slug,
            url: link.url,
            reason: error instanceof Error
              ? error.message
              : t('migrate.import.errors.batch_failed'),
          })
        }
      }

      importProgress.value = Math.round(((index + 1) / totalBatches) * 100)
      if (index < totalBatches - 1)
        await delay(1000)
    }

    importResult.value = result
    status.value = 'complete'
    if (result.success > 0)
      toast.success(t('migrate.import.result.success_message', { count: result.success }))
  }

  function downloadItems(
    items: ImportResultItem[] | undefined,
    filename: string,
    transform?: (item: ImportResultItem, originalLink: unknown) => unknown,
  ) {
    if (!items?.length)
      return

    const links = items.map((item) => {
      const originalLink = parsedData.value?.links[item.index]
      return transform ? transform(item, originalLink) : { ...originalLink }
    })

    saveAsJson({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: links.length,
      links,
    }, createExportFilename(`sink-import-${filename}`, 'json'))
  }

  function downloadSuccessItems() {
    downloadItems(importResult.value?.successItems, 'success')
  }

  function downloadSkippedItems() {
    downloadItems(importResult.value?.skippedItems, 'skipped')
  }

  function downloadFailedItems() {
    downloadItems(importResult.value?.failedItems, 'failed', (item, originalLink) => ({
      ...(originalLink as object),
      _importError: (item as ImportResultItem & { reason: string }).reason,
    }))
  }

  function reset() {
    if (status.value === 'importing')
      return

    status.value = 'selecting'
    selectedFile.value = null
    parsedData.value = null
    parseError.value = null
    validationErrors.value = []
    importResult.value = null
    importProgress.value = 0
  }

  return {
    selectedFile: readonly(selectedFile),
    parsedData: readonly(parsedData),
    parseError: readonly(parseError),
    validationErrors: readonly(validationErrors),
    isImporting,
    importProgress: readonly(importProgress),
    importResult: readonly(importResult),
    handleFile,
    importLinks,
    downloadSuccessItems,
    downloadSkippedItems,
    downloadFailedItems,
    reset,
  }
}
