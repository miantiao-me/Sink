<script setup lang="ts">
import { ArrowUpCircle, Coffee, Languages, Laptop, Moon, Sun } from 'lucide-vue-next'
import { useSidebar } from '@/components/ui/sidebar'

const { coffee } = useAppConfig()
const colorMode = useColorMode()
const { setLocale, locales } = useI18n()
const { state } = useSidebar()
const { hasUpdate, currentVersion, latestVersion } = useVersionCheck()
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
            <div class="flex items-center">
              <TooltipProvider>
                <Tooltip :delay-duration="100">
                  <TooltipTrigger as-child>
                    <a
                      :href="coffee"
                      target="_blank"
                      :title="$t('sidebar.coffee')"
                      class="
                        flex h-8 items-center justify-center rounded-md px-2
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                      "
                    >
                      <Coffee class="size-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                    <p>{{ $t('sidebar.coffee') }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider v-if="hasUpdate">
                <Tooltip :delay-duration="100">
                  <TooltipTrigger as-child>
                    <a
                      href="https://github.com/ccbikai/Sink/releases"
                      target="_blank"
                      class="
                        relative flex h-8 items-center justify-center rounded-md
                        px-2
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                      "
                    >
                      <ArrowUpCircle class="size-4" />
                      <span
                        class="
                          absolute top-1 right-1 size-2 animate-pulse
                          rounded-full bg-green-500
                        "
                      />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                    <p>{{ $t('sidebar.update', { current: currentVersion, version: latestVersion }) }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

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
