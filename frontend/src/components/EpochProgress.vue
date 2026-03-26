<template>
  <VCard class="gap-7 sm:flex md:gap-10 lg:gap-12" dark>
    <div class="flex-1">
      <div class="mt-1 mb-2 flex items-center gap-3 font-semibold">
        <div class="text-xl">
          {{ t('epoch') }} <span class="text-sky-500 dark:text-cyan-400">{{ formatNumber(epoch) }}</span>
        </div>
        <div class="ml-auto text-right">
          {{ t('slot') }}
          <CountUp
            :key="numberFormat"
            :value="slot"
            :formatter="(v) => formatNumber(v)"
            stableWidth
            class="inline text-sky-500 dark:text-cyan-400" />
          /
          {{ formatNumber(epochLength) }}
        </div>
      </div>

      <div class="overflow-hidden rounded-full bg-sky-50 dark:bg-gray-800">
        <div
          class="overflow-hidden rounded-full bg-linear-to-br from-cyan-300 to-blue-400 dark:from-cyan-500 dark:to-blue-500"
          :style="{ width: Math.round(percentCompleted * 100) + '%' }">
          <div ref="progress" class="-ml-20">
            <div class="h-4 animate-progress striped-progress md:h-5"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between text-xs sm:mt-1 sm:block">
      <div class="flex items-center sm:mb-2.5 sm:h-7">
        <DoneIcon class="mr-2 w-4" />
        <I18nT tag="div" keypath="pct_done">
          <template #pct>
            <span class="font-medium text-amber-600 dark:text-yellow-400">{{ formatPercent(percentCompleted) }}</span>
          </template>
        </I18nT>
      </div>
      <div class="flex items-center">
        <FinishIcon class="mr-2 w-4" />
        <I18nT tag="div" keypath="time.left">
          <template #time>
            <span class="font-medium text-emerald-600 dark:text-teal-400">{{ t('n.' + timeLeftUnit, timeLeft) }}</span>
          </template>
        </I18nT>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watchEffect } from 'vue'

import DoneIcon from '@/assets/icons/done.svg?component'
import FinishIcon from '@/assets/icons/finish.svg?component'

import { numberFormat, t } from '@/i18n'
import { formatNumber, formatPercent } from '@/utils/formatter'
import { getTimeLeft } from '@/utils/helper'
import { socketData } from '@/utils/socket'

import CountUp from '@/components/CountUp.vue'
import VCard from '@/components/VCard.vue'

const epochLength = import.meta.env.VITE_EPOCH_LENGTH,
  progressRef = useTemplateRef('progress'),
  epoch = ref(0),
  slot = ref(0),
  timeLeft = ref(0),
  timeLeftUnit = ref(''),
  percentCompleted = ref(0)

watchEffect(async () => {
  const data = socketData.value
  if (data) {
    if (slot.value) {
      progressRef.value!.animate(
        {
          transform: 'translateX(4rem)',
        },
        {
          easing: 'ease',
          duration: 1000,
        }
      )
    }
    epoch.value = data.epoch_no
    slot.value = data.epoch_slot_no
    percentCompleted.value = slot.value / epochLength
    ;({ num: timeLeft.value, unit: timeLeftUnit.value } = getTimeLeft(
      (epochLength - slot.value) * import.meta.env.VITE_SLOT_LENGTH
    ))
  }
})
</script>
