<script setup lang="ts">
import { Menu, Star, X } from 'lucide-vue-next'
import { GitHubIcon, TelegramIcon, XIcon } from 'vue3-simple-icons'

const showMenu = ref(false)
const { title, telegram, twitter, github } = useAppConfig()
const { stats } = useGithubStats()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- Header -->
    <header>
      <nav
        :data-state="showMenu && 'active'"
        class="fixed z-20 w-full border-b bg-background/50 backdrop-blur-3xl"
      >
        <div class="mx-auto max-w-6xl px-6 transition-all duration-300">
          <div
            class="
              relative flex flex-wrap items-center justify-between gap-6 py-3
              lg:gap-0 lg:py-4
            "
          >
            <div
              class="
                flex w-full items-center justify-between gap-12
                lg:w-auto
              "
            >
              <NuxtLink
                to="/"
                :title="title"
                aria-label="home"
                class="flex items-center space-x-2"
              >
                <span
                  class="flex size-8 items-center justify-center rounded-full"
                >
                  <img
                    src="/sink.png"
                    :alt="`${title} Logo`"
                    class="size-full rounded-full"
                  >
                </span>
                <span class="text-xl font-black">{{ title }}</span>
              </NuxtLink>

              <button
                aria-label="Toggle Menu"
                :aria-expanded="showMenu"
                aria-controls="mobile-menu"
                class="
                  relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5
                  lg:hidden
                "
                @click="showMenu = !showMenu"
              >
                <Menu
                  class="m-auto size-6 duration-200" :class="[
                    showMenu && 'scale-0 rotate-180 opacity-0',
                  ]"
                />
                <X
                  class="absolute inset-0 m-auto size-6 duration-200" :class="[
                    showMenu ? 'scale-100 rotate-0 opacity-100' : `
                      scale-0 -rotate-180 opacity-0
                    `,
                  ]"
                />
              </button>
            </div>

            <div
              id="mobile-menu"
              class="
                mb-6 w-full flex-wrap items-center justify-end space-y-8
                rounded-3xl border bg-background p-6 shadow-2xl
                shadow-zinc-300/20
                md:flex-nowrap
                lg:m-0 lg:flex lg:w-fit lg:items-center lg:gap-6 lg:space-y-0
                lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none
                dark:shadow-none dark:lg:bg-transparent
              " :class="[
                showMenu ? 'block' : 'hidden',
              ]"
            >
              <div
                class="
                  flex w-full flex-col items-center space-y-3
                  sm:flex-row sm:gap-3 sm:space-y-0
                  md:w-fit
                "
              >
                <Button
                  as-child
                  variant="outline"
                  size="sm"
                >
                  <a
                    :href="github"
                    target="_blank"
                    :title="$t('layouts.footer.social.github')"
                    class="flex items-center gap-1.5"
                  >
                    <GitHubIcon class="size-4" />
                    <Star class="size-3" />
                    <span class="tabular-nums">{{ stats.stars }}</span>
                  </a>
                </Button>

                <SwitchLanguage />
                <SwitchTheme />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex flex-1 flex-col pt-20">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t bg-background py-8">
      <div class="mx-auto max-w-6xl px-6">
        <div
          class="
            flex flex-col items-center gap-6 pt-2
            md:flex-row md:justify-between
          "
        >
          <div
            class="
              flex flex-col items-center gap-4
              md:flex-row md:gap-6
            "
          >
            <NuxtLink
              to="/"
              :title="title"
              aria-label="home"
              class="block size-fit"
            >
              <div class="flex items-center space-x-2">
                <span
                  class="flex size-8 items-center justify-center rounded-full"
                >
                  <img
                    src="/sink.png"
                    :alt="`${title} Logo`"
                    class="size-full rounded-full"
                  >
                </span>
                <span class="text-xl font-black">{{ title }}</span>
              </div>
            </NuxtLink>

            <small class="block text-center text-sm text-muted-foreground">
              &copy; {{ new Date().getFullYear() }}
              <a
                href="https://html.zone"
                target="_blank"
                title="HTML.ZONE"
                class="hover:text-primary"
              >
                {{ $t('layouts.footer.copyright') }}
              </a>
            </small>
          </div>

          <div class="flex justify-center gap-6 text-sm">
            <a
              v-if="twitter"
              :href="twitter"
              target="_blank"
              rel="noopener noreferrer"
              :title="$t('layouts.footer.social.twitter')"
              :aria-label="$t('layouts.footer.social.twitter')"
              class="
                block text-muted-foreground
                hover:text-primary
              "
            >
              <XIcon class="size-6" />
            </a>
            <a
              v-if="telegram"
              :href="telegram"
              target="_blank"
              rel="noopener noreferrer"
              :title="$t('layouts.footer.social.telegram')"
              :aria-label="$t('layouts.footer.social.telegram')"
              class="
                block text-muted-foreground
                hover:text-primary
              "
            >
              <TelegramIcon class="size-6" />
            </a>
            <a
              v-if="github"
              :href="github"
              target="_blank"
              rel="noopener noreferrer"
              :title="$t('layouts.footer.social.github')"
              :aria-label="$t('layouts.footer.social.github')"
              class="
                block text-muted-foreground
                hover:text-primary
              "
            >
              <GitHubIcon class="size-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
