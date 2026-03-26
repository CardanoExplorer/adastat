<template>
  <div class="flex gap-2">
    <UnlockedIcon v-if="!iconHide" class="h-10 w-10 stroke-[0.5] p-0.5 text-down-600 dark:text-down-400" />
    <div class="min-w-max">
      <div class="text-sm leading-5">{{ t('deregistration') }}</div>
      <div class="inline-block text-xs leading-5 opacity-70">{{ t('refund') }}</div>
      <TooltipAmount
        :value="value"
        class="ml-1.5 inline-block bg-linear-to-r from-lime-700 to-yellow-700 bg-clip-text font-alt text-transparent dark:from-lime-400 dark:to-yellow-400" />
    </div>
  </div>
</template>

<script setup lang="ts">
import UnlockedIcon from '@/assets/icons/unlocked.svg?component'

import { t } from '@/i18n'

import TooltipAmount from '@/components/TooltipAmount.vue'

defineProps<{
  value: number | `${number}` | `${bigint}`
  iconHide?: boolean
}>()
</script>
