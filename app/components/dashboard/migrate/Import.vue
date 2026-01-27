<script setup lang="ts">
import type { ImportData } from '@@/schemas/import'
import { ImportDataSchema } from '@@/schemas/import'
import { AlertCircle, CheckCircle, Download, SkipForward, Upload, XCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface ImportResultItem {
  index: number
  slug: string
  url: string
}

interface ImportResult {
  success: number
  skipped: number
  failed: number
  successItems: ImportResultItem[]
  skippedItems: ImportResultItem[]
  failedItems: (ImportResultItem & { reason: string })[]
}

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const BATCH_SIZE = Math.floor(+runtimeConfig.public.kvBatchLimit / 2)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const parsedData = ref<ImportData | null>(null)
const parseError = ref<string | null>(null)
const validationErrors = ref<string[]>([])

const isImporting = ref(false)
const importProgress = ref(0)
const importResult = ref<ImportResult | null>(null)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFile(input.files[0]!)
  }
}

async function handleFile(file: File) {
  selectedFile.value = file
  parsedData.value = null
  parseError.value = null
  validationErrors.value = []
  importResult.value = null

  if (!file.name.endsWith('.json')) {
    parseError.value = t('migrate.import.errors.invalid_json')
    return
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    const result = ImportDataSchema.safeParse(data)

    if (!result.success) {
      const errors = result.error.errors.slice(0, 10).map((err) => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      })
      if (result.error.errors.length > 10) {
        errors.push(`... and ${result.error.errors.length - 10} more errors`)
      }
      validationErrors.value = errors
      parseError.value = t('migrate.import.errors.invalid_format')
      return
    }

    if (result.data.links.length === 0) {
      parseError.value = t('migrate.import.errors.no_links')
      return
    }

    parsedData.value = result.data
  }
  catch {
    parseError.value = t('migrate.import.errors.parse_error')
  }
}

async function handleImport() {
  if (!parsedData.value)
    return

  isImporting.value = true
  importProgress.value = 0
  importResult.value = null

  const allLinks = parsedData.value.links
  const totalBatches = Math.ceil(allLinks.length / BATCH_SIZE)
  const result: ImportResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    successItems: [],
    skippedItems: [],
    failedItems: [],
  }

  for (let i = 0; i < totalBatches; i++) {
    const batchStart = i * BATCH_SIZE
    const batchEnd = Math.min((i + 1) * BATCH_SIZE, allLinks.length)
    const batch = allLinks.slice(batchStart, batchEnd)

    try {
      const batchData: ImportData = {
        version: parsedData.value.version,
        links: batch,
      }
      const batchResult = await useAPI<ImportResult>('/api/link/import', {
        method: 'POST',
        body: batchData,
      })

      result.success += batchResult.success
      result.skipped += batchResult.skipped
      result.failed += batchResult.failed
      result.successItems.push(...batchResult.successItems.map(item => ({
        ...item,
        index: item.index + batchStart,
      })))
      result.skippedItems.push(...batchResult.skippedItems.map(item => ({
        ...item,
        index: item.index + batchStart,
      })))
      result.failedItems.push(...batchResult.failedItems.map(item => ({
        ...item,
        index: item.index + batchStart,
      })))
    }
    catch (error) {
      batch.forEach((link, idx) => {
        result.failed++
        result.failedItems.push({
          index: batchStart + idx,
          slug: link.slug,
          url: link.url,
          reason: error instanceof Error ? error.message : 'Batch import failed',
        })
      })
    }

    importProgress.value = Math.round(((i + 1) / totalBatches) * 100)

    if (i < totalBatches - 1) {
      await sleep(1000)
    }
  }

  importResult.value = result
  isImporting.value = false

  if (result.success > 0) {
    toast.success(t('migrate.import.result.success_message', { count: result.success }))
  }
}

function downloadSuccessItems() {
  if (!importResult.value || importResult.value.successItems.length === 0)
    return

  const successLinks = importResult.value.successItems.map((item) => {
    const originalLink = parsedData.value?.links[item.index]
    return { ...originalLink }
  })

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: successLinks.length,
    links: successLinks,
  }

  saveAsJson(exportData, `sink-import-success-${Date.now()}.json`)
}

