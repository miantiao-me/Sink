<script setup lang="ts">
import type { ComponentPublicInstance, HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { useMessageScrollerContext } from "./useMessageScroller"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { setRootElement } = useMessageScrollerContext()

function setRootElementRef(element: Element | ComponentPublicInstance | null) {
  setRootElement(element instanceof HTMLElement ? element : null)
}
</script>

<template>
  <div
    :ref="setRootElementRef"
    data-slot="message-scroller"
    :class="cn(
      'group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
