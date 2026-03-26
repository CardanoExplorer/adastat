<template>
  <RouterLink v-if="bech32" :to="{ name: base16 ? 'account' : 'address', params: { id: bech32 } }" class="group flex w-max gap-2.5">
    <component v-if="(balance as number) >= 0" :is="holderIcon" class="my-auto h-9 w-9 transition-transform group-hover:scale-115" />
    <div class="w-40 max-w-[30vw] font-sans">
      <TextTruncate :text="bech32" class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
      <div v-if="base16">
        <TextTruncate :text="base16" class="text-xs font-light" />
      </div>
    </div>
  </RouterLink>
  <div v-else class="flex"><slot> – </slot></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { getHolderIcon } from '@/utils/holderIcons'

import TextTruncate from '@/components/TextTruncate.vue'

const { balance } = defineProps<{
  bech32: string | null | undefined
  base16?: string
  balance?: number | `${number}`
}>()

const holderIcon = computed(() => getHolderIcon(balance!))
</script>
