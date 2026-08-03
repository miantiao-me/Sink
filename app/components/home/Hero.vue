<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { GitHubIcon, XIcon } from 'vue3-simple-icons'
import heroUrl from '@/assets/images/hero.svg?url'

const { title, description, github, twitter } = useAppConfig()
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
          <!-- Twitter Follow Badge -->
          <a
            :href="twitter"
            target="_blank"
            rel="noopener"
            :title="$t('home.twitter.follow')"
            class="
              mx-auto mb-8 inline-flex w-fit items-center gap-2 rounded-full
              border bg-card p-1 pr-3 text-card-foreground transition-colors
              hover:bg-accent hover:text-accent-foreground
              focus-visible:ring-2 focus-visible:ring-ring
              lg:mx-0
            "
          >
            <span
              class="
                flex size-7 items-center justify-center rounded-full bg-primary
                text-xs text-primary-foreground
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
            >
              <NuxtLink to="/dashboard">
                <span class="text-nowrap">{{ $t('dashboard.title') }}</span>
              </NuxtLink>
            </Button>
            <Button
              as-child
              size="lg"
              variant="ghost"
            >
              <a
                :href="github"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('layouts.footer.social.github')"
              >
                <GitHubIcon aria-hidden="true" />
                <span class="text-nowrap">{{ $t('home.hero.github_repo') }}</span>
              </a>
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
