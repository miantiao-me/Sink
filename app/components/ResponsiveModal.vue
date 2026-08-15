<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  title: string
  description?: string
  contentClass?: string
  preventClose?: boolean
}>(), {
  contentClass: '',
  preventClose: false,
})

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const slots = defineSlots<{
  trigger?: () => any
  default?: () => any
  footer?: () => any
}>()

const open = defineModel<boolean>('open', { default: false })
const isDesktop = useMediaQuery('(min-width: 640px)')

function updateOpen(value: boolean) {
  if (!value && props.preventClose)
    return

  open.value = value
}
</script>

<template>
  <!-- Desktop: Dialog -->
  <Dialog v-if="isDesktop" :open="open" @update:open="updateOpen">
    <DialogTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent
      class="
        max-h-[calc(100svh-2rem)] max-w-[calc(100svw-2rem)]
        grid-rows-[auto_minmax(0,1fr)_auto] overscroll-contain
        md:max-w-lg
      " :class="[
        contentClass,
      ]"
      :show-close-button="!preventClose"
      @close-auto-focus="emit('closeAutoFocus', $event)"
    >
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription :class="{ 'sr-only': !description }">
          {{ description || title }}
        </DialogDescription>
      </DialogHeader>
      <div class="overflow-y-auto overscroll-contain">
        <slot />
      </div>
      <DialogFooter v-if="slots.footer">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Mobile: Drawer -->
  <Drawer v-else :open="open" @update:open="updateOpen">
    <DrawerTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DrawerTrigger>
    <DrawerContent
      class="
        max-h-[calc(100svh-env(safe-area-inset-top))] overscroll-contain
        pb-[env(safe-area-inset-bottom)]
      "
      @close-auto-focus="emit('closeAutoFocus', $event)"
    >
      <DrawerHeader>
        <DrawerTitle>{{ title }}</DrawerTitle>
        <DrawerDescription :class="{ 'sr-only': !description }">
          {{ description || title }}
        </DrawerDescription>
      </DrawerHeader>
      <div
        class="
          flex min-h-0 flex-1 flex-col items-center overflow-y-auto
          overscroll-contain px-4
        "
      >
        <slot />
      </div>
      <DrawerFooter v-if="slots.footer">
        <slot name="footer" />
      </DrawerFooter>
      <DrawerFooter v-else>
        <DrawerClose as-child>
          <Button type="button" variant="secondary" :disabled="preventClose">
            {{ $t('common.close') }}
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
