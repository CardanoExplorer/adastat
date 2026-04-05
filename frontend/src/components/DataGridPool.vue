<template>
  <RouterLink v-if="hash" class="flex justify-between gap-3 font-medium" :to="{ name: 'pool', params: { id: hash } }">
    <div class="max-w-3/5 min-w-0">
      <TextTruncate
        :text="pool.name"
        :tail-length="pool.name == bech32 ? 6 : 0"
        class="mb-1.5 text-sky-500 *:underline dark:text-cyan-400" />
      <div class="text-xs uppercase">{{ pool.ticker }}</div>
    </div>
    <img class="my-0.5 size-10 shrink-0 rounded-md" :src="getUrl(`/images/pools/${bech32}.webp`)" />
  </RouterLink>
  <div v-else-if="pool.name" class="flex justify-between gap-3 font-medium">
    <div class="max-w-3/5 min-w-0">
      <div class="mb-1.5 truncate text-rose-700">{{ pool.name }}</div>
      <div class="text-xs">{{ pool.ticker }}</div>
    </div>
    <IOGLogoIcon class="my-0.5 size-10" />
  </div>
  <div v-else class="flex"><slot> – </slot></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import IOGLogoIcon from '@/assets/images/iog.svg?component'

import { getUrl } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'

const { hash, bech32, name, ticker } = defineProps<{
  hash: string | undefined
  bech32: string | undefined
  name: string | undefined
  ticker: string | undefined
}>()

const pool = computed(() => {
  let poolName!: string, poolTicker!: string

  if (hash) {
    poolName = name?.trim() || bech32!
    poolTicker = ticker?.trim() || ''
  } else if (name) {
    ;({ 0: poolName = '', 1: poolTicker = '' } = name.split('-'))
  }

  return {
    name: poolName,
    ticker: poolTicker,
  }
})
</script>
