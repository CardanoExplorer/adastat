<template>
  <div class="mt-2 bg-sky-50 sm:mt-4 md:mt-6 dark:bg-slate-900">
    <button
      class="flex w-full gap-4 rounded-xl bg-white p-4 text-left dark:bg-gray-800"
      @click="visibleFlag = !visibleFlag">
      <component :is="icon" class="mt-1.5 size-7" stroke-width="1.3" stroke="url(#gradient-sky)" />
      <div>
        {{ title }}
        <div class="mt-px text-2xs text-slate-500 dark:text-gray-400">{{ desc }}</div>
      </div>
      <ChevronIcon
        class="mt-1.5 ml-auto size-7 px-1.5 transition-transform duration-500"
        preserveAspectRatio="none"
        :class="{ 'rotate-90': visibleFlag }" />
    </button>

    <Transition
      enter-from-class="grid-rows-[0fr] opacity-0"
      enter-to-class="grid-rows-[1fr]"
      leave-from-class="grid-rows-[1fr]"
      leave-to-class="grid-rows-[0fr] opacity-0">
      <div v-if="visibleFlag" class="grid overflow-hidden px-3 transition-all duration-500">
        <div class="-mx-1 min-h-0 min-w-0 text-slate-700 dark:text-gray-300">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { type Component, ref } from 'vue'

import ChevronIcon from '@/assets/icons/chevron.svg?component'

const { icon } = defineProps<{
  icon: Component
  title: string
  desc: string
}>()

const visibleFlag = ref(false)
</script>
