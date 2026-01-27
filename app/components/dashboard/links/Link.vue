<script setup lang="ts">
import type { Link } from '@/types'
import { useClipboard } from '@vueuse/core'
import { CalendarPlus2, Copy, CopyCheck, Eraser, Hourglass, Link as LinkIcon, QrCode, SquareChevronDown, SquarePen } from 'lucide-vue-next'
import { parseURL } from 'ufo'
import { toast } from 'vue-sonner'
import QRCode from './QRCode.vue'

const props = defineProps<{
  link: Link
}>()

const { t } = useI18n()
const editPopoverOpen = ref(false)

const requestUrl = useRequestURL()
const host = requestUrl.host
const origin = requestUrl.origin

function getLinkHost(url: string): string | undefined {
  const { host } = parseURL(url)
  return host
}

const shortLink = computed(() => `${origin}/${props.link.slug}`)
const linkIcon = computed(() => `https://unavatar.webp.se/${getLinkHost(props.link.url)}?fallback=https://sink.cool/icon.png`)

const { copy, copied } = useClipboard({ source: shortLink.value, copiedDuring: 400 })

function copyLink() {
  copy(shortLink.value)
  toast(t('links.copy_success'))
}
</script>

<template>
  <Card>
    <CardContent>
      <NuxtLink
        class="flex flex-col space-y-3"
        :to="`/dashboard/link?slug=${link.slug}`"
      >
        <div class="flex items-center justify-center space-x-3">
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

          <div class="flex-1 overflow-hidden">
            <div class="flex items-center">
              <div class="truncate leading-5 font-bold">
                {{ host }}/{{ link.slug }}
              </div>

              <CopyCheck
                v-if="copied"
                class="ml-1 h-4 w-4 shrink-0"
                @click.prevent
              />
              <Copy
                v-else
                class="ml-1 h-4 w-4 shrink-0"
                @click.prevent="copyLink"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <p class="truncate text-sm">
                    {{ link.comment || link.title || link.description }}
                  </p>
                </TooltipTrigger>
                <TooltipContent class="max-w-[90svw] break-all">
                  <p>{{ link.comment || link.title || link.description }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >
            <LinkIcon class="h-5 w-5" />
          </a>

          <Popover>
            <PopoverTrigger>
              <QrCode
                class="h-5 w-5"
                @click.prevent
              />
            </PopoverTrigger>
            <PopoverContent>
              <QRCode
                :data="shortLink"
                :image="linkIcon"
              />
            </PopoverContent>
          </Popover>

          <Popover v-model:open="editPopoverOpen">
            <PopoverTrigger>
              <SquareChevronDown
                class="h-5 w-5"
                @click.prevent
              />
            </PopoverTrigger>
            <PopoverContent
              class="w-auto p-0"
              :hide-when-detached="false"
            >
              <LazyDashboardLinksEditor
                :link="link"
              >
                <div
                  class="
                    flex cursor-pointer items-center rounded-sm px-2 py-1.5
                    text-sm outline-hidden select-none
                    hover:bg-accent hover:text-accent-foreground
                  "
                >
                  <SquarePen
                    class="mr-2 h-5 w-5"
                  />
                  {{ $t('common.edit') }}
                </div>
              </LazyDashboardLinksEditor>

              <Separator />

              <LazyDashboardLinksDelete
                :link="link"
              >
                <div
                  class="
                    flex cursor-pointer items-center rounded-sm px-2 py-1.5
                    text-sm outline-hidden select-none
                    hover:bg-accent hover:text-accent-foreground
                  "
                >
                  <Eraser
                    class="mr-2 h-5 w-5"
                  /> {{ $t('common.delete') }}
                </div>
              </LazyDashboardLinksDelete>
            </PopoverContent>
          </Popover>
        </div>
        <div class="flex h-5 w-full space-x-2 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <span
                  class="inline-flex items-center leading-5 whitespace-nowrap"
                ><CalendarPlus2 class="mr-1 h-4 w-4" /> {{ shortDate(link.createdAt) }}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ $t('links.created_at') }}: {{ longDate(link.createdAt) }}</p>
                <p>{{ $t('links.updated_at') }}: {{ longDate(link.updatedAt) }}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <template v-if="link.expiration">
            <Separator orientation="vertical" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span
                    class="inline-flex items-center leading-5 whitespace-nowrap"
                  ><Hourglass class="mr-1 h-4 w-4" /> {{ shortDate(link.expiration) }}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{{ $t('links.expires_at') }}: {{ longDate(link.expiration) }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </template>
          <Separator orientation="vertical" />
          <span class="truncate">{{ link.url }}</span>
        </div>
      </NuxtLink>
    </CardContent>
  </Card>
</template>
