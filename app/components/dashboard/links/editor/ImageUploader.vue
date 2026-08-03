<script setup lang="ts">
import { ImagePlus, Loader2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from '#shared/utils/image'

const props = defineProps<{
  slug: string
  inputId: string
}>()

const imageUrl = defineModel<string>()

const { t } = useI18n()
const canUpload = computed(() => !!props.slug?.trim())
const uploading = ref(false)
const dragOver = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

async function handleFile(file: File) {
  if (uploading.value)
    return

  if (!canUpload.value) {
    toast.error(t('links.form.slug_required'))
    return
  }

  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    toast.error(t('links.form.image_invalid_type'))
    return
  }

  if (file.size > IMAGE_MAX_SIZE) {
    toast.error(t('links.form.image_size_limit'))
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('slug', props.slug)

    const result = await useAPI<{ url: string }>('/api/upload/image', {
      method: 'POST',
      body: formData,
    })

    imageUrl.value = result.url
    toast.success(t('links.form.image_upload_success'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.form.image_upload_failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    uploading.value = false
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFile(file)
  }
  target.value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    handleFile(file)
  }
}

function onDragOver() {
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function clearImage() {
  imageUrl.value = undefined
}

function openFilePicker() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="space-y-2">
    <input
      :id="inputId"
      ref="fileInput"
      type="file"
      name="image"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      :disabled="!canUpload || uploading"
      @change="onFileChange"
    >
    <AspectRatio
      v-if="!imageUrl"
      :ratio="1200 / 630"
      class="
        relative flex cursor-pointer items-center justify-center rounded-md
        border-2 border-dashed transition-colors outline-none
        focus-visible:border-ring focus-visible:ring-3
        focus-visible:ring-ring/50
      "
      :class="[
        !canUpload ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        dragOver ? 'border-primary bg-primary/5' : `
          border-muted-foreground/25
          hover:border-primary/50
        `,
      ]"
      role="button"
      :tabindex="canUpload && !uploading ? 0 : -1"
      :aria-disabled="!canUpload || uploading"
      :aria-busy="uploading"
      :aria-label="canUpload ? $t('links.form.image_upload_hint') : $t('links.form.slug_required')"
      @click="canUpload && openFilePicker()"
      @keydown.enter.prevent="canUpload && !uploading && openFilePicker()"
      @keydown.space.prevent="canUpload && !uploading && openFilePicker()"
      @drop.prevent="onDrop"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
    >
      <div class="flex flex-col items-center gap-1 text-muted-foreground">
        <Loader2
          v-if="uploading" class="
            size-8
            motion-safe:animate-spin
          "
          aria-hidden="true"
        />
        <ImagePlus v-else aria-hidden="true" class="size-8" />
        <span class="text-sm">{{ canUpload ? $t('links.form.image_upload_hint') : $t('links.form.slug_required') }}</span>
        <span v-if="canUpload" class="text-xs opacity-60">{{ $t('links.form.image_ratio_hint') }}</span>
      </div>
    </AspectRatio>

    <AspectRatio v-else :ratio="1200 / 630" class="relative">
      <img
        :src="imageUrl"
        :alt="$t('links.form.image_preview')"
        class="size-full rounded-md object-cover"
      >
      <Button
        type="button"
        variant="destructive"
        size="icon"
        class="absolute top-2 right-2"
        :aria-label="`${$t('common.delete')}: ${$t('links.form.image_preview')}`"
        @click="clearImage"
      >
        <X aria-hidden="true" class="size-4" />
      </Button>
    </AspectRatio>
  </div>
</template>
