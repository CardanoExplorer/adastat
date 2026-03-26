import { type Ref, ref, watch } from 'vue'

import type { StringObject } from '@/utils/helper'

type SortDir = 'asc' | 'desc'

type Limit = (typeof limitList)[number]

const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)'),
  limitList = [12, 24, 48, 96] as const,
  storage = localStorage,
  storageDarkMode = storage.getItem('darkmode'),
  storageTrendColors = +storage.getItem('trendcolors')! as 1 | 2 | 3,
  // appTheme = ref<'light' | 'dark' | 'system'>(storageDarkMode ? (storageDarkMode == '1' ? 'dark' : 'light') : 'system'),
  appTheme = ref<'light' | 'dark' | 'system'>(storageDarkMode ? (storageDarkMode == '1' ? 'dark' : 'light') : 'dark'),
  darkMode = ref() as Ref<boolean>,
  trendColors = ref([1, 2, 3].includes(storageTrendColors) ? storageTrendColors : (0 as const)),
  autoUpdate = ref(storage.getItem('autoupdate') != '0'),
  layout = ref<'list' | 'grid'>(storage.getItem('layout') == 'grid' ? 'grid' : 'list'),
  limit = ref(limitList[Math.abs(limitList.indexOf(+storage.limit as Limit))]!)

const getSortKey = (point: string, sortKeyMap: StringObject): string => {
  const sortKey = storage.getItem(point + '.sort')!

  return sortKeyMap[sortKey] ? sortKey : (Object.keys(sortKeyMap)[0] ?? '')
}

const getSortDir = (point: string): SortDir => {
  return storage.getItem(point + '.dir') == 'asc' ? 'asc' : 'desc'
}

const setSortKey = (point: string, value: string): string => {
  storage.setItem(point + '.sort', value)

  return value
}

const setSortDir = (point: string, value: SortDir): SortDir => {
  storage.setItem(point + '.dir', value)

  return value
}

const toggleSortDir = (point: string, value: SortDir): SortDir => {
  return setSortDir(point, value == 'desc' ? 'asc' : 'desc')
}

const onChangePrefersColorScheme = ({ matches: isDark }: { matches: boolean }) => {
  darkMode.value = isDark
}

watch(
  appTheme,
  (val, oldVal) => {
    if (val == 'system') {
      darkMode.value = prefersColorScheme.matches
      prefersColorScheme.addEventListener('change', onChangePrefersColorScheme)
      if (val != oldVal) {
        storage.removeItem('darkmode')
      }
    } else {
      darkMode.value = val == 'dark'
      prefersColorScheme.removeEventListener('change', onChangePrefersColorScheme)
      if (val != oldVal) {
        storage.setItem('darkmode', +darkMode.value as any as string)
      }
    }
  },
  {
    immediate: true,
  }
)

watch(trendColors, (val) => {
  if (val) {
    storage.setItem('trendcolors', val as any as string)
  } else {
    storage.removeItem('trendcolors')
  }
})

watch(autoUpdate, (val) => {
  if (val) {
    storage.removeItem('autoupdate')
  } else {
    storage.setItem('autoupdate', 0 as any as string)
  }
})

watch(layout, (val) => {
  if (val == 'grid') {
    storage.setItem('layout', val)
  } else {
    storage.removeItem('layout')
  }
})

watch(limit, (val) => {
  storage.setItem('limit', val as any as string)
})

export { storage, appTheme, darkMode, trendColors, autoUpdate, layout, limitList, limit, getSortKey, getSortDir, setSortKey, setSortDir, toggleSortDir }

export type { SortDir }
