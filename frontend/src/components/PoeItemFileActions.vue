<template>
  <div>
    <div v-if="sealed" class="grid grid-cols-2 rounded-lg bg-white/80 p-1 dark:bg-gray-800/30" role="tablist">
      <button
        class="rounded-md px-2 py-2 text-xs transition-colors"
        :class="
          mode === 'original' ? 'bg-white font-medium shadow-sm dark:bg-gray-800' : 'opacity-60 hover:opacity-100'
        "
        type="button"
        role="tab"
        :aria-selected="mode === 'original'"
        @click="mode = 'original'">
        {{ t('poe.check.file') }}
      </button>
      <button
        class="rounded-md px-2 py-2 text-xs transition-colors"
        :class="mode === 'sealed' ? 'bg-white font-medium shadow-sm dark:bg-gray-800' : 'opacity-60 hover:opacity-100'"
        type="button"
        role="tab"
        :aria-selected="mode === 'sealed'"
        @click="mode = 'sealed'">
        {{ t('poe.open.sealed.file') }}
      </button>
    </div>
    <div v-else class="text-xs font-medium">{{ t('poe.check.file') }}</div>

    <p class="mt-2 text-3xs leading-4 opacity-70">
      {{ t(mode === 'sealed' ? 'poe.open.sealed.desc' : 'poe.check.file.desc') }}
    </p>

    <PoeItemFileCheck v-show="mode === 'original'" class="mt-3" :hashes="hashes" :item-number="itemNumber" />
    <PoeItemSealedOpen v-if="sealed && enc" v-show="mode === 'sealed'" class="mt-3" :enc="enc" :hashes="hashes" />

    <p class="mt-3 border-t border-slate-200 pt-2 text-3xs leading-4 opacity-60 dark:border-gray-700">
      {{ t('poe.file.stays_local') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { t } from '@/i18n'

import PoeItemFileCheck from '@/components/PoeItemFileCheck.vue'
import PoeItemSealedOpen from '@/components/PoeItemSealedOpen.vue'

type FileMode = 'original' | 'sealed'
type HexEnvelope = {
  scheme?: number
  aead?: string
  kem?: string
  nonce?: string
  slots_mac?: string
  slots?: Array<{ epk?: string; kem_ct?: string; wrap?: string }>
  passphrase?: {
    alg?: string
    salt?: string
    params?: { m?: number; t?: number; p?: number }
  }
}

const {
  enc,
  hashes,
  itemNumber,
  sealed = false,
} = defineProps<{
  enc?: HexEnvelope
  hashes: Record<string, string>
  itemNumber: number
  sealed?: boolean
}>()

const mode = ref<FileMode>('original')
</script>
