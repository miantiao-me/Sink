<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { DashboardLink } from '@/types/dashboard-links'
import { CalendarPlus2, Copy, CopyCheck, Ellipsis, Eraser, Flame, Hourglass, Link as LinkIcon, MousePointerClick, QrCode, ShieldAlert, SquarePen, Users } from '@lucide/vue'
import { useClipboard, useMediaQuery } from '@vueuse/core'
import { parseURL } from 'ufo'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: DashboardLink
}>()

const { t, locale } = useI18n()
const editPopoverOpen = shallowRef(false)
const qrDialogOpen = shallowRef(false)
const editDialogOpen = shallowRef(false)
const deleteDialogOpen = shallowRef(false)
const actionsTriggerRef = useTemplateRef<ComponentPublicInstance>('actionsTrigger')
const isDesktop = useMediaQuery('(min-width: 640px)')

function openQrDialog() {
  qrDialogOpen.value = true
  editPopoverOpen.value = false
}

function openEditDialog() {
  editDialogOpen.value = true
  editPopoverOpen.value = false
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
  editPopoverOpen.value = false
}

function handlePopoverCloseAutoFocus(event: Event) {
  if (qrDialogOpen.value || editDialogOpen.value || deleteDialogOpen.value)
    event.preventDefault()
}

function handleDialogCloseAutoFocus(event: Event) {
  event.preventDefault()
  nextTick(() => {
    const element = actionsTriggerRef.value?.$el
    if (element instanceof HTMLElement && element.isConnected) {
      element.focus({ preventScroll: true })
      return
    }

    const fallback = document.querySelector('[data-link-actions-trigger]')
    if (fallback instanceof HTMLElement && fallback.isConnected) {
      fallback.focus()
      return
    }

    const searchTrigger = document.querySelector('[data-link-search-trigger]')
    if (searchTrigger instanceof HTMLElement && searchTrigger.isConnected)
      searchTrigger.focus()
  })
}

const countersMap = inject(LINKS_COUNTERS_MAP_KEY)
const counters = computed(() => countersMap?.value?.[props.link.id])
const counterErrorIds = inject(LINKS_COUNTER_ERROR_IDS_KEY)
const retryCounters = inject(RETRY_LINK_COUNTERS_KEY)
const countersError = computed(() => counterErrorIds?.value.has(props.link.id) ?? false)

const requestUrl = useRequestURL()
const host = requestUrl.host
const origin = requestUrl.origin

function getLinkHost(url: string): string | undefined {
  const { host } = parseURL(url)
  return host
}

const shortLink = computed(() => `${origin}/${props.link.slug}`)
const linkIcon = computed(() => `https://unavatar.webp.se/${getLinkHost(props.link.url)}?fallback=https://sink.cool/icon.png`)
const isExpired = computed(() => Boolean(props.link.expiration && props.link.expiration <= Math.floor(Date.now() / 1000)))
const noteText = computed(() => props.link.comment?.trim() ?? '')
const summaryText = computed(() => props.link.title?.trim() || props.link.description?.trim() || '')
const tags = computed(() => props.link.tags ?? [])
const visibleTags = computed(() => tags.value.slice(0, 2))
const hiddenTagCount = computed(() => Math.max(0, tags.value.length - visibleTags.value.length))

const { copy, copied } = useClipboard({ source: shortLink.value, copiedDuring: 400 })

function copyLink() {
  copy(shortLink.value)
  toast(t('links.copy_success'))
}
</script>

