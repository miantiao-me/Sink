<script setup lang="ts">
import { AreaChart, FileJson, Globe, Hourglass, Languages, Link, Paintbrush, QrCode, ServerOff, Share2, Smartphone, Sparkles } from '@lucide/vue'

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
      bg-background py-12 text-foreground
      md:py-20
    "
  >
    <div
      class="
        mx-auto max-w-5xl space-y-8 px-6
        md:space-y-16
      "
    >
      <div
        class="mx-auto max-w-xl space-y-6 text-center"
      >
        <h2
          class="
            text-4xl font-medium text-balance
            lg:text-5xl
          "
        >
          {{ $t('home.features.title') }}
        </h2>
        <p class="text-pretty text-muted-foreground">
          {{ $t('home.features.subtitle') }}
        </p>
      </div>

      <div
        class="
          relative mx-auto grid max-w-4xl border-t border-l
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <div
          v-for="item in features"
          :key="item.title"
          class="
            space-y-3 border-r border-b p-6
            sm:p-8
            md:p-10
            lg:p-12
          "
        >
          <div class="flex items-center gap-2">
            <component
              :is="item.icon"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <h3 class="text-sm font-medium">
              {{ item.title }}
            </h3>
          </div>
          <p class="text-sm text-pretty text-muted-foreground">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
