<template>
  <RouterLink
    :to="{ name: 'token', params: { id: fingerprint } }"
    class="relative flex w-max max-w-52 gap-2.5 md:max-w-60">
    <div class="mt-0.5 h-10 w-10 shrink-0">
      <VImg
        :src="image"
        :alt="getTokenName(props)"
        class="h-full w-full rounded"
        :class="{ 'opacity-50': genuine === false }"
        fallback-class="stroke-[0.5]" />
    </div>
    <div class="min-w-0">
      <TextTruncate
        :text="name?.trim() || asset_name?.trim() || asset_name_hex || fingerprint"
        :tail-length="name?.trim() || asset_name?.trim() ? 0 : 6"
        class="mb-1.5 font-medium text-sky-500 *:underline dark:text-cyan-400" />
      <div class="mb-0.5 text-xs">{{ ticker }}</div>
    </div>
    <div v-if="genuine === false" class="absolute mt-0.5 flex h-10 w-10 items-center justify-center text-xs">
      <small class="rotate-356 rounded-xs bg-red-500 px-0.5 font-medium text-white">SCAM</small>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { getTokenName } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'
import VImg from '@/components/VImg.vue'

const props = defineProps<{
  fingerprint: string
  name: string | undefined
  ticker: string | undefined
  asset_name: string | undefined
  asset_name_hex: string | undefined
  image: string | undefined
  genuine: boolean | null
}>()
</script>
