import { type App, type Component, Fragment, type VNodeArrayChildren, computed, defineComponent, h, ref, watch } from 'vue'
import { type RouteLocationNamedRaw, type RouteLocationNormalized } from 'vue-router'

import { formatNumber } from '@/utils/formatter'

import currenciesMeta from './currencies.ts'
import flags from './flags.ts'
import localesMeta from './locales.ts'

type Values = {
  [key: string]: string | string[] | Values
}

type GetPluralSuffix = (num: number) => number

interface LocaleData {
  default: Values
  getPluralSuffix: GetPluralSuffix
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof t
  }
}

let $app: App, values: Values, getPluralSuffix: GetPluralSuffix

type Lang = (typeof localesMeta)[number]['code']

const locales = {} as Record<Lang, (typeof localesMeta)[number]>

// const localesMeta: typeof locales = import.meta.glob('./meta/*.ts', {
//   import: 'default',
//   eager: true,
// })

for (const localeMeta of localesMeta) {
  locales[localeMeta.code] = localeMeta
}

const defaultLocale = 'en',
  localeStorageKey = 'lang',
  _locale = ref<Lang>()

const locale = computed({
  get: () => _locale.value!,
  set: (lang: Lang) => {
    if (lang != _locale.value) {
      const { $router: router, $route: route } = $app.config.globalProperties

      const to = routeTo(
        {
          name: route.name,
          params: route.params,
          query: route.query,
          hash: route.hash,
        } as RouteLocationNamedRaw,
        lang
      )

      localStorage.setItem(localeStorageKey, lang)

      router.replace(to)
    }
  },
})

const currencies = {} as Record<Lowercase<(typeof currenciesMeta)[number]['code']>, (typeof currenciesMeta)[number]>

for (const currencyMeta of currenciesMeta) {
  currencies[currencyMeta.code.toLowerCase() as Lowercase<(typeof currenciesMeta)[number]['code']>] = currencyMeta
}

const defaultCurrency = 'usd',
  currencyStorageKey = 'currency',
  storedCurrency = localStorage.getItem(currencyStorageKey) as Lowercase<(typeof currenciesMeta)[number]['code']>,
  currency = ref(storedCurrency && currencies[storedCurrency] ? storedCurrency : defaultCurrency)

watch(currency, (val) => {
  if (val != defaultCurrency) {
    localStorage.setItem(currencyStorageKey, val)
  } else {
    localStorage.removeItem(currencyStorageKey)
  }
})

const localTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeZones = (() => {
    let values: string[]

    try {
      values = (Intl as any).supportedValuesOf('timeZone')
    } catch {
      values = [localTimeZone]

      if (localTimeZone != 'UTC') {
        values.push('UTC')
      }
    }

    return values
  })(),
  timeZoneStorageKey = 'timezone',
  storedTimeZone = localStorage.getItem(timeZoneStorageKey),
  timeZone = ref(storedTimeZone && timeZones.includes(storedTimeZone) ? storedTimeZone : undefined)

watch(timeZone, (val) => {
  if (val) {
    localStorage.setItem(timeZoneStorageKey, val)
  } else {
    localStorage.removeItem(timeZoneStorageKey)

    dateFormat.value = ''

    timeFormat.value = ''

    numberFormat.value = ''

    currencyFormat.value = localCurrencyFormat

    unitFormat.value = localUnitFormat
  }
})

