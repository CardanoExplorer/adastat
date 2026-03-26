<template>
  <div
    class="relative grid h-5 w-16 place-items-center bg-linear-to-b from-current/50 mask-ocean font-alt text-2xs font-light"
    :style="{ color: `var(${color})`, '--wave-width': '1rem' }">
    <slot :ratio="ratio">
      <div class="text-black dark:text-white">{{ formatPercent(ratio, fractionDigits, true) }}</div>
    </slot>
    <div v-if="progress" class="absolute bottom-0 left-0 h-0.5 rounded" :style="{ width: Math.min(1, ratio) * 100 + '%', background: `var(${color})` }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { formatPercent } from '@/utils/formatter'
import { getRatio, getRatioColor } from '@/utils/helper'

const {
  value,
  max,
  progress = true,
  colorVar,
  inverted,
  maxCap = 1,
} = defineProps<{
  value: number | `${number}`
  max: number | `${number}`
  fractionDigits?: number | { min: number; max: number }
  progress?: boolean
  colorVar?: string
  inverted?: boolean
  maxCap?: number
}>()

const ratio = computed(() => getRatio(value, max, maxCap))

const color = computed(() => colorVar ?? getRatioColor(inverted ? 1 - ratio.value : ratio.value))
</script>
