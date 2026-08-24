<script setup lang="ts">
import { ExternalLink, Menu, Star } from '@lucide/vue'
import NumberFlow from '@number-flow/vue'
import { GitHubIcon, TelegramIcon, XIcon } from 'vue3-simple-icons'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const mobileMenuOpen = shallowRef(false)
const { title, documentation, telegram, twitter, github } = useAppConfig()
const { rawStats } = useGithubStats()

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="flex min-h-svh flex-col overflow-x-clip">
    <a
      href="#main-content"
      class="
        fixed top-4 left-4 z-50 -translate-y-24 rounded-md bg-background px-4
        py-2 text-sm font-medium shadow-lg
        focus:translate-y-0
        focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {{ $t('layouts.links.skip_to_content') }}
    </a>

    <!-- Header -->
    <header>
      <div
        class="
          fixed z-20 w-full border-b bg-background/80
          pt-[env(safe-area-inset-top)] text-foreground backdrop-blur-3xl
        "
      >
        <div class="mx-auto max-w-6xl px-6">
          <div
            class="
              flex items-center justify-between gap-6 py-3
              lg:py-4
            "
          >
            <NuxtLink
              to="/"
              :title="title"
              :aria-label="$t('layouts.links.home_aria_label')"
              class="flex items-center space-x-2"
            >
              <span class="flex size-8 items-center justify-center rounded-full">
                <img
                  src="/sink.png"
                  :alt="`${title} Logo`"
                  width="32"
                  height="32"
                  class="size-full rounded-full"
                >
              </span>
              <span class="text-xl font-black">{{ title }}</span>
            </NuxtLink>

            <div
              class="
                hidden items-center gap-6
                lg:flex
              "
            >
              <NavigationMenu :viewport="false">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink as-child>
                      <a
                        :href="documentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        :aria-label="$t('layouts.links.documentation_aria_label')"
                      >
                        {{ $t('layouts.links.documentation') }}
                        <ExternalLink class="size-3.5" aria-hidden="true" />
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink as-child>
                      <a
                        href="/_docs/scalar"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ $t('layouts.links.api_reference') }}
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              <Button as-child variant="outline">
                <a
                  :href="github"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="$t('layouts.footer.social.github')"
                  :aria-label="$t('layouts.links.github_aria_label')"
                  class="flex items-center gap-1.5"
                >
                  <GitHubIcon class="size-4" aria-hidden="true" />
                  <Star class="size-3" aria-hidden="true" />
                  <NumberFlow class="tabular-nums" :value="rawStats.stars" />
                </a>
              </Button>
              <SwitchLanguage />
              <SwitchTheme />
            </div>

            <Sheet v-model:open="mobileMenuOpen">
              <SheetTrigger as-child>
                <button
                  type="button"
                  :aria-label="$t('layouts.header.toggle_menu_aria_label')"
                  class="
                    -mr-2 flex size-11 touch-manipulation items-center
                    justify-center rounded-xl
                    hover:bg-muted
                    focus-visible:ring-2 focus-visible:ring-ring
                    lg:hidden
                  "
                >
                  <Menu class="size-6" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                class="
                  overscroll-contain p-0
                  **:data-[slot=sheet-close]:top-[calc(1rem+env(safe-area-inset-top))]
                  **:data-[slot=sheet-close]:right-2
                  **:data-[slot=sheet-close]:size-11
                  lg:hidden
                "
              >
                <SheetHeader class="sr-only">
                  <SheetTitle>
                    {{ $t('layouts.header.toggle_menu_aria_label') }}
                  </SheetTitle>
                  <SheetDescription>
                    {{ $t('layouts.links.resources_aria_label') }}
                  </SheetDescription>
                </SheetHeader>

                <div
                  class="
                    flex h-full flex-col gap-8 overflow-y-auto
                    overscroll-contain px-6
                    pt-[calc(4.5rem+env(safe-area-inset-top))]
                    pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                  "
                >
                  <nav class="flex flex-col gap-1">
                    <a
                      :href="documentation"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="$t('layouts.links.documentation_aria_label')"
                      class="
                        flex min-h-11 items-center justify-between gap-2
                        rounded-xl px-3 text-sm font-medium
                        text-muted-foreground transition-colors
                        hover:bg-muted hover:text-foreground
                      "
                      @click="closeMobileMenu"
                    >
                      {{ $t('layouts.links.documentation') }}
                      <ExternalLink class="size-3.5" aria-hidden="true" />
                    </a>
                    <a
                      href="/_docs/scalar"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="
                        flex min-h-11 items-center rounded-xl px-3 text-sm
                        font-medium text-muted-foreground transition-colors
                        hover:bg-muted hover:text-foreground
                      "
                      @click="closeMobileMenu"
                    >
                      {{ $t('layouts.links.api_reference') }}
                    </a>
                  </nav>

                  <div class="mt-auto flex flex-col items-stretch gap-4">
                    <Button as-child variant="outline">
                      <a
                        :href="github"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="$t('layouts.footer.social.github')"
                        :aria-label="$t('layouts.links.github_aria_label')"
                        class="flex items-center gap-1.5"
                      >
                        <GitHubIcon class="size-4" aria-hidden="true" />
                        <Star class="size-3" aria-hidden="true" />
                        <NumberFlow class="tabular-nums" :value="rawStats.stars" />
                      </a>
                    </Button>
                    <div class="flex items-center justify-center gap-3">
                      <SwitchLanguage />
                      <SwitchTheme />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      id="main-content"
      class="flex flex-1 flex-col pt-[calc(5rem+env(safe-area-inset-top))]"
    >
      <slot />
    </main>

    <!-- Footer -->
    <footer
      class="
        border-t bg-background pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]
        text-foreground
      "
    >
      <div class="mx-auto max-w-6xl px-6">
        <div
          class="
            flex flex-col items-center gap-6 pt-2
            md:flex-row md:justify-between
          "
        >
          <NuxtLink
            to="/"
            :title="title"
            :aria-label="$t('layouts.links.home_aria_label')"
            class="block size-fit"
          >
            <div class="flex items-center space-x-2">
              <span
                class="flex size-8 items-center justify-center rounded-full"
              >
                <img
                  src="/sink.png"
                  :alt="`${title} Logo`"
                  width="32"
                  height="32"
                  class="size-full rounded-full"
                >
              </span>
              <span class="text-xl font-black">{{ title }}</span>
            </div>
          </NuxtLink>

          <nav
            :aria-label="$t('layouts.links.resources_aria_label')"
            class="flex flex-wrap justify-center gap-2 text-sm"
          >
            <Button
              v-if="twitter"
              as-child
              variant="ghost"
              size="icon"
            >
              <a
                :href="twitter"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('layouts.footer.social.twitter')"
                :aria-label="$t('layouts.footer.social.twitter')"
              >
                <XIcon aria-hidden="true" />
              </a>
            </Button>
            <Button
              v-if="telegram"
              as-child
              variant="ghost"
              size="icon"
            >
              <a
                :href="telegram"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('layouts.footer.social.telegram')"
                :aria-label="$t('layouts.footer.social.telegram')"
              >
                <TelegramIcon aria-hidden="true" />
              </a>
            </Button>
            <Button
              v-if="github"
              as-child
              variant="ghost"
              size="icon"
            >
              <a
                :href="github"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('layouts.footer.social.github')"
                :aria-label="$t('layouts.footer.social.github')"
              >
                <GitHubIcon aria-hidden="true" />
              </a>
            </Button>
          </nav>
        </div>
      </div>
    </footer>
  </div>
</template>
