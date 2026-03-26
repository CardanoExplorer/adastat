<template>
  <VTooltip class="max-w-max">
    {{ formatToken(formatValue(value, fractionDigits, short), currency, sign) }}
    <template #tooltip>
      <FormattedAmount :value="value" :fraction-digits="fractionDigits" :currency="currency" :sign="sign" />
    </template>
  </VTooltip>
</template>

<script setup lang="ts">
import { formatToken, formatValue } from '@/utils/formatter'

import FormattedAmount from '@/components/FormattedAmount.vue'
import VTooltip from '@/components/VTooltip.vue'

const {
  value,
  fractionDigits = 6,
  currency = '₳',
  short = true,
} = defineProps<{
  value: number | `${number}` | `${bigint}`
  fractionDigits?: number
  currency?: string
  short?: boolean
  sign?: boolean
}>()
</script>
