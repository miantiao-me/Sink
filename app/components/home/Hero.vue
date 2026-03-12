<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { GitHubIcon, XIcon } from 'vue3-simple-icons'
import heroUrl from '@/assets/images/hero.svg?url'

const { title, description, github, twitter } = useAppConfig()
</script>

<template>
  <section>
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
          <!-- Twitter Follow Badge -->
          <a
            :href="twitter"
            target="_blank"
            rel="noopener"
            :title="$t('home.twitter.follow')"
            class="
              mx-auto mb-8 inline-flex w-fit items-center gap-2 rounded-full
              border p-1 pr-3
              lg:mx-0
            "
          >
            <span
              class="
                flex items-center gap-1.5 rounded-full bg-muted px-2 py-1
                text-xs
              "
            >
              <XIcon aria-hidden="true" class="size-3" />
            </span>
            <span class="text-sm">{{ $t('home.twitter.follow') }}</span>
            <span class="block h-4 w-px bg-border" />
            <ArrowRight aria-hidden="true" class="size-4" />
          </a>

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
              class="px-5 text-base"
            >
              <NuxtLink to="/dashboard">
                <span class="text-nowrap">{{ $t('dashboard.title') }}</span>
              </NuxtLink>
            </Button>
            <Button
              as-child
              size="lg"
              variant="ghost"
              class="px-5 text-base"
            >
              <a
                :href="github"
                target="_blank"
                :title="$t('layouts.footer.social.github')"
                class="flex items-center gap-1.5"
              >
                <GitHubIcon aria-hidden="true" class="size-5" />
                <span class="text-nowrap">{{ $t('home.hero.github_repo') }}</span>
              </a>
            </Button>
          </div>
        </div>

        <object
          type="image/svg+xml"
          :data="heroUrl"
          class="
            hidden aspect-square w-96 shrink-0
            md:block
            lg:w-[420px]
          "
          aria-label="Link sharing illustration"
          suppressHydrationWarning
        />
      </div>
    </div>
  </section>
</template>
