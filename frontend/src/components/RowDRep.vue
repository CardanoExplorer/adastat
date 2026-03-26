<template>
  <RouterLink v-if="bech32" :to="{ name: 'drep', params: { id: hash || bech32 } }" class="flex items-center gap-1 font-medium">
    <VImg class="size-5" :src="image" imgClass="rounded" />
    <TextTruncate :text="hash ? drepName : t(drepName)" :tail-length="drepName == bech32 ? 6 : 0" class="text-sky-500 *:underline dark:text-cyan-400" />
  </RouterLink>
  <div v-else class="text-amber-500 dark:text-amber-400">{{ t('drep.no') }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'

import TextTruncate from '@/components/TextTruncate.vue'
import VImg from '@/components/VImg.vue'

const { hash, bech32, image, name } = defineProps<{
  bech32?: string
  hash?: string
  image?: string
  name?: string
}>()

const drepName = computed(() => {
  let _drepName!: string

  if (hash) {
    _drepName = name?.trim() || bech32!
  } else if (bech32) {
    _drepName = bech32.replace('_', '.')
  }

  return _drepName
})
</script>
