<script setup lang="ts">
import { Languages, Laptop, Moon, Sun } from 'lucide-vue-next'
import { GitHubIcon } from 'vue3-simple-icons'
import { useSidebar } from '@/components/ui/sidebar'

const { github } = useAppConfig()
const colorMode = useColorMode()
const { setLocale, locales } = useI18n()
const { state } = useSidebar()

const repo = github.replace('https://github.com/', '')
const { data: stars, status } = await useFetch(
  `https://api.github.com/repos/${repo}`,
  {
    transform: (res: { stargazers_count: number }) => res.stargazers_count,
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] || nuxtApp.static.data[key],
  },
)
const formattedStars = computed(() => {
  if (!stars.value)
    return null
  return stars.value.toLocaleString()
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex w-full p-1.5 pr-0" :class="[
              state === 'collapsed'
                ? 'flex-col items-center gap-2'
                : 'items-center justify-between',
            ]"
          >
            <TooltipProvider>
              <Tooltip :delay-duration="100">
                <TooltipTrigger as-child>
                  <a
                    :href="github"
                    target="_blank"
                    :title="$t('sidebar.github')"
                    class="
                      flex h-8 items-center justify-center gap-1.5 rounded-md
                      px-2
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                    "
                  >
                    <GitHubIcon class="size-4" />
                    <template v-if="state !== 'collapsed'">
                      <Skeleton v-if="status === 'pending'" class="h-4 w-8" />
                      <span
                        v-else-if="formattedStars" class="
                          text-xs text-muted-foreground tabular-nums
                        "
                      >
                        {{ formattedStars }} {{ $t('sidebar.stars') }}
                      </span>
                    </template>
                  </a>
                </TooltipTrigger>
                <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                  <p>{{ $t('sidebar.github') }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div
              class="flex gap-1" :class="[
                state === 'collapsed' ? 'flex-col items-center' : 'items-center',
              ]"
            >
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    class="
                      flex size-8 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                    "
                  >
                    <Languages class="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                  class="min-w-min"
                >
                  <DropdownMenuItem
                    v-for="locale in locales"
                    :key="locale.code"
                    class="cursor-pointer"
                    @click="setLocale(locale.code)"
                  >
                    <span class="mr-1">{{ locale.emoji }}</span>
                    {{ locale.name }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    class="
                      flex size-8 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                    "
                  >
                    <Sun
                      class="
                        size-4
                        dark:hidden
                      "
                    />
                    <Moon
                      class="
                        hidden size-4
                        dark:block
                      "
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                  class="min-w-min"
                >
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'light'"
                  >
                    <Sun class="mr-1 h-4 w-4" />
                    {{ $t('theme.light') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'dark'"
                  >
                    <Moon class="mr-1 h-4 w-4" />
                    {{ $t('theme.dark') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'system'"
                  >
                    <Laptop class="mr-1 h-4 w-4" />
                    {{ $t('theme.system') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
