<template>
  <svg viewBox="0 0 75 105" fill="currentColor" class="text-3xs">
    <text x="23" y="12" text-anchor="middle" class="text-xs">
      {{ pool ? title?.trim() || pool.slice(0, 4) + '…' : '' }}
    </text>
    <path
      v-if="winner"
      d="M57 20l-1 1 1 1 1-1Zm-2-8-1 1 1 1 1-1Zm7 4 4 1-4 1-1 6-1-6-4-1 4-1 1-6Z"
      class="text-yellow-500" />
    <path
      d="M46 78V18c-22-6-22 3-45-2V57c21 4 22-4 45 1m0 13H70c0-6-5-31-24-42"
      :style="{ color: `var(${color})` }"
      stroke="currentColor"
      :fill-opacity="darkMode ? '15%' : '5%'" />
    <path d="M62 104H15L7 76c28-1-3 3 39 2 24 0-2-3 28-3Z" class="text-sky-50 dark:text-gray-900" />
    <path
      d="M62 104H15L7 76c28-1-3 3 39 2 24 0-2-3 28-3Z"
      :style="{ color: `var(${color})` }"
      stroke="currentColor"
      :fill-opacity="darkMode ? '24%' : '8%'" />
    <image
      v-if="pool"
      :href="getUrl(`/images/pools/${pool}.webp`)"
      x="7"
      y="21"
      height="32"
      width="32"
      class="mask-flag" />
    <IOGLogo v-else x="7" y="21" width="32" height="32" />
    <text v-if="no == null" x="40" y="88" text-anchor="middle">{{ t('block.genesis') }}</text>
    <template v-else>
      <text x="23" y="71" text-anchor="middle">{{ formatBytes(size, 'kilobyte') }}</text>
      <text x="58" y="68" text-anchor="middle">{{ formatPercent(utilization) }}</text>
      <text x="40" y="88" text-anchor="middle">{{ formatNumber(no) }}</text>
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import IOGLogo from '@/assets/images/iog.svg?component'

import { t } from '@/i18n'
import { formatBytes, formatNumber, formatPercent } from '@/utils/formatter'
import { getRatioColor, getUrl } from '@/utils/helper'
import { darkMode } from '@/utils/settings'

const { utilization } = defineProps<{
  no: number | null
  size: number
  utilization: number
  title: string | undefined
  pool: string | undefined
  winner: boolean
}>()

const color = computed(() => getRatioColor(utilization))
</script>
