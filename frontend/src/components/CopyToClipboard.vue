<template>
  <button
    class="shrink-0 opacity-80 transition-opacity hover:opacity-100"
    @click.stop.prevent="copyToClipboard"
    :title="t('clipboard.' + (copied ? 'copied' : 'copy'))">
    <CopyIcon class="stroke-2" :class="{ '*:last:hidden': !copied }" />
  </button>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

import CopyIcon from '@/assets/icons/copy.svg?component'

import { t } from '@/i18n'

const { text } = defineProps<{ text: string }>()

const copied = ref(false)

let copiedTimer: number

const copyToClipboard = () => {
  navigator.clipboard?.writeText(text).then(() => {
    clearTimeout(copiedTimer)
    copied.value = true
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}

onUnmounted(() => clearTimeout(copiedTimer))
</script>