function downloadSkippedItems() {
  if (!importResult.value || importResult.value.skippedItems.length === 0)
    return

  const skippedLinks = importResult.value.skippedItems.map((item) => {
    const originalLink = parsedData.value?.links[item.index]
    return { ...originalLink }
  })

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: skippedLinks.length,
    links: skippedLinks,
  }

  saveAsJson(exportData, `sink-import-skipped-${Date.now()}.json`)
}

function downloadFailedItems() {
  if (!importResult.value || importResult.value.failedItems.length === 0)
    return

  const failedLinks = importResult.value.failedItems.map((item) => {
    const originalLink = parsedData.value?.links[item.index]
    return {
      ...originalLink,
      _importError: item.reason,
    }
  })

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: failedLinks.length,
    links: failedLinks,
  }

  saveAsJson(exportData, `sink-import-failed-${Date.now()}.json`)
}

function reset() {
  selectedFile.value = null
  parsedData.value = null
  parseError.value = null
  validationErrors.value = []
  importResult.value = null
  importProgress.value = 0
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('migrate.import.title') }}</CardTitle>
      <CardDescription>{{ $t('migrate.import.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="!parsedData && !parseError && !importResult">
        <Input
          ref="fileInput"
          type="file"
          accept=".json"
          @change="handleFileSelect"
        />
      </div>

      <div
        v-if="parseError" class="
          rounded-lg border border-destructive/50 bg-destructive/10 p-4
        "
      >
        <div class="flex items-center gap-2 text-destructive">
          <AlertCircle class="h-5 w-5" />
          <span class="font-medium">{{ parseError }}</span>
        </div>
        <div v-if="validationErrors.length > 0" class="mt-2 space-y-1">
          <p
            v-for="(error, index) in validationErrors"
            :key="index"
            class="font-mono text-sm text-destructive/80"
          >
            {{ error }}
          </p>
        </div>
        <Button variant="outline" size="sm" class="mt-3" @click="reset">
          {{ $t('common.try_again') }}
        </Button>
      </div>

      <div v-if="parsedData && !importResult" class="space-y-4">
        <div class="rounded-lg border bg-muted/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">
                {{ selectedFile?.name }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ parsedData.links.length }} {{ $t('migrate.import.links_found') }}
              </p>
            </div>
            <Button variant="ghost" size="sm" @click="reset">
              <XCircle class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div v-if="isImporting" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span>{{ $t('migrate.import.importing') }}</span>
            <span>{{ importProgress }}%</span>
          </div>
          <Progress :model-value="importProgress" />
        </div>

        <Button
          v-else
          class="w-full"
          @click="handleImport"
        >
          <Upload class="mr-2 h-4 w-4" />
          {{ $t('migrate.import.button') }}
        </Button>
      </div>

      <div v-if="importResult" class="space-y-4">
        <div class="rounded-lg border bg-muted/30 p-4">
          <h4 class="mb-3 font-medium">
            {{ $t('migrate.import.result.title') }}
          </h4>
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <CheckCircle class="h-4 w-4 text-green-500" />
              <span>{{ $t('migrate.import.result.success') }}: {{ importResult.success }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <SkipForward class="h-4 w-4 text-yellow-500" />
              <span>{{ $t('migrate.import.result.skipped') }}: {{ importResult.skipped }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <XCircle class="h-4 w-4 text-red-500" />
              <span>{{ $t('migrate.import.result.failed') }}: {{ importResult.failed }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="reset">
            {{ $t('migrate.import.import_more') }}
          </Button>
          <Button
            v-if="importResult.success > 0"
            variant="default"
            @click="downloadSuccessItems"
          >
            <Download class="mr-2 h-4 w-4" />
            {{ $t('migrate.import.download_success') }}
          </Button>
          <Button
            v-if="importResult.skipped > 0"
            variant="secondary"
            @click="downloadSkippedItems"
          >
            <Download class="mr-2 h-4 w-4" />
            {{ $t('migrate.import.download_skipped') }}
          </Button>
          <Button
            v-if="importResult.failed > 0"
            variant="destructive"
            @click="downloadFailedItems"
          >
            <Download class="mr-2 h-4 w-4" />
            {{ $t('migrate.import.download_failed') }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
