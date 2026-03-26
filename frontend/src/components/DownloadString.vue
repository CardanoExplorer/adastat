<template>
  <button class="shrink-0 opacity-80 transition-opacity hover:opacity-100" @click.stop.prevent="downloadString" :title="t('download')">
    <DownloadIcon class="stroke-2" />
  </button>
</template>

<script setup lang="ts">
import DownloadIcon from '@/assets/icons/download.svg?component'

import { t } from '@/i18n'

const {
  text,
  name = 'metadata',
  ext = 'json',
} = defineProps<{
  text: string
  name?: string
  ext?: keyof typeof fileTypes
}>()

const fileTypes = {
  json: 'application/json',
  plutus: 'application/octet-stream',
}

const getBlobPart = () => {
  if (fileTypes[ext] == 'application/octet-stream' && /^([0-9a-fA-F]{2})+$/.test(text)) {
    const byteArray = new Uint8Array(text.length / 2)

    for (let i = 0; i < text.length; i += 2) {
      byteArray[i / 2] = parseInt(text.slice(i, i + 2), 16)
    }

    return byteArray
  }

  return text
}

const downloadString = () => {
  const blob = new Blob([getBlobPart()], { type: fileTypes[ext] }),
    link = document.createElement('a')

  link.download = `${name}.${ext}`
  link.href = URL.createObjectURL(blob)
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(link.href)
  }, 100)
}
</script>
