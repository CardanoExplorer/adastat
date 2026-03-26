<template>
  <TransitionGroup
    enter-from-class="scale-0"
    enter-active-class="transition-transform duration-300"
    move-class="transition-transform duration-300"
    leave-active-class="hidden"
    tag="div"
    class="grid gap-2 overflow-hidden sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
    <div
      :key="row[uniqueKey]"
      v-for="row of rows"
      class="group relative overflow-hidden rounded-lg bg-white/70 p-2 hover:bg-white md:p-3 lg:px-4 xl:p-4 dark:bg-gray-800/40 dark:hover:bg-gray-800/70">
      <slot :row="row" />
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { AnyObject } from '@/utils/helper'

defineProps<{
  rows: AnyObject[]
  uniqueKey: string
}>()
</script>
