<template>
  <div
    class="rounded-xl border border-sky-100 bg-white p-2 text-slate-900 md:p-3 lg:px-4 xl:p-4 dark:border-gray-800"
    :class="dark ? 'dark:bg-gray-900 dark:text-gray-100' : 'dark:bg-gray-800 dark:text-white'">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dark?: boolean
}>()
</script>
