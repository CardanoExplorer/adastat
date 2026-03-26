<template>
  <div
    class="w-max rounded-sx p-0.5 px-2 text-2xs font-medium text-slate-700 dark:text-gray-900"
    :class="statusColors[status]">
    {{ t(status) }}
  </div>
</template>

<script lang="ts">
const statusColors = {
  ratified: 'bg-teal-300 dark:bg-teal-400',
  enacted: 'bg-up-300 dark:bg-up-400',
  expired: 'bg-yellow-300 dark:bg-yellow-400',
  failed: 'bg-down-300 dark:bg-down-400',
  closed: 'bg-violet-300 dark:bg-violet-400',
  completed: 'bg-indigo-300 dark:bg-indigo-400',
  active: 'bg-sky-300 dark:bg-sky-400',
  invalidated: 'bg-orange-200 dark:bg-orange-300',
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'
import { getGovActionStatus } from '@/utils/helper'

const { type, enacted_epoch, ratified_epoch, dropped_epoch, expired_epoch } = defineProps<{
  type: string
  enacted_epoch?: number
  ratified_epoch?: number
  dropped_epoch?: number
  expired_epoch?: number
}>()

const status = computed(() => getGovActionStatus(type, enacted_epoch, ratified_epoch, dropped_epoch, expired_epoch))
</script>
