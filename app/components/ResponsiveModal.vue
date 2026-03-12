<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  title: string
  description?: string
  contentClass?: string
}>(), {
  contentClass: '',
})

const slots = defineSlots<{
  trigger?: () => any
  default?: () => any
  footer?: () => any
}>()

const open = defineModel<boolean>('open', { default: false })
const isDesktop = useMediaQuery('(min-width: 640px)')
</script>

<template>
  <!-- Desktop: Dialog -->
  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent
      class="
        max-h-[90svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      " :class="[
        contentClass,
      ]"
    >
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="overflow-y-auto">
        <slot />
      </div>
      <DialogFooter v-if="slots.footer">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Mobile: Drawer -->
  <Drawer v-else v-model:open="open">
    <DrawerTrigger v-if="slots.trigger" as-child>
      <slot name="trigger" />
    </DrawerTrigger>
    <DrawerContent class="max-h-[90svh]">
      <DrawerHeader>
        <DrawerTitle>{{ title }}</DrawerTitle>
        <DrawerDescription v-if="description">
          {{ description }}
        </DrawerDescription>
      </DrawerHeader>
      <div class="flex flex-1 flex-col items-center overflow-y-auto px-4">
        <slot />
      </div>
      <DrawerFooter v-if="slots.footer" class="flex-row justify-end gap-2">
        <slot name="footer" />
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
