<template>
  <div
    class="relative flex h-8 items-center gap-2 rounded-md border border-sky-100 bg-white px-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-800 dark:bg-gray-800">
    <select
      class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-2 opacity-0 open:min-w-max dark:bg-gray-800"
      :value="filterKey"
      @change="(event) => emit('filter', (event.target as HTMLInputElement).value)"
      :disabled="filterHandling">
      <option :key="option.k" :value="option.k" v-for="option of options">
        {{ option.v }}
      </option>
    </select>
    <div class="min-w-0 flex-1 truncate">
      {{ t(filterKeyMap[filterKey]!) }}
    </div>
    <SpinnerIcon v-if="filterHandling" class="size-4 animate-spin stroke-2" />
    <ChevronIcon v-else class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270" stroke-width="1.3" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import ChevronIcon from '@/assets/icons/chevron.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import type { StringObject } from '@/utils/helper'

const { filterKeyMap, filterKey } = defineProps<{
  filterKeyMap: StringObject
  filterKey: string
  filterHandling: boolean
}>()

const emit = defineEmits(['filter'])

const options = computed(() => {
  const _options: { k: string; v: string }[] = []

  for (const [mapKey, mapValue] of Object.entries(filterKeyMap)) {
    _options.push({
      k: mapKey,
      v: t(mapValue),
    })
  }

  _options.sort((a, b) => a.v.localeCompare(b.v))

  return _options
})
</script>