<template>
  <Card size="sm" class="relative isolate h-full min-w-0">
    <CardContent
      class="flex h-full min-w-0 flex-1 flex-col gap-3"
    >
      <div
        class="flex min-w-0 items-start gap-2"
      >
        <div
          class="group flex min-w-0 flex-1 cursor-pointer items-center gap-3"
        >
          <Avatar>
            <AvatarImage
              :src="linkIcon"
              :alt="link.slug"
              loading="lazy"
            />
            <AvatarFallback>
              <img
                src="/icon.png"
                :alt="link.slug"
                loading="lazy"
              >
            </AvatarFallback>
          </Avatar>

          <div class="min-w-0 flex-1 overflow-hidden">
            <div class="flex min-w-0 items-center">
              <TooltipProvider v-if="noteText">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <NuxtLink
                      class="
                        min-w-0 truncate rounded-md leading-5 font-bold
                        outline-none
                        group-hover:underline group-hover:underline-offset-4
                        after:absolute after:inset-0 after:z-10
                        after:rounded-2xl
                        focus-visible:after:ring-3
                        focus-visible:after:ring-ring/50
                      "
                      :to="getDashboardLinkDetailLocation(link.slug)"
                    >
                      <span class="sm:hidden">{{ link.slug }}</span>
                      <span
                        class="
                          hidden
                          sm:inline
                        "
                      >{{ host }}/{{ link.slug }}</span>
                    </NuxtLink>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-[90svw] break-all">
                    <p>{{ noteText }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <NuxtLink
                v-else
                class="
                  min-w-0 truncate rounded-md leading-5 font-bold outline-none
                  group-hover:underline group-hover:underline-offset-4
                  after:absolute after:inset-0 after:z-10 after:rounded-2xl
                  focus-visible:after:ring-3 focus-visible:after:ring-ring/50
                "
                :to="getDashboardLinkDetailLocation(link.slug)"
              >
                <span class="sm:hidden">{{ link.slug }}</span>
                <span
                  class="
                    hidden
                    sm:inline
                  "
                >{{ host }}/{{ link.slug }}</span>
              </NuxtLink>
              <span
                v-if="link.unsafe"
                role="img"
                :aria-label="$t('links.unsafe')"
                :title="$t('links.unsafe')"
                class="ml-1 inline-flex shrink-0 text-destructive"
              >
                <ShieldAlert aria-hidden="true" class="size-4" />
              </span>
              <Badge
                v-if="isExpired"
                variant="destructive"
                class="ml-1 shrink-0"
              >
                {{ $t('links.expired') }}
              </Badge>
            </div>

            <p v-if="summaryText" class="truncate text-sm">
              {{ summaryText }}
            </p>
          </div>
        </div>

        <div
          class="
            relative z-20 flex shrink-0 items-center justify-end gap-1
            sm:gap-0
          "
        >
          <Button
            variant="ghost"
            :size="isDesktop ? 'icon' : 'icon-lg'"
            :aria-label="copied ? $t('links.copy_success') : shortLink"
            @click="copyLink"
          >
            <CopyCheck v-if="copied" aria-hidden="true" class="size-4" />
            <Copy v-else aria-hidden="true" class="size-4" />
          </Button>

          <Button as-child variant="ghost" :size="isDesktop ? 'icon' : 'icon-lg'">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="link.url"
            >
              <LinkIcon aria-hidden="true" />
            </a>
          </Button>

          <Popover v-if="isDesktop">
            <PopoverTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                :aria-label="$t('links.download_qr_code')"
              >
                <QrCode aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DashboardLinksQRCode
                :data="shortLink"
                :image="linkIcon"
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu v-model:open="editPopoverOpen">
            <DropdownMenuTrigger as-child>
              <Button
                ref="actionsTrigger"
                data-link-actions-trigger
                variant="ghost"
                :size="isDesktop ? 'icon' : 'icon-lg'"
                :aria-label="`${$t('links.download_qr_code')} / ${$t('common.edit')} / ${$t('common.delete')}`"
              >
                <Ellipsis aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              :hide-when-detached="false"
              @close-auto-focus="handlePopoverCloseAutoFocus"
            >
              <DropdownMenuItem
                v-if="!isDesktop"
                @select="openQrDialog"
              >
                <QrCode aria-hidden="true" />
                {{ $t('links.download_qr_code') }}
              </DropdownMenuItem>

              <DropdownMenuItem
                @select="openEditDialog"
              >
                <SquarePen aria-hidden="true" />
                {{ $t('common.edit') }}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                @select="openDeleteDialog"
              >
                <Eraser aria-hidden="true" />
                {{ $t('common.delete') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div class="mt-auto flex flex-col space-y-3">
        <div class="flex h-5 w-full min-w-0 space-x-2 overflow-hidden text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="
                    relative z-20 inline-flex items-center rounded-sm leading-5
                    whitespace-nowrap outline-none
                    focus-visible:ring-2 focus-visible:ring-ring/50
                  "
                  :aria-label="$t('links.created_at')"
                >
                  <CalendarPlus2 aria-hidden="true" class="mr-1 size-4" /> {{ shortDate(link.createdAt, locale) }}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ $t('links.created_at') }}: {{ longDate(link.createdAt, locale) }}</p>
                <p>{{ $t('links.updated_at') }}: {{ longDate(link.updatedAt, locale) }}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <template v-if="link.expiration">
            <Separator orientation="vertical" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <button
                    type="button"
                    class="
                      relative z-20 inline-flex items-center rounded-sm
                      leading-5 whitespace-nowrap outline-none
                      focus-visible:ring-2 focus-visible:ring-ring/50
                    "
                    :aria-label="$t('links.expires_at')"
                  >
                    <Hourglass aria-hidden="true" class="mr-1 size-4" /> {{ shortDate(link.expiration, locale) }}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{{ $t('links.expires_at') }}: {{ longDate(link.expiration, locale) }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </template>
          <Separator orientation="vertical" />
          <span class="min-w-0 truncate">{{ link.url }}</span>
        </div>
        <div
          v-if="tags.length || countersMap"
          class="flex h-5 w-full min-w-0 items-center gap-2 text-sm"
        >
          <div
            v-if="countersMap"
            class="flex shrink-0 items-center gap-1 tabular-nums"
          >
            <template v-if="countersError">
              <Button
                type="button"
                variant="link"
                class="h-5 px-0 text-xs text-destructive"
                :aria-label="$t('links.stats.retry', { slug: link.slug })"
                @click="retryCounters?.(link.id)"
              >
                {{ $t('common.try_again') }}
              </Button>
            </template>
            <template v-else-if="counters">
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('links.stats.visits', { count: counters.visits })"
              >
                <MousePointerClick aria-hidden="true" class="size-3.5" />
                {{ counters.visits }}
              </Badge>
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('links.stats.visitors', { count: counters.visitors })"
              >
                <Users aria-hidden="true" class="size-3.5" />
                {{ counters.visitors }}
              </Badge>
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('links.stats.referers', { count: counters.referers })"
              >
                <Flame aria-hidden="true" class="size-3.5" />
                {{ counters.referers }}
              </Badge>
            </template>
            <Skeleton v-else class="h-5 w-28 rounded-full bg-secondary" />
          </div>
          <div
            v-if="tags.length"
            class="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1"
          >
            <Badge
              v-for="tag in visibleTags"
              :key="tag"
              variant="outline"
              class="max-w-24 min-w-0 shrink truncate"
            >
              {{ tag }}
            </Badge>
            <Badge
              v-if="hiddenTagCount"
              variant="outline"
              class="shrink-0 text-muted-foreground"
            >
              +{{ hiddenTagCount }}
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>

    <DashboardLinksQRCodeDialog
      v-model:open="qrDialogOpen"
      :data="shortLink"
      :image="linkIcon"
      @close-auto-focus="handleDialogCloseAutoFocus"
    />
    <DashboardLinksEditorModal
      v-model:open="editDialogOpen"
      :link="link"
      @close-auto-focus="handleDialogCloseAutoFocus"
    />
    <DashboardLinksDelete
      v-model:open="deleteDialogOpen"
      :link="link"
      @close-auto-focus="handleDialogCloseAutoFocus"
    />
  </Card>
</template>
