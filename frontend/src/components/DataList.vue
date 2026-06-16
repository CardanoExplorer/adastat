<template>
  <div>
    <Transition enter-from-class="-translate-x-full opacity-0" enter-active-class="duration-300 ease-out">
      <div
        v-if="activeFilters.length"
        class="flex items-center gap-3 px-5 pt-2 pb-7 text-xs text-slate-800 dark:text-gray-300">
        <div
          :key="id"
          v-for="{ id, name, val } of activeFilters"
          class="flex h-8 items-center rounded-full bg-sky-100 pl-3 dark:bg-gray-800">
          <div>{{ t(name) }}:</div>
          <div class="ml-2 text-slate-500 dark:text-gray-400">{{ t(val) }}</div>
          <button class="size-8" @click="emit('filter', id, '')">
            <CloseIcon class="mx-auto size-3.5" />
          </button>
        </div>
        <button class="underline decoration-dashed" @click="emit('filter', '', '')">{{ t('filters.clear') }}</button>
      </div>
    </Transition>
    <div class="sticky top-11 sm:top-16 md:top-20" ref="sticker"></div>
    <div ref="tRef" class="-mt-2 -mr-2 overflow-x-auto overflow-y-hidden scroll-mask-r pr-2 scrollbar-thin">
      <table class="w-full border-separate border-spacing-y-1 pt-2 font-alt text-sm font-light whitespace-nowrap">
        <thead class="sticky top-0 z-5 whitespace-nowrap select-none" ref="thead">
          <TransitionGroup
            enter-from-class=""
            enter-active-class=""
            enter-to-class=""
            move-class="duration-500"
            leave-from-class=""
            leave-active-class=""
            leave-to-class=""
            tag="tr"
            class="bg-white dark:bg-gray-800">
            <th
              :key="id"
              v-for="({ id, name, sort, filter }, i) of cols"
              class="bg-sky-50 dark:bg-gray-900 [&:hover]:*:last:block"
              :class="[
                id == sortKey ? 'font-semibold' : 'font-normal text-slate-600 dark:text-gray-300',
                i == stickyColIdx ? 'sticky left-0 z-4' : 'relative',
                {
                  'w-0 pr-0 sm:pr-0 md:pr-0': i == 0 && stickyColIdx == 1,
                },
              ]">
              <div
                :ref="
                  (el) => {
                    if (id != 'watchlist') {
                      tabDnd.registerDropZone(i, el as HTMLElement)
                    }
                  }
                "
                class="flex h-14 items-center bg-white p-2 text-left font-sans text-xs capitalize sm:p-3 md:h-16 md:p-4 dark:bg-gray-800"
                :class="[
                  {
                    'rounded-l-md md:rounded-l-lg': i == 0,
                    'rounded-r-md md:rounded-r-lg': i == lastColIdx,
                  },
                  tabDnd.getDropZoneClass(i),
                ]">
                <button
                  v-if="sort"
                  @click="emit('sort', id)"
                  class="flex items-center capitalize hover:text-slate-950 dark:hover:text-gray-100">
                  {{ t(name) }}
                  <div class="ml-1 size-3">
                    <SpinnerIcon stroke-width="1.5" v-if="id == sortHandling" class="animate-spin" />
                    <SortInactiveIcon
                      stroke-width="1.5"
                      v-else-if="id != sortKey"
                      class="text-slate-500 dark:text-gray-500" />
                    <SortIcon
                      stroke-width="1.5"
                      v-else
                      :class="{
                        '-scale-y-100': sortDir == 'asc',
                      }" />
                  </div>
                </button>
                <div v-else-if="id != 'watchlist'">{{ t(name) }}</div>
                <button
                  v-if="filter"
                  class="relative ml-1 size-3"
                  :class="filter.val ? 'text-amber-500 dark:text-yellow-500' : 'text-slate-500 dark:text-gray-500'">
                  <SpinnerIcon stroke-width="1.5" v-if="id == filterHandling" class="animate-spin" />
                  <template v-else>
                    <select
                      :value="filter.val"
                      class="absolute right-0 w-max cursor-pointer appearance-none bg-white px-3 text-slate-950 opacity-0 dark:bg-gray-800 dark:text-gray-100"
                      @change="(event) => emit('filter', id, (event.target as any).value)">
                      <option :value="value" :key="value" v-for="(name, value) of filter.options">{{ t(name) }}</option>
                    </select>
                    <FilterIcon stroke-width="1.5" />
                  </template>
                </button>
              </div>
              <div
                v-if="i < lastColIdx && i >= stickyColIdx"
                class="pointer-events-none absolute top-0 bottom-0 left-full z-1 w-2 bg-linear-to-r from-white sm:w-3 md:w-4 dark:from-gray-800">
                <div class="absolute top-4 bottom-4 left-0 w-px bg-linear-to-b via-sky-100 dark:via-gray-700"></div>
              </div>
              <DragButton v-if="id != 'watchlist'" v-bind="tabDnd.getDragHandleProps(i)" />
            </th>
          </TransitionGroup>
        </thead>
        <tbody ref="tbody">
          <TransitionGroup
            enter-from-class="-translate-y-full"
            enter-active-class="transition-transform duration-500"
            enter-to-class=""
            move-class="transition-transform duration-500"
            leave-from-class=""
            leave-active-class="hidden"
            leave-to-class="">
            <tr
              :key="uniqueKey(row)"
              v-for="row of rows"
              class="hover:*:from-fuchsia-100/30 dark:hover:*:from-gray-700/20"
              :class="rowClass?.(row)">
              <td
                :key="col.id"
                v-for="(col, i) of cols"
                class="bg-sky-50 bg-linear-to-r from-100% p-2 sm:p-3 md:p-4 dark:bg-gray-900"
                :class="{
                  'w-0 pr-0 sm:pr-0 md:pr-0': i == 0 && stickyColIdx == 1,
                  'rounded-l-md md:rounded-l-lg': i == 0,
                  'sticky left-0 z-4': i == stickyColIdx,
                  'rounded-r-md md:rounded-r-lg': i == lastColIdx,
                  'from-white/60 dark:from-gray-800/30': zebra[uniqueKey(row)],
                }">
                <!-- <div
                  v-if="i == stickyColIdx"
                  class="absolute top-0 bottom-0 left-full w-1.5 bg-linear-to-r md:w-2"
                  :class="zebra[uniqueKey(row)] ? 'dark:bg-gray-900/10' : 'from-sky-50 dark:from-gray-900'"></div> -->
                <slot :name="col.slot" :id="col.id" :row="row"></slot>
              </td>
            </tr>
          </TransitionGroup>
        </tbody>
      </table>
    </div>
    <!-- <div class="sticky bottom-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
      <div class="h-px w-2/1"></div>
    </div> -->
    <slot name="default" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, unref, useTemplateRef, watch } from 'vue'