const dateFormats = ['DD.MM.YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD MMM YYYY', 'MMM DD, YYYY', 'DD/MMM/YYYY'] as const,
  localDateFormat = new Intl.DateTimeFormat(undefined, { numberingSystem: 'latn', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts()
    .map((part) => {
      switch (part.type) {
        case 'day':
          return 'DD'
        case 'month':
          return 'MM'
        case 'year':
          return 'YYYY'
        case 'literal':
          return part.value.trim() == '' ? ' ' : part.value
      }

      return ''
    })
    .join(''),
  dateFormatStorageKey = 'format.date',
  storedDateFormat = localStorage.getItem(dateFormatStorageKey) as (typeof dateFormats)[number],
  dateFormat = ref<(typeof dateFormats)[number] | ''>(
    timeZone.value && storedDateFormat != localDateFormat && dateFormats.includes(storedDateFormat) ? storedDateFormat : ''
  )

watch(dateFormat, (val) => {
  if (val) {
    localStorage.setItem(dateFormatStorageKey, val)
  } else {
    localStorage.removeItem(dateFormatStorageKey)
  }
})

const timeFormats = ['12h', '24h'] as const,
  localTimeFormat = new Intl.DateTimeFormat(undefined, { numberingSystem: 'latn', hour: '2-digit' }).format().length > 2 ? '12h' : '24h',
  timeFormatStorageKey = 'format.time',
  storedTimeFormat = localStorage.getItem(timeFormatStorageKey) as (typeof timeFormats)[number],
  timeFormat = ref<(typeof timeFormats)[number] | ''>(
    timeZone.value && storedTimeFormat != localTimeFormat && timeFormats.includes(storedTimeFormat) ? storedTimeFormat : ''
  )

watch(timeFormat, (val) => {
  if (val) {
    localStorage.setItem(timeFormatStorageKey, val)
  } else {
    localStorage.removeItem(timeFormatStorageKey)
  }
})

const numberFormats = ['9,999,999.99', '9.999.999,99', '9 999 999,99', '9’999’999.99', '9999999.99'] as const,
  localNumberFormat = new Intl.NumberFormat(undefined, { numberingSystem: 'latn', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .formatToParts(9999999.99)
    .map((part) => (part.type == 'group' && part.value.trim() == '' ? ' ' : part.value))
    .join(''),
  numberFormatStorageKey = 'format.number',
  storedNumberFormat = localStorage.getItem(numberFormatStorageKey) as (typeof numberFormats)[number],
  numberFormat = ref<(typeof numberFormats)[number] | ''>(numberFormats.includes(storedNumberFormat) && timeZone.value ? storedNumberFormat : '')

watch(numberFormat, (val) => {
  if (val) {
    localStorage.setItem(numberFormatStorageKey, val)
  } else {
    localStorage.removeItem(numberFormatStorageKey)
  }
})

const currencyFormats = ['A9', 'A 9', '9A', '9 A'] as const,
  _localCurrencyFormat = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.value,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  })
    .formatToParts(9)
    .map((part) => {
      switch (part.type) {
        case 'integer':
          return '9'
        case 'literal':
          return ' '
        case 'currency':
          return 'A'
      }

      return ''
    })
    .join('')
    .trim() as (typeof currencyFormats)[number],
  localCurrencyFormat = currencyFormats.includes(_localCurrencyFormat as (typeof currencyFormats)[number])
    ? _localCurrencyFormat
    : _localCurrencyFormat[0] == '9'
      ? '9 A'
      : 'A 9',
  currencyFormatStorageKey = 'format.currency',
  storedCurrencyFormat = localStorage.getItem(currencyFormatStorageKey) as (typeof currencyFormats)[number],
  currencyFormat = ref<(typeof currencyFormats)[number]>(currencyFormats.includes(storedCurrencyFormat) ? storedCurrencyFormat : localCurrencyFormat)

watch(currencyFormat, (val) => {
  if (val != localCurrencyFormat) {
    localStorage.setItem(currencyFormatStorageKey, val)
  } else {
    localStorage.removeItem(currencyFormatStorageKey)
  }
})

const unitFormats = ['9U', '9 U'] as const,
  _localUnitFormat = new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit: 'kilobyte',
    unitDisplay: 'narrow',
  })
    .formatToParts(9)
    .map((part) => {
      switch (part.type) {
        case 'integer':
          return '9'
        case 'literal':
          return ' '
        case 'unit':
          return 'U'
      }

      return ''
    })
    .join('')
    .trim() as (typeof unitFormats)[number],
  localUnitFormat = unitFormats.includes(_localUnitFormat as (typeof unitFormats)[number]) ? _localUnitFormat : '9 U',
  unitFormatStorageKey = 'format.unit',
  storedUnitFormat = localStorage.getItem(unitFormatStorageKey) as (typeof unitFormats)[number],
  unitFormat = ref<(typeof unitFormats)[number]>(unitFormats.includes(storedUnitFormat) ? storedUnitFormat : localUnitFormat)

watch(unitFormat, (val) => {
  if (val != localUnitFormat) {
    localStorage.setItem(unitFormatStorageKey, val)
  } else {
    localStorage.removeItem(unitFormatStorageKey)
  }
})

// const numberFormat = {
//   decimal: '',
//   group: '',
//   currency: '',
//   amountPattern: '',
//   currencyPattern: '',
//   currencyFirst: true,
// }

// for (const part of Intl.NumberFormat(undefined, {
//   style: 'currency',
//   currency: currency.value,
//   currencyDisplay: 'symbol',
//   numberingSystem: 'latn',
// } as Intl.NumberFormatOptions).formatToParts(9999.9)) {
//   if (part.type in numberFormat) {
//     numberFormat[part.type as keyof Omit<typeof numberFormat, 'currencyFirst'>] = part.value
//   }
// }

// let pattern = '',
//   n = false,
//   c = false
// for (const part of Intl.NumberFormat(undefined, {
//   style: 'currency',
//   currency: currency.value,
//   currencyDisplay: 'symbol',
//   minimumFractionDigits: 0,
//   maximumFractionDigits: 0,
//   numberingSystem: 'latn',
// } as Intl.NumberFormatOptions).formatToParts(9)) {
//   if (part.type == 'integer') {
//     if (!n) {
//       pattern += '{n}'
//       n = true
//     }
//   } else if (part.type == 'currency') {
//     if (!c) {
//       pattern += '{c}'
//       c = true
//     }
//   } else if (part.type == 'literal') {
//     pattern += ' '
//   }
// }
// pattern = n && c ? pattern.trim().replace(/\s{2,}/g, ' ') : '{c}{n}'
// numberFormat.amountPattern = pattern
// numberFormat.currencyPattern = pattern.replace('{n}', '')
// numberFormat.currencyFirst = pattern.slice(0, 3) == '{c}'
// }

