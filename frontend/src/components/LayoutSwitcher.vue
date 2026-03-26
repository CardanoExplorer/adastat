<template>
  <div class="flex gap-1 text-blue-400 dark:text-gray-100">
    <button
      class="rounded p-2 md:rounded-md"
      :class="layout == key ? 'bg-sky-100 dark:bg-gray-800' : 'opacity-50 transition-opacity hover:opacity-80'"
      @click="layout = key"
      :key="key"
      v-for="key of ['list', 'grid'] as const">
      <component :is="key == 'list' ? ListIcon : GridIcon" class="size-5" stroke-width="1.4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import GridIcon from '@/assets/icons/grid.svg?component'
import ListIcon from '@/assets/icons/list.svg?component'

import { layout } from '@/utils/settings'
</script>
