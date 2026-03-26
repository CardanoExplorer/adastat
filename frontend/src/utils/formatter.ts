// import state from '@/state'
import { computed } from 'vue'

import { currencies, currency, currencyFormat, dateFormat, numberFormat, t, timeFormat, timeZone, unitFormat } from '@/i18n'
import { getShortNumber } from '@/utils/helper'

const NBSP = ' '

const cachedNumberFormats: Record<string, Intl.NumberFormat> = {}

const getDateTimeFormat = (dateTime: 0 | 1 | 2, hour12?: boolean) =>
  new Intl.DateTimeFormat(undefined, {
    numberingSystem: 'latn',
    timeZone: timeZone.value,
    ...(dateTime != 2
      ? {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }
      : {}),
    ...(dateTime != 1
      ? {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: hour12,
        }
      : {}),
  })

const getUnitSeparator = (uf = unitFormat.value) => (uf == '9U' ? '' : NBSP)

const timeZoneOffset = computed(() =>
  new Date(
    '1970-01-01 00:00:00 ' +
      new Intl.DateTimeFormat('en-GB', {
        numberingSystem: 'latn',
        timeZone: timeZone.value,
        timeZoneName: 'shortOffset',
      })
        .formatToParts()
        .map((v) => (v.type == 'timeZoneName' ? v.value : ''))
        .join('')
  ).getTime()
)

const localDateFormat = computed(() => getDateTimeFormat(1))

const localTimeFormat = computed(() => getDateTimeFormat(2))

const h12TimeFormat = computed(() => getDateTimeFormat(2, true))

const h24TimeFormat = computed(() => getDateTimeFormat(2, false))

const localDateTimeFormat = computed(() => getDateTimeFormat(0))

const h12DateTimeFormat = computed(() => getDateTimeFormat(0, true))

const h24DateTimeFormat = computed(() => getDateTimeFormat(0, false))

const unitSeparator = computed(() => getUnitSeparator())

const formatToken = (amount: string | number, tokenSymbol = '₳', sign = false, cf = currencyFormat.value) => {
  let absAmount = amount + '',
    signSymbol = ''

  if (absAmount[0] == '-') {
    absAmount = absAmount.slice(1)
    signSymbol = '-'
  } else if (sign) {
    signSymbol = '+'
  }

  switch (cf) {
    case 'A9':
      return `${signSymbol}${tokenSymbol}${absAmount}`
    case '9 A':
      return `${signSymbol}${absAmount}${NBSP}${tokenSymbol}`
    case 'A 9':
      return `${signSymbol}${tokenSymbol}${NBSP}${absAmount}`
  }

  return `${signSymbol}${absAmount}${tokenSymbol}`
}

const formatCurrency = (amount: string | number, currencySymbol?: string) => {
  return formatToken(amount, currencySymbol || currencies[currency.value]?.sign)
}

const formatNumber = (
  num: number | `${number}` | `${bigint}`,
  fractionDigits: number | { min: number; max: number } = -1,
  isShort = false,
  nf = numberFormat.value
) => {
  let unit!: string, locales: Intl.LocalesArgument

  const maximumFractionDigits = typeof fractionDigits == 'number' ? fractionDigits : fractionDigits.max,
    minimumFractionDigits = typeof fractionDigits == 'number' ? 0 : fractionDigits.min,
    cachedNumberFormatId = `${nf}_${minimumFractionDigits}_${maximumFractionDigits}`,
    options: Intl.NumberFormatOptions = {
      numberingSystem: 'latn',
      useGrouping: true,
    }

  if (maximumFractionDigits >= 0) {
    options.maximumFractionDigits = maximumFractionDigits
  }
  if (minimumFractionDigits >= 0) {
    options.minimumFractionDigits = minimumFractionDigits
  }

  if (isShort) {
    const { num: _num, unit: _unit } = getShortNumber(num)

    // if (_num > 999) {
    //   return Number(num).toExponential()
    // }

    num = _num
    unit = _unit
    // } else if ((num as number) > 999_995_000_000_000) {
    //   return Number(num).toExponential()
  }

  if (nf) {
    switch (nf) {
      case '9,999,999.99':
        locales = 'en-GB'
        break
      case '9.999.999,99':
        locales = 'de-DE'
        break
      case '9 999 999,99':
        locales = 'fr-FR'
        break
      case '9’999’999.99':
        locales = 'de-CH'
        break
      default:
        locales = 'en-GB'
        options.useGrouping = false
    }
  }

  let value = (cachedNumberFormats[cachedNumberFormatId] ?? (cachedNumberFormats[cachedNumberFormatId] = new Intl.NumberFormat(locales, options))).format(
    num as number
  )

  if (unit) {
    value += unitSeparator.value + t('abbr.number.' + unit)
  }

  return value
}

