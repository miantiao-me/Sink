<script setup lang="ts">
import { ArrowUpCircle, Coffee, Languages, Laptop, Moon, Sun } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'

const { coffee } = useAppConfig()
const colorMode = useColorMode()
const { t, setLocale, locales } = useI18n()
const { isMobile, state } = useSidebar()
const { hasUpdate, currentVersion, latestVersion } = useVersionCheck()

const secondaryMenuClass = computed(() => isMobile.value || state.value === 'expanded'
  ? 'flex-row items-center'
  : 'items-center')
const releaseLabel = computed(() => t('sidebar.update', {
  current: currentVersion,
  version: latestVersion.value,
}))
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu :class="secondaryMenuClass">
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            :tooltip="$t('sidebar.coffee')"
            class="w-9 justify-center px-0"
          >
            <a
              :href="coffee"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="$t('sidebar.coffee')"
            >
              <Coffee aria-hidden="true" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem v-if="hasUpdate">
          <SidebarMenuButton
            as-child
            :tooltip="releaseLabel"
            class="relative w-9 justify-center px-0"
          >
            <a
              href="https://github.com/ccbikai/Sink/releases"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="releaseLabel"
            >
              <ArrowUpCircle aria-hidden="true" />
              <span
                aria-hidden="true"
                class="
                  absolute top-0.5 right-0.5 size-1.5 rounded-full bg-success
                  motion-safe:animate-pulse
                "
              />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem :class="{ 'ml-auto': isMobile || state === 'expanded' }">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                :tooltip="$t('layouts.header.select_language')"
                :aria-label="$t('layouts.header.select_language')"
                class="w-9 justify-center px-0"
              >
                <Languages aria-hidden="true" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              :align="isMobile ? 'end' : (state === 'collapsed' ? 'start' : 'end')"
              :side="isMobile ? 'top' : (state === 'collapsed' ? 'right' : 'top')"
            >
              <DropdownMenuItem
                v-for="locale in locales"
                :key="locale.code"
                @click="setLocale(locale.code)"
              >
                <span>{{ locale.emoji }}</span>
                {{ locale.name }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                :tooltip="$t('theme.toggle')"
                :aria-label="$t('theme.toggle')"
                class="w-9 justify-center px-0"
              >
                <Sun aria-hidden="true" class="dark:hidden" />
                <Moon
                  aria-hidden="true" class="
                    hidden
                    dark:block
                  "
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              :align="isMobile ? 'end' : (state === 'collapsed' ? 'start' : 'end')"
              :side="isMobile ? 'top' : (state === 'collapsed' ? 'right' : 'top')"
            >
              <DropdownMenuItem @click="colorMode.preference = 'light'">
                <Sun aria-hidden="true" />
                {{ $t('theme.light') }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="colorMode.preference = 'dark'">
                <Moon aria-hidden="true" />
                {{ $t('theme.dark') }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="colorMode.preference = 'system'">
                <Laptop aria-hidden="true" />
                {{ $t('theme.system') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