// getNumberFormat()

const flattenValues = (vals: Values, prefix = '', flatVals: Values = {}) => {
  for (const key of Object.keys(vals)) {
    const keyWithPrefix = prefix ? (key == '_' ? prefix : prefix + '.' + key) : key
    if (typeof vals[key] == 'object' && vals[key] && !Array.isArray(vals[key])) {
      flattenValues(vals[key] as Values, keyWithPrefix, flatVals)
    } else {
      flatVals[keyWithPrefix] = vals[key] as string
    }
  }

  return flatVals
}

const routeMiddleware = async (to: RouteLocationNormalized) => {
  const lang = (to.params.lang as Lang) || defaultLocale,
    storedLang = localStorage.getItem(localeStorageKey) as Lang,
    userLang = locales[storedLang] ? storedLang : ''

  if (userLang && userLang != lang && to.name) {
    return routeTo(
      {
        name: to.name,
        params: to.params,
        query: to.query,
        hash: to.hash,
        replace: true,
        // force: true,
      },
      userLang
    )
  }

  if (_locale.value != lang) {
    const localeData: LocaleData = await import(`./locales/${lang}.ts`)

    values = flattenValues(localeData.default)

    getPluralSuffix = localeData.getPluralSuffix

    _locale.value = lang

    // console.log(`lang ${lang} loaded`)
  }
}

// setPageMeta(title, desc, ogTitle, ogDesc, image) {
//   document.documentElement.lang = currentLanguage
//   document.title = title
//   document.head.querySelector('meta[name="description"]').content = desc
//   document.head.querySelector('meta[property="og:title"]').content = ogTitle || title
//   document.head.querySelector('meta[property="og:description"]').content = ogDesc || desc
//   document.head.querySelector('meta[property="og:image"]').content = image || process.env.VUE_APP_DEFAULT_LOGO
// },
// te(k: string) {
//   return k in i18n.translator.data.values!
// },

const routeTo = (to: string | RouteLocationNamedRaw, lang = _locale.value) => {
  if (typeof to == 'string') {
    to = {
      name: to,
      params: {},
      query: {},
    }
  } else {
    to = {
      params: {},
      ...structuredClone(to),
    }
  }

  if (to.query?.page == '1') {
    delete to.query.page
  }

  to.params!.lang = lang == defaultLocale ? '' : lang

  return to
}

const t = (text: string, numOrPlaceholders?: number | (Record<string, string | number> & { n?: number })): string => {
  let value!: string

  if (_locale.value) {
    if (typeof numOrPlaceholders == 'number') {
      numOrPlaceholders = { n: numOrPlaceholders }
    }

    if (typeof values[text] == 'string') {
      value = values[text]
    } else if (Array.isArray(values[text])) {
      const pluralSuffix = getPluralSuffix(numOrPlaceholders?.n ?? 0)

      if (typeof values[text][pluralSuffix] == 'string') {
        value = values[text][pluralSuffix]
      }
    }

    if (value && typeof numOrPlaceholders == 'object') {
      for (const [k, v] of Object.entries(numOrPlaceholders)) {
        value = value.replace(new RegExp(`{${k}}`, 'g'), typeof v == 'number' ? formatNumber(v) : v)
      }
    }

    if (import.meta.env.MODE == 'development') {
      if (typeof value != 'string' && text != '') {
        console.warn(text)
      }
    }
  }

  return value ?? text
}

type Props = {
  keypath: string
  tag?: string | Component
}

export default {
  install: (app: App) => {
    $app = app
    app.config.globalProperties.$t = t

    app.component(
      'I18nT',
      defineComponent({
        props: ['keypath', 'tag'],
        setup(props: Props, { slots }) {
          return () => {
            const children: VNodeArrayChildren = []

            for (const part of t(props.keypath).split(/({\w+})/gm)) {
              if (part != '') {
                const slotName = part[0] == '{' && part[part.length - 1] == '}' ? part.slice(1, -1) : ''

                children.push(slots[slotName] ? slots[slotName]() : part)
              }
            }

            return h((props.tag || Fragment) as string, children)
          }
        },
      })
    )

    // $app.component('I18nLink', defineComponent({
    //   setup(props, { slots }) {
    //     return () => {

    //       return h(
    //         RouterLink,
    //         {
    //           ...props,
    //           to: routeTo(props.to as RouteLocationNamedRaw, _locale.value)
    //         },
    //         slots
    //       )
    //     }
    //   },

    //   props: (RouterLink as any).props
    // }))
  },
}

export {
  flags,
  routeMiddleware,
  locale,
  locales,
  t,
  currency,
  currencies,
  localTimeZone,
  timeZone,
  timeZones,
  localDateFormat,
  dateFormat,
  dateFormats,
  localTimeFormat,
  timeFormat,
  timeFormats,
  defaultLocale,
  localNumberFormat,
  numberFormat,
  numberFormats,
  localCurrencyFormat,
  currencyFormat,
  currencyFormats,
  localUnitFormat,
  unitFormat,
  unitFormats,
}
