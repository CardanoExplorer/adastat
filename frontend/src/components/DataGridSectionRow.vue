<template>
  <div class="flex min-h-6 items-end justify-between gap-1">
    <div class="relative min-w-min flex-1 overflow-hidden font-sans font-light" :class="hideDots ? 'pr-1' : 'pr-5'">
      <slot name="title">{{ t(title) }}</slot>
      <i v-if="!hideDots" class="absolute bottom-1 ml-1 w-full border-b border-dashed opacity-20"></i>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { t } from '@/i18n'

const { title = '' } = defineProps<{
  title?: string
  hideDots?: boolean
}>()
</script>
