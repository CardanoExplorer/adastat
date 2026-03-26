<template>
  <div
    class="bg-conic to-0%"
    :class="rounded"
    :style="{
      '--tw-gradient-from-position': value * 100 + '%',
    }">
    <div class="grid place-items-center border-transparent bg-clip-padding" :class="[h, w, rounded, border, bg, text, font]">
      {{ formatPercent(value, fractionDigits) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'

import { formatPercent } from '@/utils/formatter'

const {
  fractionDigits = 0,
  h = 'h-9',
  w = 'w-12',
  rounded = 'rounded-2xl',
  border = 'border-2',
  bg = 'bg-white dark:bg-gray-800',
  text = 'text-2xs',
  font = '',
} = defineProps<{
  value: number
  fractionDigits?: number
  w?: StyleValue
  h?: StyleValue
  border?: StyleValue
  rounded?: StyleValue
  bg?: StyleValue
  text?: StyleValue
  font?: StyleValue
}>()
</script>
