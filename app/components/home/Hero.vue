<script setup>
import { AreaChart } from 'lucide-vue-next'
import heroImg from '@/assets/images/hero.svg?raw'

const { title, description } = useAppConfig()
</script>

<template>
  <main
    class="
      grid place-items-center pt-8 pb-8
      md:py-12
      lg:grid-cols-2
    "
  >
    <div>
      <h1
        class="
          text-5xl font-bold
          lg:text-6xl lg:tracking-tight
          xl:text-7xl xl:tracking-tighter
        "
      >
        {{ title }}
      </h1>
      <p class="mt-4 max-w-xl text-lg text-slate-600">
        {{ description }}
      </p>
      <div
        class="
          mt-6 flex flex-col gap-3
          sm:flex-row
        "
      >
        <HomeLink
          href="/dashboard"
          target="_blank"
          title="Dashboard"
          class="flex items-center justify-center gap-1"
          rel="noopener"
        >
          <AreaChart
            class="h-5 w-5"
          />
          {{ $t('dashboard.title') }}
        </HomeLink>
      </div>
    </div>
    <div
      class="
        hidden py-6
        md:block
      "
    >
      <div
        class="w-[512px]"
        v-html="heroImg"
      />
    </div>
  </main>
</template>
