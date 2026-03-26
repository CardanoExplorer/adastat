<template>
  <div class="flex">
    <DataListPool :name="name" :bech32="bech32" :hash="hash" :ticker="ticker" />

    <div class="mx-1">
      <div class="mx-auto -mb-5 w-max px-8 text-s">{{ t('pool.delegation') }}</div>
      <div class="flex px-1">
        <svg viewBox="0 0 60 44" fill="none" stroke="currentColor" class="h-11 flex-1" preserveAspectRatio="none">
          <path d="M6 21c9 1 18-2 24 6 11 15-11 9 0 0 7-5 24-3 30 4" stroke-dasharray="0 2 0 0 3 0" vector-effect="non-scaling-stroke" class="opacity-50" />
          <path d="M0 20l6-1-1 4Z" fill="currentColor" class="text-sky-500 opacity-70 dark:text-cyan-400" vector-effect="non-scaling-stroke" />
        </svg>
        <TooltipAmount
          :value="value"
          class="mx-1 mt-auto bg-linear-to-r from-lime-700 to-yellow-700 bg-clip-text font-alt text-transparent dark:from-lime-400 dark:to-yellow-400" />
        <svg viewBox="0 0 60 44" fill="none" stroke="currentColor" class="h-11 w-15">
          <path
            v-if="prev_hash"
            d="M60 17C39 15 35 37 43 38c3 1 9-11-14-9-15 2-7 6-29 6"
            stroke-dasharray="3 2"
            vector-effect="non-scaling-stroke"
            class="opacity-50" />
          <template v-else>
            <path
              d="M54 25c17 30-22 13-16 3 4-6 14 16-9 12-15-2-7-6-29-8M49 20a4 1.6 0 106 0"
              stroke-dasharray="3 2"
              vector-effect="non-scaling-stroke"
              class="opacity-50" />
            <path d="M52 18C75-5 29-5 52 18M52 5a2 2 0 10.1 0" vector-effect="non-scaling-stroke" class="text-lime-600 opacity-70 dark:text-lime-400" />
          </template>
        </svg>
      </div>
    </div>

    <DataListPool
      class="origin-left scale-90 transform opacity-50"
      v-if="prev_hash"
      :name="prev_name"
      :bech32="prev_bech32"
      :hash="prev_hash"
      :ticker="prev_ticker" />
  </div>
</template>

<script setup lang="ts">
import { t } from '@/i18n'

import DataListPool from '@/components/DataListPool.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'

defineProps<{
  hash: string | undefined
  bech32: string | undefined
  ticker: string | undefined
  name: string | undefined
  prev_hash: string | undefined
  prev_bech32: string | undefined
  prev_ticker: string | undefined
  prev_name: string | undefined
  value: number | `${number}` | `${bigint}`
}>()
</script>
