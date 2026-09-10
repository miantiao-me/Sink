<script setup lang="ts">
import { ChevronsUpDown, LogOut } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'

interface User {
  name: string
  email: string
}

const { isMobile } = useSidebar()
const { userEmail } = useAuthSession()
const menuButton = useTemplateRef<{ $el: HTMLElement }>('menuButton')
const menuOpen = shallowRef(false)
const logoutOpen = shallowRef(false)
const avatarURL = shallowRef('')

async function openLogoutDialog() {
  menuOpen.value = false
  await nextTick()
  logoutOpen.value = true
}

function restoreMenuFocus(event: Event) {
  event.preventDefault()
  menuButton.value?.$el.focus()
}

const user = computed<User>(() => ({
  name: userEmail.value?.split('@')[0] || '',
  email: userEmail.value || '',
}))
const avatarFallback = computed(() => user.value.name.charAt(0).toUpperCase() || 'R')

watch(userEmail, async (email, _previousEmail, onCleanup) => {
  avatarURL.value = ''
  if (!email)
    return

  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })

  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  if (!cancelled) {
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    avatarURL.value = `https://gravatar.webp.se/avatar/${hash}?d=404`
  }
}, { immediate: true })
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu v-model:open="menuOpen">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            ref="menuButton"
            size="lg"
            :aria-label="user.name"
            class="
              data-[state=open]:bg-sidebar-accent
              data-[state=open]:text-sidebar-accent-foreground
            "
          >
            <Avatar class="size-8 rounded-full">
              <AvatarImage v-if="avatarURL" :src="avatarURL" alt="" />
              <AvatarFallback class="rounded-full">
                {{ avatarFallback }}
              </AvatarFallback>
            </Avatar>
            <div class="grid min-w-0 flex-1 text-left text-sm/tight">
              <span class="truncate font-medium capitalize">{{ user.name }}</span>
              <span class="truncate text-xs">{{ user.email }}</span>
            </div>
            <ChevronsUpDown aria-hidden="true" class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="size-8 rounded-full">
                <AvatarImage v-if="avatarURL" :src="avatarURL" alt="" />
                <AvatarFallback class="rounded-full">
                  {{ avatarFallback }}
                </AvatarFallback>
              </Avatar>
              <div class="grid min-w-0 flex-1 text-left text-sm/tight">
                <span class="truncate font-semibold capitalize">{{ user.name }}</span>
                <span class="truncate text-xs">{{ user.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            @select.prevent="openLogoutDialog"
          >
            <LogOut aria-hidden="true" />
            {{ $t('logout.action') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DashboardLogout
        v-model:open="logoutOpen"
        :show-trigger="false"
        @close-auto-focus="restoreMenuFocus"
      />
    </SidebarMenuItem>
  </SidebarMenu>
</template>
