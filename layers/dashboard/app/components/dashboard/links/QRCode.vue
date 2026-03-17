<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import QRCodeStyling from 'qr-code-styling'

const props = withDefaults(defineProps<{
  data: string
  image?: string
  color?: string
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'
  logo?: string
}>(), {
  image: '',
  color: '#000000',
  errorCorrection: 'Q',
  logo: '',
})

const color = ref(props.color)
const options = computed(() => ({
  width: 256,
  height: 256,
  data: props.data,
  type: 'svg' as const,
  margin: 10,
  qrOptions: { typeNumber: 0 as const, mode: 'Byte' as const, errorCorrectionLevel: props.errorCorrection },
  imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 2 },
  dotsOptions: { type: 'dots' as const, color: props.color },
  backgroundOptions: { color: '#ffffff' },
  image: props.logo || props.image,
  dotsOptionsHelper: {
    colorType: { single: true, gradient: false },
    gradient: {
      linear: true,
      radial: false,
      color1: '#6a1a4c',
      color2: '#6a1a4c',
      rotation: '0',
    },
  },
  cornersSquareOptions: { type: 'extra-rounded' as const, color: props.color },
  cornersSquareOptionsHelper: {
    colorType: { single: true, gradient: false },
    gradient: {
      linear: true,
      radial: false,
      color1: '#000000',
      color2: '#000000',
      rotation: '0',
    },
  },
  cornersDotOptions: { type: 'dot' as const, color: props.color },
  cornersDotOptionsHelper: {
    colorType: { single: true, gradient: false },
    gradient: {
      linear: true,
      radial: false,
      color1: '#000000',
      color2: '#000000',
      rotation: '0',
    },
  },
  backgroundOptionsHelper: {
    colorType: { single: true, gradient: false },
    gradient: {
      linear: true,
      radial: false,
      color1: '#ffffff',
      color2: '#ffffff',
      rotation: '0',
    },
  },
}))

const qrCode = new QRCodeStyling(options.value)
const qrCodeEl = useTemplateRef<HTMLElement>('qrCodeEl')

function updateColor(newColor: string) {
  qrCode.update({
    dotsOptions: { type: 'dots' as const, color: newColor },
    cornersSquareOptions: { type: 'extra-rounded' as const, color: newColor },
    cornersDotOptions: { type: 'dot' as const, color: newColor },
  })
}

watch(color, (newColor) => {
  updateColor(newColor)
})

watch(() => [props.color, props.errorCorrection, props.logo], () => {
  qrCode.update(options.value)
})

function downloadQRCode() {
  const slug = props.data.split('/').pop()
  qrCode.download({
    extension: 'png',
    name: `qr_${slug}`,
  })
}

onMounted(() => {
  if (qrCodeEl.value) {
    qrCode.append(qrCodeEl.value as unknown as HTMLElement)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div
      ref="qrCodeEl"
      :data-text="data"
      class="rounded-lg bg-white p-1"
    />
    <div class="flex items-center gap-4">
      <div class="relative flex items-center">
        <div
          class="
            h-8 w-8 cursor-pointer overflow-hidden rounded-full border
            border-gray-300
            dark:border-gray-600
          "
          :style="{ backgroundColor: color }"
          :title="$t('links.change_qr_color')"
        >
          <input
            v-model="color"
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            :title="$t('links.change_qr_color')"
          >
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        @click="downloadQRCode"
      >
        <Download class="mr-2 h-4 w-4" />
        {{ $t('links.download_qr_code') }}
      </Button>
    </div>
  </div>
</template>
