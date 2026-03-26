<template>
  <div
    class="my-0.5 flex h-4 items-center gap-1 rounded-xs px-1 text-2xs"
    :class="negative ? 'bg-down-50 text-down-700 dark:bg-down-500/10 dark:text-down-500' : 'bg-up-50 text-up-700 dark:bg-up-500/10 dark:text-up-500'">
    <ArrowIcon class="h-2 stroke-2" :class="negative ? 'rotate-225' : 'rotate-135'" />
    {{ value }}
  </div>
</template>

<script setup lang="ts">
import ArrowIcon from '@/assets/icons/arrow.svg?component'

defineProps<{
  value: string
  negative?: boolean
}>()
</script>
