<template>
  <RouterLink
    v-if="hash"
    class="flex max-w-52 gap-2.5 font-sans md:max-w-60"
    :to="{ name: 'pool', params: { id: hash } }">
    <img class="my-0.5 size-10 shrink-0 rounded-md" :src="getUrl(`/images/pools/${hash}.webp`)" />
    <div class="min-w-0 font-medium">
      <TextTruncate
        :text="pool.name"
        :tail-length="pool.name == bech32 ? 6 : 0"
        class="mb-1.5 text-sky-500 *:underline dark:text-cyan-400" />
      <div class="flex items-center gap-1.5 text-xs font-normal uppercase">
        {{ pool.ticker }}
        <VTooltip v-if="mithril" :title="t('mithril.signer')" bg="bg-orange-200 dark:bg-yellow-600" cursor-help>
          <Mithrilcon class="size-3 text-amber-500 dark:text-orange-300" />
        </VTooltip>
        <VTooltip v-if="itn" :title="t('itn.member')" cursor-help>
          <ITNIcon class="size-3 text-sky-500 dark:text-sky-400" />
        </VTooltip>
      </div>
    </div>
  </RouterLink>
  <div v-else-if="pool.name" class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
    <IOGLogoIcon class="my-0.5 size-10" />
    <div class="min-w-0 font-medium">
      <div class="mb-1.5 truncate text-rose-700">{{ pool.name }}</div>
      <div class="text-xs font-normal">{{ pool.ticker }}</div>
    </div>
  </div>
  <div v-else class="flex"><slot> – </slot></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import ITNIcon from '@/assets/icons/itn.svg?component'
import Mithrilcon from '@/assets/icons/mithril.svg?component'
import IOGLogoIcon from '@/assets/images/iog.svg?component'

import { t } from '@/i18n'
import { getUrl } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'
import VTooltip from '@/components/VTooltip.vue'

const { hash, bech32, name, ticker } = defineProps<{
  hash: string | undefined
  bech32: string | undefined
  name: string | undefined
  ticker: string | undefined
  itn?: boolean
  mithril?: boolean
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
