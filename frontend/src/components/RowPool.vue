<template>
  <RouterLink v-if="hash" :to="{ name: 'pool', params: { id: hash } }" class="flex items-center gap-1 font-medium">
    <img :src="getUrl(`/images/pools/${hash}.webp`)" class="size-5 rounded" />
    <TextTruncate
      :text="pool.name"
      :tail-length="pool.name == bech32 ? 6 : 0"
      class="text-sky-500 *:underline dark:text-cyan-400" />
    <template v-if="pool.ticker.trim()">[{{ pool.ticker.trim() }}]</template>
  </RouterLink>
  <div v-else-if="pool.name" class="flex items-center gap-1 font-medium">
    <IOGLogoIcon class="size-5" />
    <div class="truncate text-rose-700">{{ pool.name }}</div>
    <template v-if="pool.ticker">[{{ pool.ticker }}]</template>
  </div>
  <div v-else class="text-amber-500 dark:text-amber-400">{{ t('pool.no') }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import IOGLogoIcon from '@/assets/images/iog.svg?component'

import { t } from '@/i18n'
import { getUrl } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'

const { hash, bech32, ticker, name } = defineProps<{
  hash: string | undefined
  bech32: string | undefined
  ticker: string | undefined
  name: string | undefined
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
