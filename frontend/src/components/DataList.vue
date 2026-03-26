<template>
  <div>
    <div class="sticky top-11 sm:top-16 md:top-20" ref="sticker"></div>
    <div class="-mr-2 overflow-x-auto overflow-y-hidden scroll-mask-r pr-2 scrollbar-thin">
      <table class="w-full border-separate border-spacing-y-1 font-alt text-sm font-light whitespace-nowrap">
        <thead class="sticky top-0 z-5 font-sans text-xs whitespace-nowrap select-none" ref="thead">
          <tr>
            <th
              :key="id"
              v-for="({ id, name, sort }, i) of cols"
              class="bg-sky-50 dark:bg-gray-900"
              :class="[
                id == sortKey ? 'font-semibold' : 'font-normal text-slate-600 dark:text-gray-300',
                {
                  'w-0 pr-0 sm:pr-0 md:pr-0': i == 0 && stickyColIdx == 1,
                  'sticky left-0 z-4': i == stickyColIdx,
                },
              ]">
              <div
                class="relative flex h-14 items-center bg-white p-2 text-left capitalize sm:p-3 md:h-16 md:p-4 dark:bg-gray-800"
                :class="{
                  'rounded-l-md md:rounded-l-lg': i == 0,
                  'rounded-r-md md:rounded-r-lg': i == lastColIdx,
                }">
                <div
                  v-if="i < lastColIdx && i >= stickyColIdx"
                  class="pointer-events-none absolute top-0 bottom-0 left-full z-1 w-2 bg-linear-to-r from-white sm:w-3 md:w-4 dark:from-gray-800">
                  <div class="absolute top-4 bottom-4 left-0 w-px bg-linear-to-b via-sky-100 dark:via-gray-700"></div>
                </div>
                <button
                  v-if="sort"
                  @click="emit('sort', id)"
                  class="flex items-center capitalize hover:text-slate-950 dark:hover:text-gray-100">
                  {{ t(name) }}
                  <SpinnerIcon v-if="id == sortHandling" class="ml-0.5 size-3 animate-spin stroke-2" />
                  <SortIcon
                    v-else
                    class="ml-1.5 size-2.5 stroke-2"
                    :class="
                      id == sortKey
                        ? sortDir == 'asc'
                          ? '*:last:hidden'
                          : '*:first:hidden'
                        : 'text-slate-500 *:even:hidden dark:text-gray-500'
                    " />
                </button>
                <template v-else-if="id != 'watchlist'">{{ t(name) }}</template>
              </div>
            </th>
          </tr>
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
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import SortIcon from '@/assets/icons/sort.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import type { AnyObject, BooleanObject } from '@/utils/helper'
import type { SortDir } from '@/utils/settings'

type Col = {
  id: string
  name: string
  slot: string
  sort?: boolean
  hidden?: boolean
}

type Row = AnyObject

const {
  cols = [],
  rows = [],
  uniqueKey,
} = defineProps<{
  cols: Col[] | undefined
  rows: Row[] | undefined
  uniqueKey: (row: Row) => string | number
  // sortPoint: string
  sortKey: string
  sortDir: SortDir
  sortHandling: string
  rowClass?: (row: Row) => string | null
}>()

const emit = defineEmits<{
  sort: [sortKey: string]
}>()

const stickyColIdx = computed(() => (cols[0]?.id == 'watchlist' ? 1 : 0))

const lastColIdx = computed(() => cols.length - 1)

const theadRef = useTemplateRef('thead'),
  tbodyRef = useTemplateRef('tbody'),
  stickerRef = useTemplateRef('sticker'),
  zebra = ref<BooleanObject>({})

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
