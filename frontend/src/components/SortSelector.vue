<template>
  <div class="relative">
    <select
      class="h-8 appearance-none rounded-md border border-sky-100 bg-white py-1.5 pr-8 pl-2 text-s dark:border-gray-800 dark:bg-gray-800"
      :value="sortKey"
      @change="(event) => emit('sort', (event.target as HTMLInputElement).value)"
      :disabled="!!sortHandling">
      <option :key="option.k" :value="option.k" v-for="option of options">
        {{ option.v }}
      </option>
    </select>
    <SpinnerIcon v-if="sortHandling" class="absolute top-0 right-0 z-1 size-8 animate-spin stroke-2 p-2.5" />
    <SortIcon
      v-else
      class="absolute top-0 right-0 z-1 size-8 cursor-pointer stroke-2 p-2.5"
      :class="sortDir == 'asc' ? '*:last:hidden' : '*:first:hidden'"
      @click="emit('sort', sortKey)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import SortIcon from '@/assets/icons/sort.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import type { StringObject } from '@/utils/helper'
import type { SortDir } from '@/utils/settings'

const { sortPoint, sortKeyMap, sortKey } = defineProps<{
  sortPoint: string
  sortKeyMap: StringObject
  sortKey: string
  sortDir: SortDir
  sortHandling: string
}>()

const emit = defineEmits(['sort'])

const options = computed(() => {
  const _map: typeof sortKeyMap = {},
    _options: { k: string; v: string }[] = []

  for (const [mapKey, mapValue] of Object.entries(sortKeyMap)) {
    if (!_map[mapValue] || sortKey == mapKey) {
      _map[mapValue] = mapKey
    }
  }

  for (const val of Object.values(_map)) {
    _options.push({
      k: val,
      v: t(`table_cols.${sortPoint}.${val}`),
    })
  }

  _options.sort((a, b) => a.v.localeCompare(b.v))

  return _options
})
</script>
