<script setup lang="ts">
import { AreaChart, FileJson, Globe, Hourglass, Languages, Link, Paintbrush, QrCode, ServerOff, Share2, Smartphone, Sparkles } from 'lucide-vue-next'

const { t } = useI18n()
const features = computed(() => [
  {
    title: t('home.features.url_shortening.title'),
    description: t('home.features.url_shortening.description'),
    icon: Link,
  },
  {
    title: t('home.features.analytics.title'),
    description: t('home.features.analytics.description'),
    icon: AreaChart,
  },
  {
    title: t('home.features.serverless.title'),
    description: t('home.features.serverless.description'),
    icon: ServerOff,
  },
  {
    title: t('home.features.customizable_slug.title'),
    description: t('home.features.customizable_slug.description'),
    icon: Paintbrush,
  },
  {
    title: t('home.features.ai_slug.title'),
    description: t('home.features.ai_slug.description'),
    icon: Sparkles,
  },
  {
    title: t('home.features.link_expiration.title'),
    description: t('home.features.link_expiration.description'),
    icon: Hourglass,
  },
  {
    title: t('home.features.device_routing.title'),
    description: t('home.features.device_routing.description'),
    icon: Smartphone,
  },
  {
    title: t('home.features.og_preview.title'),
    description: t('home.features.og_preview.description'),
    icon: Share2,
  },
  {
    title: t('home.features.realtime_analytics.title'),
    description: t('home.features.realtime_analytics.description'),
    icon: Globe,
  },
  {
    title: t('home.features.qr_code.title'),
    description: t('home.features.qr_code.description'),
    icon: QrCode,
  },
  {
    title: t('home.features.import_export.title'),
    description: t('home.features.import_export.description'),
    icon: FileJson,
  },
  {
    title: t('home.features.multi_language.title'),
    description: t('home.features.multi_language.description'),
    icon: Languages,
  },
])
</script>

<template>
  <section
    class="
      py-12
      md:py-20
    "
  >
    <div
      class="
        mx-auto max-w-6xl space-y-8 px-6
        md:space-y-12
      "
    >
      <div
        class="relative z-10 mx-auto max-w-xl space-y-4 text-center"
      >
        <h2
          class="text-3xl font-semibold text-balance"
        >
          {{ $t('home.features.title') }}
        </h2>
        <p class="text-muted-foreground">
          {{ $t('home.features.subtitle') }}
        </p>
      </div>

      <div
        class="
          relative mx-auto grid gap-3
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <div
          v-for="item in features"
          :key="item.title"
          class="space-y-3 rounded-xl border p-6"
        >
          <div class="flex items-center gap-2">
            <component
              :is="item.icon"
              class="size-4"
            />
            <h3 class="text-sm font-medium">
              {{ item.title }}
            </h3>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