import CloseIcon from '@/assets/icons/close.svg?component'
import FilterIcon from '@/assets/icons/filter.svg?component'
import SortIcon from '@/assets/icons/sort.svg?component'
import SortInactiveIcon from '@/assets/icons/sort_inactive.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import { useDragAndDrop } from '@/utils/dnd'
import type { AnyObject, BooleanObject, Filter } from '@/utils/helper'
import type { SortDir } from '@/utils/settings'

import DragButton from '@/components/DragButton.vue'

type Col = {
  id: string
  name: string
  slot: string
  sort?: boolean
  hidden?: boolean
  filter?: Filter
}

type Row = AnyObject

const {
  cols: unsortedCols = [],
  rows = [],
  uniqueKey,
  view,
  watchlist,
} = defineProps<{
  cols: Col[] | undefined
  rows: Row[] | undefined
  uniqueKey: (row: Row) => string | number
  view: string
  sortKey: string
  sortDir: SortDir
  sortHandling: string
  rowClass?: (row: Row) => string | null
  watchlist?: boolean
  filterHandling?: string
}>()

const emit = defineEmits<{
  sort: [sortKey: string]
  filter: [filterKey: string, filterValue: string]
}>()

const cols = ref(unsortedCols)

const stickyColIdx = computed(() => (watchlist ? 1 : 0))

