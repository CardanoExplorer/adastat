<template>
  <template v-if="epoch != null">
    <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(epochEndTime) }}</div>
    <I18nT v-if="timeLeft > 0" tag="div" keypath="time.left" class="mt-1 text-xs leading-5 font-light">
      <template #time>
        <span class="font-medium text-emerald-600 dark:text-teal-400">{{ t('n.' + timeLeftUnit, timeLeft) }}</span>
      </template>
    </I18nT>
    <div v-else class="mt-1 text-xs leading-5 font-light">{{ t('epoch') }} {{ epoch }}</div>
  </template>
  <template v-else>–</template>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

import { t } from '@/i18n'
import { formatDateTime } from '@/utils/formatter'
import { getEpochEndTime, getTimeLeft } from '@/utils/helper'
import { socketData } from '@/utils/socket'

const timeLeft = ref(0),
  timeLeftUnit = ref('')

const { epoch } = defineProps<{
  epoch: number | null | undefined
}>()

const epochEndTime = computed(() => getEpochEndTime(epoch!))

watchEffect(async () => {
  if (socketData.value && epoch != null) {
    ;({ num: timeLeft.value, unit: timeLeftUnit.value } = getTimeLeft(epochEndTime.value - Date.now() / 1000))
  }
})
</script>
