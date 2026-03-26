<template>
  <div class="my-0.5 flex-1 text-2xs leading-4">
    <span class="rounded-sx box-decoration-clone p-1 py-0.5" :class="[text, bg]">
      {{ t(title) }}
      {{ value }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'

import { t } from '@/i18n'

const { title = '', text = 'text-slate-700 dark:text-gray-300' } = defineProps<{
  title?: string
  value?: string
  text?: StyleValue
  bg?: StyleValue
}>()
</script>
