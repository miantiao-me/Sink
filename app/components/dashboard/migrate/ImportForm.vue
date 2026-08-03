<script setup lang="ts">
import { AlertCircle, CheckCircle, Download, SkipForward, Upload, XCircle } from '@lucide/vue'

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const {
  selectedFile,
  parsedData,
  parseError,
  validationErrors,
  isImporting,
  importProgress,
  importResult,
  handleFile,
  importLinks,
  downloadSuccessItems,
  downloadSkippedItems,
  downloadFailedItems,
  reset,
} = useLinkImport()

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file)
    void handleFile(file)
}

function resetForm() {
  reset()
  if (fileInput.value)
    fileInput.value.value = ''
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle><h2>{{ $t('migrate.import.title') }}</h2></CardTitle>
      <CardDescription>{{ $t('migrate.import.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="!parsedData && !parseError && !importResult">
        <FieldLabel for="links-import-file" class="mb-2">
          {{ $t('migrate.import.dropzone') }}
        </FieldLabel>
        <Input
          id="links-import-file"
          ref="fileInput"
          name="links-import-file"
          type="file"
          accept=".json"
          class="cursor-pointer"
          @change="handleFileSelect"
        />
      </div>

      <Alert v-if="parseError" variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{{ parseError }}</AlertTitle>
        <AlertDescription>
          <div v-if="validationErrors.length > 0" class="mt-2 space-y-1">
            <p
              v-for="(error, index) in validationErrors"
              :key="index"
              class="font-mono text-sm"
            >
              {{ error }}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="mt-3"
            :disabled="isImporting"
            @click="resetForm"
          >
            {{ $t('common.try_again') }}
          </Button>
        </AlertDescription>
      </Alert>

      <div v-if="parsedData && !importResult" class="space-y-4">
        <div class="rounded-lg border bg-muted/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">
                {{ selectedFile?.name }}
              </p>
              <p class="text-sm text-muted-foreground tabular-nums">
                {{ $t('migrate.import.links_found', { count: parsedData.links.length }) }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              :aria-label="$t('migrate.import.import_more')"
              :disabled="isImporting"
              @click="resetForm"
            >
              <XCircle aria-hidden="true" class="size-4" />
            </Button>
          </div>
        </div>

        <div v-if="isImporting" class="space-y-2" role="status" aria-live="polite">
          <div class="flex items-center justify-between text-sm">
            <span>{{ $t('migrate.import.importing') }}</span>
            <span class="tabular-nums">{{ importProgress }}%</span>
          </div>
          <Progress
            :model-value="importProgress"
            :aria-label="$t('migrate.import.importing')"
            :aria-valuetext="`${importProgress}%`"
          />
        </div>

        <Button
          v-else
          class="w-full"
          @click="importLinks"
        >
          <Upload aria-hidden="true" class="size-4" />
          {{ $t('migrate.import.button') }}
        </Button>
      </div>

      <div v-if="importResult" class="space-y-4">
        <Alert role="status">
          <AlertTitle>
            {{ $t('migrate.import.result.title') }}
          </AlertTitle>
          <AlertDescription>
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm">
                <CheckCircle aria-hidden="true" class="size-4" />
                <span class="tabular-nums">{{ $t('migrate.import.result.success') }}: {{ importResult.success }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <SkipForward
                  aria-hidden="true" class="size-4 text-muted-foreground"
                />
                <span class="tabular-nums">{{ $t('migrate.import.result.skipped') }}: {{ importResult.skipped }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-destructive">
                <XCircle aria-hidden="true" class="size-4 text-destructive" />
                <span class="tabular-nums">{{ $t('migrate.import.result.failed') }}: {{ importResult.failed }}</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            :disabled="isImporting"
            @click="resetForm"
          >
            {{ $t('migrate.import.import_more') }}
          </Button>
          <Button
            v-if="importResult.success > 0"
            variant="default"
            class="tabular-nums"
            @click="downloadSuccessItems"
          >
            <Download aria-hidden="true" class="size-4" />
            {{ $t('migrate.import.download_success', { count: importResult.success }) }}
          </Button>
          <Button
            v-if="importResult.skipped > 0"
            variant="secondary"
            class="tabular-nums"
            @click="downloadSkippedItems"
          >
            <Download aria-hidden="true" class="size-4" />
            {{ $t('migrate.import.download_skipped', { count: importResult.skipped }) }}
          </Button>
          <Button
            v-if="importResult.failed > 0"
            variant="outline"
            class="tabular-nums"
            @click="downloadFailedItems"
          >
            <Download aria-hidden="true" class="size-4" />
            {{ $t('migrate.import.download_failed', { count: importResult.failed }) }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
