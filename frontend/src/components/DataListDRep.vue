<template>
  <RouterLink
    v-if="bech32"
    class="flex max-w-52 gap-2.5 font-sans md:max-w-60"
    :to="{ name: 'drep', params: { id: bech32 } }">
    <VImg
      class="h-10 w-10"
      :src="getUrl(`/images/dreps/${bech32}.webp`)"
      imgClass="rounded-md"
      fallback-class="stroke-[0.5]" />
    <div class="min-w-0 font-medium">
      <TextTruncate
        :text="base16 ? drepName : t(drepName)"
        :tail-length="drepName == bech32 ? 6 : 0"
        class="mb-1.5 text-sky-500 *:underline dark:text-cyan-400" />
      <div v-if="desc" class="text-xs font-light">
        {{ desc }}
      </div>
    </div>
  </RouterLink>
  <div v-else class="flex"><slot> – </slot></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'
import { getUrl } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'
import VImg from '@/components/VImg.vue'

const { base16, bech32, name } = defineProps<{
  bech32?: string
  base16?: string
  name?: string
  image?: string
  desc?: string
}>()

const drepName = computed(() => {
  let _drepName!: string

  if (base16) {
    _drepName = name?.trim() || bech32!
  } else if (bech32) {
    _drepName = bech32.slice(5)
  }

  return _drepName
})
</script>
