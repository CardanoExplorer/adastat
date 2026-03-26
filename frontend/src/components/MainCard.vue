<template>
  <VCard class="flex flex-col justify-between border-b-2">
    <div class="flex gap-2 text-right text-xs">
      <slot name="icon">
        <component :is="icon" class="h-9" :class="iconClass" />
      </slot>
      <div class="ml-auto leading-4 text-slate-500 capitalize dark:text-gray-400">
        <slot name="title">{{ t(title) }}</slot>
      </div>
    </div>
    <div class="flex min-h-7 flex-wrap items-end gap-x-2">
      <slot name="desc"></slot>
      <div class="ml-auto grid text-right text-xl leading-5 font-semibold">
        <slot name="value">
          <Transition
            enter-from-class="scale-0"
            enter-active-class="transition delay-200 duration-800"
            leave-to-class="opacity-0 -translate-y-full"
            leave-active-class="transition duration-1000">
            <div :key="value" class="col-span-full row-span-full">{{ value }}</div>
          </Transition>
        </slot>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import type { Component, StyleValue } from 'vue'

import { t } from '@/i18n'

import VCard from '@/components/VCard.vue'

const { title = '' } = defineProps<{
  icon?: Component
  title?: string
  value?: string
  iconClass?: StyleValue
}>()
</script>
