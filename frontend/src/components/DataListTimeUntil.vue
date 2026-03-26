<template>
  <template v-if="epoch != null">
    <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(getEpochEndTime(epoch)) }}</div>
    <div class="mt-1 text-xs leading-5 font-light">{{ t('epoch') }} {{ epoch }}</div>
  </template>
  <template v-else>–</template>
</template>

<script setup lang="ts">
import { t } from '@/i18n'
import { formatDateTime } from '@/utils/formatter'
import { getEpochEndTime } from '@/utils/helper'

defineProps<{
  epoch: number | null | undefined
}>()
</script>
