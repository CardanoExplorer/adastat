<template>
  <I18nT tag="div" class="mt-px font-alt text-slate-500 dark:text-gray-400" keypath="time.ago">
    <template #time>
      <span class="text-indigo-700 dark:text-indigo-400">{{ formatTimeAgo(lastSyncTime - time) }}</span>
    </template>
  </I18nT>
  <div class="mt-px pt-1.5 text-xs text-amber-700 dark:text-orange-300">{{ formatDateTime(time) }}</div>
</template>

<script setup lang="ts">
import { lastSyncTime } from '@/utils/api'
import { formatDateTime, formatTimeAgo } from '@/utils/formatter'

defineProps<{
  time: number
}>()
</script>
