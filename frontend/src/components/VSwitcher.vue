<template>
  <button class="h-5 w-10 rounded-full bg-slate-50 dark:bg-gray-700" @click="model = !model">
    <div
      class="h-5 w-5 rounded-full bg-linear-to-br from-violet-400 to-sky-400 transition-all dark:from-violet-500 dark:to-sky-500"
      :class="model ? 'translate-x-full' : 'opacity-30'"></div>
  </button>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
</script>
