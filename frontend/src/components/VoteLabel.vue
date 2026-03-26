<template>
  <div class="flex items-center gap-1.5">
    <div
      class="w-max rounded-sx p-0.5 px-2.5 text-2xs font-medium whitespace-nowrap text-slate-700 dark:text-gray-900"
      :class="[
        colorClass ?? (vote == 'no' ? 'bg-down-300 dark:bg-down-400' : vote == 'yes' ? 'bg-up-300 dark:bg-up-400' : 'bg-slate-300 dark:bg-gray-400'),
        { 'line-through': invalid },
      ]">
      {{ t(vote) }}
    </div>
    <VTooltip v-if="invalid" class="size-4 cursor-help text-orange-500 dark:text-orange-400" bg="bg-orange-200 dark:bg-yellow-700">
      <WarningIcon stroke-width="1.5" />
      <template #tooltip>
        {{ t('vote.invalid.' + invalid.reason, { vote: t(invalid.vote) }) }}
      </template>
    </VTooltip>
    <VTooltip v-if="comment" class="size-4 cursor-help opacity-70">
      <InfoIcon stroke-width="1.5" />
      <template #tooltip>
        <div v-html="comment"></div>
      </template>
    </VTooltip>
  </div>
</template>

<script setup lang="ts">
import InfoIcon from '@/assets/icons/info.svg?component'
import WarningIcon from '@/assets/icons/warning.svg?component'

import { t } from '@/i18n'

import VTooltip from '@/components/VTooltip.vue'

defineProps<{
  vote: 'yes' | 'no' | 'abstain'
  comment?: string
  invalid?: {
    reason: string
    vote: string
  }
  colorClass?: string
}>()
</script>
