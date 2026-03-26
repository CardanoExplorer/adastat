<template>
  <div class="flex text-2xs">
    <div class="ml-auto flex items-center rounded bg-sky-100 p-0.5 px-1.5 text-slate-950 dark:bg-gray-800 dark:text-gray-300">
      <slot>{{ t(header) }}</slot>
    </div>
    <slot name="content"></slot>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/i18n'

const { header = '' } = defineProps<{
  header?: string
}>()
</script>