const formatValue = (num: number | `${number}` | `${bigint}`, fractionDigits = 6, isShort = true, nf = numberFormat.value) => {
  if (isShort) {
    return formatNumber(fractionDigits > 0 ? (num as number) / Math.pow(10, fractionDigits) : num, 2, isShort, nf)
  }

  const sign = (num as number) < 0 ? '-' : '',
    numStr = (sign ? ('' + num).slice(1) : '' + num).padStart(fractionDigits + 1, '0'),
    intStr = numStr.slice(0, numStr.length - fractionDigits),
    fractStr = numStr.slice(intStr.length),
    formatedStr = formatNumber(intStr as `${number}`, { min: fractionDigits, max: fractionDigits }, isShort, nf)

  return sign + formatedStr.slice(0, formatedStr.length - fractionDigits) + (fractionDigits > 2 && '0'.repeat(fractionDigits) == fractStr ? '00' : fractStr)
}

const formatUnit = (num: number | string, unit: string, uf = unitFormat.value) => {
  return `${num}${getUnitSeparator(uf)}${unit}`
}

const formatBytes = (value: number, unit?: 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte' | 'terabyte' | 'petabyte') => {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'] as const

  if (unit) {
    value /= Math.pow(1024, units.indexOf(unit))
  } else {
    for (let idx = 1; !unit; idx++) {
      if (value < 1024 || idx == units.length) {
        unit = units[idx - 1]
      } else {
        value /= 1024
      }
    }
  }

  return formatNumber(value, 1) + unitSeparator.value + t('abbr.data.' + unit)
}

const formatPercent = (num: number, fractionDigits: number | { min: number; max: number } = 0, isShort = false) => {
  return formatUnit(formatNumber(num * 100, fractionDigits, isShort), '%')
}

const formatPrice = (price: number, fractionDigits?: number) => {
  if (fractionDigits === undefined) {
    if (price < 1) {
      fractionDigits = 4
    } else if (price < 10) {
      fractionDigits = 3
    } else if (price < 100) {
      fractionDigits = 2
    } else if (price < 1000) {
      fractionDigits = 1
    } else {
      fractionDigits = 0
    }
  }

  return formatNumber(price, { min: fractionDigits, max: fractionDigits })
}

const formatHash = (hash: string, left = 6, right = 6) => {
  return hash ? (hash.length > left + right + 1 ? hash.slice(0, left) + '…' + hash.slice(-right) : hash) : ''
}

// const formatTimeUnit = (value: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year', unitDisplay: 'short' | 'long' | 'narrow' = 'short') => {
//   return new Intl.NumberFormat(locale.value, {
//     style: 'unit',
//     unit: unit,
//     unitDisplay: unitDisplay,
//   }).format(value)
// }

// const formatRelativeTime = (seconds: number) => {
//   let value = Math.abs(seconds) || 0,
//     unit: Intl.RelativeTimeFormatUnit

