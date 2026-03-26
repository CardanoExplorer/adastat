<template>
  <I18nT v-if="txTime" tag="div" class="mb-1 text-slate-500 dark:text-gray-400" keypath="time.ago">
    <template #time>
      <span v-if="last" class="text-amber-700 dark:text-orange-300">{{ formatTimeAgo(lastSyncTime - txTime) }}</span>
      <span v-else class="text-indigo-700 dark:text-indigo-400">{{ formatTimeAgo(lastSyncTime - txTime) }}</span>
    </template>
  </I18nT>
  <RouterLink
    v-if="txHash"
    :to="{ name: 'transaction', params: { id: txHash } }"
    class="text-xs leading-5 font-medium text-sky-500 underline dark:text-cyan-400">
    {{ formatDateTime(txTime!) }}
  </RouterLink>
  <div v-else-if="txTime" class="text-xs leading-5">{{ formatDateTime(txTime) }}</div>
  <template v-else>–</template>
</template>

<script setup lang="ts">
import { lastSyncTime } from '@/utils/api'
import { formatDateTime, formatTimeAgo } from '@/utils/formatter'

defineProps<
  | {
      txHash: undefined
      txTime: undefined
      last?: boolean
    }
  | {
      txHash: string
      txTime: number
      last?: boolean
    }
>()
</script>
