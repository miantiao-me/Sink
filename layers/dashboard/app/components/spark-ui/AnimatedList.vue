<script lang="ts" setup>
import { cn } from '@/lib/utils'

interface SlotItem {
  props?: { key?: string | number } | null
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  class?: string
  delay?: number
}>(), {
  delay: 1000,
})

const emit = defineEmits(['update:items'])

const slots = useSlots()
const index = ref(0)
const slotsArray = ref<SlotItem[]>([])
const maxShowItems = 100

const itemsToShow = computed(() => {
  const start = index.value - maxShowItems < 0 ? 0 : index.value - maxShowItems
  return slotsArray.value.slice(start, index.value)
})

watch([itemsToShow], () => {
  emit('update:items', itemsToShow.value.at(-1), props)
})

async function loadComponents() {
  const children = slots.default?.()?.[0]?.children
  slotsArray.value = Array.isArray(children) ? children as unknown as SlotItem[] : []

  while (index.value < slotsArray.value.length) {
    index.value++
    await delay(props.delay)
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getInitial(idx: number) {
  return idx === index.value - 1
    ? {
        scale: 0,
        opacity: 0,
      }
    : undefined
}
function getEnter(idx: number) {
  return idx === index.value - 1
    ? {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 250,
          damping: 40,
        },
      }
    : undefined
}

function getLeave() {
  return {
    scale: 0,
    opacity: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 40,
    },
  }
}

onMounted(() => loadComponents())
</script>

<template>
  <div :class="cn('overflow-auto', $props.class)">
    <transition-group
      name="list" tag="div" class="flex flex-col-reverse items-center p-2" move-class="move"
    >
      <div
        v-for="(item, idx) in itemsToShow"
        :key="item.props?.key"
        v-motion
        :initial="getInitial(+idx)" :enter="getEnter(+idx)" :leave="getLeave()"
        :class="cn('mx-auto w-full')"
      >
        <component :is="item" />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.move {
  transition: transform 0.4s ease-out;
}
</style>
