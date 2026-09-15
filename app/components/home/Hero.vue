<script setup lang="ts">
import heroUrl from '@/assets/images/hero.svg?url'

const { title, description } = useAppConfig()
</script>

<template>
  <section class="bg-background text-foreground">
    <div
      class="
        py-16
        md:py-24
      "
    >
      <div
        class="
          mx-auto flex max-w-6xl flex-col items-center gap-12 px-6
          lg:flex-row lg:justify-between
        "
      >
        <div
          class="
            max-w-lg text-center
            lg:text-left
          "
        >
          <h1
            class="
              text-4xl font-medium text-balance
              md:text-5xl
              xl:text-6xl
            "
          >
            {{ title }}
          </h1>
          <p class="mt-6 text-lg text-pretty text-muted-foreground">
            {{ description }}
          </p>

          <div
            class="
              mt-10 flex flex-col items-center justify-center gap-2
              sm:flex-row
              lg:justify-start
            "
          >
            <Button
              as-child
              size="lg"
            >
              <NuxtLink to="/dashboard">
                <span class="text-nowrap">{{ $t('dashboard.title') }}</span>
              </NuxtLink>
            </Button>
          </div>
        </div>

        <img
          :src="heroUrl"
          class="
            hidden aspect-square w-96 max-w-full shrink-0 bg-transparent
            md:block
            lg:w-[420px]
          "
          alt="Link sharing illustration"
        >
      </div>
    </div>
  </section>
</template>
