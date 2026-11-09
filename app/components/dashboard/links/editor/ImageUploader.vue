<script setup lang="ts">
import type { ImageUploadKind } from '#shared/utils/image'
import { ImagePlus, Loader2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { IMAGE_UPLOAD_KINDS, isIconType } from '#shared/utils/image'

const props = withDefaults(defineProps<{
  slug: string
  inputId: string
  kind?: ImageUploadKind
}>(), {
  kind: 'image',
})

const imageUrl = defineModel<string>()

const { t } = useI18n()
const canUpload = computed(() => !!props.slug?.trim())
const uploading = ref(false)
const dragOver = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const isFavicon = computed(() => props.kind === 'favicon')
const allowedTypes = computed(() => IMAGE_UPLOAD_KINDS[props.kind].types)
const ratio = computed(() => isFavicon.value ? 1 : 1200 / 630)
const formats = computed(() => [...new Set(allowedTypes.value.map(type =>
  isIconType(type) ? 'ICO' : type.split('/')[1]!.toUpperCase(),
))].join(', '))

async function handleFile(file: File) {
  if (uploading.value)
    return

  if (!canUpload.value) {
    toast.error(t('links.form.slug_required'))
    return
  }

  if (file.type === 'image/svg+xml') {
    toast.error(t('links.form.image_svg_unsupported', { formats: formats.value }))
    return
  }

  if (!allowedTypes.value.includes(file.type)) {
    toast.error(isFavicon.value
      ? t('links.form.favicon_invalid_type', { formats: formats.value })
      : t('links.form.image_invalid_type'))
    return
  }

  if (file.size > IMAGE_UPLOAD_KINDS[props.kind].maxSize) {
    toast.error(t(isFavicon.value ? 'links.form.favicon_size_limit' : 'links.form.image_size_limit'))
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', isFavicon.value ? await resizeFavicon(file) : file)
    formData.append('slug', props.slug)
    formData.append('kind', props.kind)

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
  <div class="space-y-2" :class="{ 'max-w-40': isFavicon }">
    <input
      :id="inputId"
      ref="fileInput"
      type="file"
      name="image"
      :accept="allowedTypes.join(',')"
      class="hidden"
      :disabled="!canUpload || uploading"
      @change="onFileChange"
    >
    <AspectRatio
      v-if="!imageUrl"
      :ratio="ratio"
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
      <div
        class="
          flex flex-col items-center gap-1 px-2 text-center
          text-muted-foreground
        "
      >
        <Loader2
          v-if="uploading" class="
            size-8
            motion-safe:animate-spin
          "
          aria-hidden="true"
        />
        <ImagePlus v-else aria-hidden="true" class="size-8" />
        <span class="text-sm">{{ canUpload ? $t('links.form.image_upload_hint') : $t('links.form.slug_required') }}</span>
        <span v-if="canUpload" class="text-xs opacity-60">{{ $t(isFavicon ? 'links.form.favicon_ratio_hint' : 'links.form.image_ratio_hint') }}</span>
      </div>
    </AspectRatio>

    <AspectRatio v-else :ratio="ratio" class="relative">
      <img
        :src="imageUrl"
        :alt="$t(isFavicon ? 'links.form.favicon_preview' : 'links.form.image_preview')"
        class="size-full rounded-md"
        :class="isFavicon ? 'object-contain' : 'object-cover'"
      >
      <Button
        type="button"
        variant="destructive"
        size="icon"
        class="absolute top-2 right-2"
        :aria-label="`${$t('common.delete')}: ${$t(isFavicon ? 'links.form.favicon_preview' : 'links.form.image_preview')}`"
        @click="clearImage"
      >
        <X aria-hidden="true" class="size-4" />
      </Button>
    </AspectRatio>
  </div>
</template>
