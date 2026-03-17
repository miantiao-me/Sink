<script setup lang="ts">
import { ImagePlus, Loader2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from '@/utils/image'

const props = withDefaults(defineProps<{
  slug: string
  prefix?: string
  aspectRatio?: string
  objectFit?: 'cover' | 'contain'
  hintKey?: string
}>(), {
  prefix: '',
  aspectRatio: '1200/630',
  objectFit: 'cover',
})

const imageUrl = defineModel<string>()

const { t } = useI18n()
const canUpload = computed(() => !!props.slug?.trim())
const uploading = ref(false)
const dragOver = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const aspectClass = computed(() => {
  if (props.aspectRatio === '1/1') {
    return 'aspect-square'
  }
  return `aspect-[${props.aspectRatio}]`
})

async function handleFile(file: File) {
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
    formData.append('slug', `${props.prefix}${props.slug}`)

    const result = await useAPI<{ url: string }>('/api/upload/image', {
      method: 'POST',
      body: formData,
    })

    imageUrl.value = result.url
    toast.success(t('links.form.image_upload_success'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.form.image_upload_failed'))
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
    <div
      v-if="!imageUrl"
      class="
        relative flex cursor-pointer items-center justify-center rounded-md
        border-2 border-dashed transition-colors
      "
      :class="[
        aspectClass,
        !canUpload ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        dragOver ? 'border-primary bg-primary/5' : `
          border-muted-foreground/25
          hover:border-primary/50
        `,
      ]"
      @click="canUpload && openFilePicker()"
      @drop.prevent="onDrop"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
    >
      <div class="flex flex-col items-center gap-1 text-muted-foreground">
        <Loader2 v-if="uploading" class="h-8 w-8 animate-spin" />
        <ImagePlus v-else class="h-8 w-8" />
        <span class="text-sm">{{ canUpload ? $t('links.form.image_upload_hint') : $t('links.form.slug_required') }}</span>
        <span v-if="canUpload && hintKey" class="text-xs opacity-60">{{ $t(hintKey) }}</span>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="hidden"
        @change="onFileChange"
      >
    </div>

    <div v-else class="relative" :class="aspectClass">
      <img
        :src="imageUrl"
        alt="Preview"
        class="w-full rounded-md"
        :class="objectFit === 'cover' ? 'aspect-[1200/630] object-cover' : `
          aspect-square object-contain
        `"
      >
      <Button
        type="button"
        variant="destructive"
        size="icon"
        class="absolute top-2 right-2 h-6 w-6"
        @click="clearImage"
      >
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
