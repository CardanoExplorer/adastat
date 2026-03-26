<template>
  <div class="overflow-x-auto scrollbar-thin">
    <div class="grid min-w-max auto-cols-fr grid-flow-col gap-4 text-right">
      <div class="rounded-md bg-white bg-radial from-fuchsia-100 px-3 py-2 dark:bg-gray-800/50 dark:bg-none" :key="k" v-for="(v, k) of data">
        <div class="flex justify-between text-2xs">
          <div>{{ ((k as any) > 0 ? '' : '<') + formatToken(range[k]!) }}</div>
          <div class="text-blue-500 dark:text-sky-400">{{ t('holder.type.' + k) }}</div>
        </div>
        <div class="mt-1 flex items-start justify-between gap-2">
          <component :is="holderIcons[k]" class="h-9 text-blue-500 dark:text-sky-400" />
          <div>
            <div class="text-sm leading-5">{{ formatNumber((k as any) == 0 && zero ? v.qty - zero : v.qty) }}</div>
            <TooltipAmount
              :value="v.stake"
              class="bg-linear-to-r from-lime-600 to-teal-600 bg-clip-text text-s text-transparent dark:from-lime-400 dark:to-teal-400" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/i18n'
import { formatNumber, formatToken } from '@/utils/formatter'
import { holderIcons } from '@/utils/holderIcons'

import TooltipAmount from '@/components/TooltipAmount.vue'

defineProps<{
  data: Record<number, { qty: number; stake: number }>
  zero?: number
}>()

const range = ['1', '1-9', '10-99', '100-999', '1K-9K', '10K-99K', '100K-999K', '1M-9M', '10M+']
</script>
