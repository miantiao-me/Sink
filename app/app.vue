<script setup lang="ts">
import 'vue-sonner/style.css'

const { title, description, image } = useAppConfig()
const route = useRoute()
const localeHead = useLocaleHead()
const colorMode = useColorMode()

useSeoMeta({
  title: `${title} - Link Shortener with Analytics`,
  description,
  ogType: 'website',
  ogTitle: title,
  ogSiteName: title,
  ogDescription: description,
  ogImage: image,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
    {
      name: 'theme-color',
      content: colorMode.value === 'dark' ? '#09090b' : '#ffffff',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: computed(() => `https://sink.cool${route.path}`),
    },
    {
      rel: 'icon',
      type: 'image/png',
      href: '/icon-192.png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
    },
  ],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="var(--primary)" />
    <NuxtPage />
    <Toaster position="top-center" rich-colors />
  </NuxtLayout>
</template>