const lastColIdx = computed(() => unsortedCols.length - 1)

const activeFilters = computed(() => {
  const _activeFilters = []

  for (const { id, name, filter } of unsortedCols) {
    const val = unref(filter?.val)
    if (val) {
      _activeFilters.push({
        id,
        name,
        val: filter!.options[val as any]!,
      })
    }
  }

  return _activeFilters
})

const theadRef = useTemplateRef('thead'),
  tbodyRef = useTemplateRef('tbody'),
  stickerRef = useTemplateRef('sticker'),
  zebra = ref<BooleanObject>({}),
  tRef = useTemplateRef('tRef')

const tabDnd = useDragAndDrop({
  scrollContainer: tRef,
  onReorder: (from: number, to: number) => {
    tabDnd.reorder(cols.value, from, to)

    localStorage.setItem(`${view}.cols`, JSON.stringify(cols.value.map(({ id }) => id)))
  },
})

let headerTimerID: number, prevHeaderOffset: number

const setHeaderStyle = (transition = '', transform = '', opacity = '') => {
  const style = theadRef.value!.style

  style.transition = transition
  style.transform = transform
  style.opacity = opacity
}

const translateHeader = () => {
  const headerOffset = Math.min(stickerRef.value!.offsetTop - theadRef.value!.offsetTop, tbodyRef.value!.clientHeight)

  if (headerOffset > 0) {
    // setHeaderStyle('', `translateY(${translateY}px)`)
    clearTimeout(headerTimerID)

    setHeaderStyle('', `translateY(${headerOffset - theadRef.value!.clientHeight}px)`, '0')

    headerTimerID = setTimeout(() => {
      setHeaderStyle('transform 0.5s, opacity 0.5s', `translateY(${headerOffset}px)`)
    }, 0)
  } else if (prevHeaderOffset > 0) {
    setHeaderStyle('opacity 0.5s')
  }

  prevHeaderOffset = headerOffset
}

const setZebra = (zebraVal: boolean) => {
  const newZebra: typeof zebra.value = {}

  for (const row of rows) {
    const zebraKey = uniqueKey(row)

    if (zebraKey in zebra.value && zebra.value[zebraKey] != zebraVal) {
      zebra.value = {}
      return setZebra(false)
    }

    newZebra[zebraKey] = zebraVal

    zebraVal = !zebraVal
  }

  zebra.value = newZebra
}

watch(
  () => unsortedCols,
  () => {
    cols.value = unsortedCols

    try {
      const colsOrder: string[] = JSON.parse(localStorage.getItem(`${view}.cols`)!)

      if (Array.isArray(colsOrder)) {
        const orderMap = new Map(colsOrder.map((id, idx) => [id, idx]))

        cols.value.sort((a, b) => (orderMap.get(a.id) ?? -1) - (orderMap.get(b.id) ?? -1))
      }
    } catch {}

    if (watchlist) {
      cols.value.unshift({ id: 'watchlist', slot: 'watchlist', name: '' })
    }
  },
  {
    immediate: true,
  }
)

watch(
  () => rows,
  () => {
    setZebra(true)
  },
  {
    immediate: true,
    deep: false,
  }
)

onMounted(() => {
  window.addEventListener('scroll', translateHeader)
  window.addEventListener('resize', translateHeader)
})

onUnmounted(() => {
  window.removeEventListener('scroll', translateHeader)
  window.removeEventListener('resize', translateHeader)

  clearTimeout(headerTimerID)
})
</script>
