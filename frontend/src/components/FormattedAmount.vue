<template>
  <div>
    {{ data.sign + data.prefix + data.int
    }}<template v-if="data.fract"
      >{{ fractSep }}<small class="font-light">{{ data.fract }}</small></template
    ><template v-if="data.unit">{{ unitSeparator + t('abbr.number.' + data.unit) }}</template
    >{{ data.suffix }}
  </div>
</template>

<script lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'
import { currencyFormat, localNumberFormat, numberFormat } from '@/i18n'
import { formatNumber, formatToken, unitSeparator } from '@/utils/formatter'
import { getShortNumber } from '@/utils/helper'

const fractSep = computed(() => (numberFormat.value || localNumberFormat).slice(-3, -2))
</script>

<script setup lang="ts">
const {
  value,
  fractionDigits = 6,
  currency = '₳',
  short,
  sign,
} = defineProps<{
  value: number | `${number}` | `${bigint}`
  fractionDigits?: number
  currency?: string
  short?: boolean
  sign?: boolean
}>()

const data = computed(() => {
  let num: number,
    intStr: string,
    fractStr: string,
    unit!: string,
    prefix = '',
    suffix = ''

  if (short) {
    ;({ num, unit } = getShortNumber(
      Math.abs(fractionDigits > 0 ? (value as number) / Math.pow(10, fractionDigits) : (value as number))
    ))
    ;({ 0: intStr = '', 1: fractStr = '' } = ('' + num).split('.'))
  } else {
    const numStr = ((value as number) < 0 ? ('' + value).slice(1) : '' + value).padStart(fractionDigits + 1, '0')

    intStr = numStr.slice(0, numStr.length - fractionDigits)
    fractStr = numStr.slice(intStr.length)

    if (fractionDigits > 0 && '0'.repeat(fractionDigits) == fractStr) {
      // fractStr = intStr === '0' ? '' : '0'.repeat(Math.min(2, fractionDigits))
      fractStr = ''
    }
  }

  if (currencyFormat.value[0] == '9') {
    suffix = formatToken('', currency)
  } else {
    prefix = formatToken('', currency)
  }

  return {
    sign: (value as number) < 0 ? '-' : sign && (value as number) > 0 ? '+' : '',
    int: formatNumber(intStr as `${number}`, 0),
    fract: fractStr,
    unit,
    suffix,
    prefix,
  }
})
</script>
