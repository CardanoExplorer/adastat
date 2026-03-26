<template>
  <VTooltip class="inline-block max-w-full min-w-0 whitespace-nowrap" truncate>
    <template v-if="startText">
      <div class="relative z-1 inline-block truncate align-top" :style="{ maxWidth: `calc(100% - ${tailWidth}px)` }">
        <template v-if="headLength > 0 && highlight">
          <span :class="highlight">{{ startText.slice(0, headLength) }}</span
          >{{ startText.slice(headLength) }}
        </template>
        <template v-else>
          {{ startText }}
        </template>
      </div>
      <div class="relative z-1 inline-block align-top whitespace-nowrap" :class="highlight" ref="tail">
        {{ endText }}
      </div>
      <div
        class="pointer-events-none inline-block align-top select-none"
        :style="{ margin: `0 calc(${tailWidth}px - 0.05em) 0 calc(-${tailWidth}px - 1.45em)` }">
        <div class="overflow-hidden" :style="{ width: '1.5em' }">&numsp;&numsp;&numsp;</div>
      </div>
    </template>
    <div v-else class="inline-block max-w-full truncate align-top" :class="highlight">
      {{ text }}
    </div>
    <template #tooltip>
      {{ text }}
    </template>
  </VTooltip>
</template>

<script setup lang="ts">
import { type StyleValue, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

import VTooltip from '@/components/VTooltip.vue'

const highlightLength = 6

const {
  text = '',
  headLength = highlightLength,
  tailLength = highlightLength,
} = defineProps<{
  text: string
  headLength?: number
  tailLength?: number
  highlight?: StyleValue
}>()

const startText = ref(),
  endText = ref(),
  tailRef = useTemplateRef('tail'),
  tailWidth = ref(0)
// const instance = getCurrentInstance(),
//   text = (instance!.vnode.key as string) || ''

const resizeObserver = new ResizeObserver((entries) => {
  tailWidth.value = entries[0]!.contentRect.width
})

watchEffect(() => {
  if (tailLength > 0 && text.length > tailLength) {
    startText.value = text.slice(0, text.length - tailLength)
    endText.value = text.slice(-tailLength)
  } else {
    startText.value = endText.value = ''
  }
})

watch(tailRef, (tail) => {
  if (tail) {
    tailWidth.value = tail.getBoundingClientRect().width
    resizeObserver.observe(tail)
  } else {
    resizeObserver.disconnect()
  }
})

onUnmounted(() => {
  resizeObserver.disconnect()
})
</script>