//   if (value < 60) {
//     value = Math.max(value, 1)
//     unit = 'second'
//   } else if (value < 3600) {
//     value = Math.floor(value / 60)
//     unit = 'minute'
//   } else if (value < 86_400) {
//     value = Math.floor(value / 3_600)
//     unit = 'hour'
//   } else if (value < 2_592_000) {
//     value = Math.floor(value / 86_400)
//     unit = 'day'
//   } else if (value < 31_536_000) {
//     value = Math.floor(value / 2_592_000)
//     unit = 'month'
//   } else {
//     // for years we round value to 0.5
//     value = Math.round((value * 2) / 31_536_000) / 2
//     unit = 'year'
//   }

//   return new Intl.RelativeTimeFormat().format(seconds < 0 ? -value : value, unit)
// }

const formatDate = (timestamp: number | `${number}`, df = dateFormat.value) => {
  if (df) {
    const date = new Date((timestamp as number) * 1000 - timeZoneOffset.value),
      day = (date.getUTCDate() + '').padStart(2, '0'),
      monthNum = date.getUTCMonth(),
      month = df.length > 10 ? t('abbr.month.' + monthNum) : (monthNum + 1 + '').padStart(2, '0'),
      year = date.getUTCFullYear()

    switch (df) {
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`
      case 'YYYY/MM/DD':
        return `${year}/${month}/${day}`
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`
      case 'DD MMM YYYY':
        return `${day}${NBSP}${month}${NBSP}${year}`
      case 'MMM DD, YYYY':
        return `${month}${NBSP}${day},${NBSP}${year}`
      case 'DD/MMM/YYYY':
        return `${day}/${month}/${year}`
    }
  }

  return localDateFormat.value.format((timestamp as number) * 1000)
}

const formatTime = (timestamp: number | `${number}`, tf = timeFormat.value) => {
  return (tf ? (tf == '12h' ? h12TimeFormat : h24TimeFormat) : localTimeFormat).value.format((timestamp as number) * 1000)
}

const formatDateTime = (timestamp: number | `${number}`, df = dateFormat.value, tf = timeFormat.value) => {
  if (df) {
    return formatDate(timestamp, df) + (df[0] == 'Y' ? ' ' : ', ') + formatTime(timestamp, tf)
  }

  return (tf ? (tf == '12h' ? h12DateTimeFormat : h24DateTimeFormat) : localDateTimeFormat).value.format((timestamp as number) * 1000)
}

const formatTimeAgo = (num: number, isShort = true) => {
  let res: number, unit: string

  if (num < 60) {
    if (num < 1) {
      num = 1
    }
    res = 1
    unit = 'second'
  } else if (num < 3570) {
    res = 60
    unit = 'minute'
  } else if (num < 84600) {
    res = 3600
    unit = 'hour'
  } else if (num < 2592000) {
    res = 86400
    unit = 'day'
  } else if (num < 30304800) {
    res = 2635200
    unit = 'month'
  } else {
    res = 31536000
    unit = 'year'
  }

  return t(isShort ? `n.${unit}.short` : `n.${unit}`, Math.round(num / res))
}

// const formatPool = (hash: string, ticker?: string, name?: string) => {
//   if (name) {
//     hash = name
//     if (ticker) {
//       hash += ' [' + ticker + ']'
//     }
//   } else if (ticker) {
//     hash = ticker
//   } else {
//     hash = formatHash(hash, 10, 6)
//   }

//   return hash
// }

const formatTruncate = (str: string, length: number) => {
  const arr = [...str]

  if (arr[0] == '\uFEFF') {
    arr.shift()
  }

  return arr.length <= length + 1 ? arr.join('') : arr.slice(0, length).join('') + '…'
}

export {
  unitSeparator,
  formatBytes,
  formatCurrency,
  formatHash,
  formatNumber,
  formatPercent,
  formatPrice,
  formatUnit,
  // formatTimeUnit,
  // formatRelativeTime,
  formatToken,
  formatTruncate,
  formatDate,
  formatTime,
  formatDateTime,
  formatTimeAgo,
  formatValue,
}
