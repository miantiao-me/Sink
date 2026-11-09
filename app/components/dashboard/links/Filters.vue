<script setup lang="ts">
import type { LinkOwner } from '#shared/types/link'
import { LoaderCircle } from '@lucide/vue'
import { UNASSIGNED_OWNER } from '#shared/types/link'

interface TagCount {
  name: string
  count: number
}

const linksStore = useDashboardLinksStore()
const { isAdmin } = useAuthSession()
const { t } = useI18n()
const allTagsValue = '__sink_all_tags__'
const allOwnersValue = '__sink_all_owners__'
const tags = shallowRef<TagCount[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
let requestGeneration = 0

const owners = shallowRef<LinkOwner[]>([])
const ownersLoading = shallowRef(false)
const ownersError = shallowRef(false)
let ownersRequestGeneration = 0

function ownerOptionLabel(owner: LinkOwner): string {
  return owner.email ?? t('links.owner.unassigned')
}

async function fetchTags() {
  const generation = ++requestGeneration
  loading.value = true
  error.value = false
  try {
    const data = await useAPI<TagCount[]>('/api/link/tags')
    if (generation === requestGeneration) {
      tags.value = data
      if (linksStore.tag && !data.some(item => item.name === linksStore.tag))
        linksStore.tag = undefined
    }
  }
  catch (cause) {
    if (generation === requestGeneration) {
      console.error(cause)
      error.value = true
    }
  }
  finally {
    if (generation === requestGeneration)
      loading.value = false
  }
}

async function fetchOwners() {
  if (!isAdmin.value)
    return
  const generation = ++ownersRequestGeneration
  ownersLoading.value = true
  ownersError.value = false
  try {
    const data = await useAPI<LinkOwner[]>('/api/link/owners')
    if (generation === ownersRequestGeneration)
      owners.value = data
  }
  catch (cause) {
    if (generation === ownersRequestGeneration) {
      console.error(cause)
      ownersError.value = true
    }
  }
  finally {
    if (generation === ownersRequestGeneration)
      ownersLoading.value = false
  }
}

function selectTag(value: unknown) {
  linksStore.tag = typeof value === 'string' && value !== allTagsValue ? value : undefined
}

function selectOwner(value: unknown) {
  linksStore.owner = typeof value === 'string' && value !== allOwnersValue ? value : undefined
}

onMounted(() => {
  void fetchTags()
  void fetchOwners()
})
linksStore.onLinkUpdate(() => void fetchTags())
</script>

<template>
  <section
    class="
      flex flex-col gap-3
      md:flex-row md:items-center md:justify-between
    "
    :aria-label="$t('links.filters.aria_label')"
  >
    <div class="flex min-w-0 items-center gap-2">
      <TabsList :aria-label="$t('links.filters.status_label')">
        <TabsTrigger value="active">
          {{ $t('links.filters.active') }}
        </TabsTrigger>
        <TabsTrigger value="expired">
          {{ $t('links.filters.expired') }}
        </TabsTrigger>
      </TabsList>
    </div>

    <div
      class="
        flex min-w-0 flex-wrap items-center gap-2
        md:ml-auto
      "
    >
      <DashboardLinksSort />
      <Select :model-value="linksStore.tag ?? allTagsValue" :disabled="loading" @update:model-value="selectTag">
        <SelectTrigger
          class="
            min-w-0 flex-1
            md:w-56 md:flex-none
          "
          :aria-label="$t('links.filters.tag_label')"
        >
          <SelectValue :placeholder="$t('links.filters.all_tags')" />
          <LoaderCircle
            v-if="loading"
            class="
              size-4 shrink-0
              motion-safe:animate-spin
            "
            aria-hidden="true"
          />
          <span v-if="loading" class="sr-only">{{ $t('links.filters.tags_loading') }}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="allTagsValue">
            {{ $t('links.filters.all_tags') }}
          </SelectItem>
          <SelectItem v-for="item in tags" :key="item.name" :value="item.name">
            <span class="flex w-full items-center justify-between gap-4">
              <span class="truncate">{{ item.name }}</span>
              <span class="text-xs text-muted-foreground tabular-nums">{{ item.count }}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Select
        v-if="isAdmin"
        :model-value="linksStore.owner ?? allOwnersValue"
        :disabled="ownersLoading"
        @update:model-value="selectOwner"
      >
        <SelectTrigger
          class="
            min-w-0 flex-1
            md:w-56 md:flex-none
          "
          :aria-label="$t('links.filters.owner_label')"
        >
          <SelectValue :placeholder="$t('links.filters.all_owners')" />
          <LoaderCircle
            v-if="ownersLoading"
            class="
              size-4 shrink-0
              motion-safe:animate-spin
            "
            aria-hidden="true"
          />
          <span v-if="ownersLoading" class="sr-only">{{ $t('links.filters.owners_loading') }}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="allOwnersValue">
            {{ $t('links.filters.all_owners') }}
          </SelectItem>
          <SelectItem v-for="item in owners" :key="item.email ?? UNASSIGNED_OWNER" :value="item.email ?? UNASSIGNED_OWNER">
            <span class="flex w-full items-center justify-between gap-4">
              <span class="truncate">{{ ownerOptionLabel(item) }}</span>
              <span class="text-xs text-muted-foreground tabular-nums">{{ item.count }}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        v-if="error"
        type="button"
        variant="ghost"
        size="sm"
        class="
          w-full
          md:w-auto
        "
        @click="fetchTags"
      >
        {{ $t('common.try_again') }}
      </Button>
      <Button
        v-if="ownersError"
        type="button"
        variant="ghost"
        size="sm"
        class="
          w-full
          md:w-auto
        "
        @click="fetchOwners"
      >
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <p
      v-if="error"
      class="
        text-xs text-destructive
        sm:sr-only
      "
      role="alert"
    >
      {{ $t('links.filters.tags_failed') }}
    </p>
    <p
      v-if="ownersError"
      class="
        text-xs text-destructive
        sm:sr-only
      "
      role="alert"
    >
      {{ $t('links.filters.owners_failed') }}
    </p>
  </section>
</template>
