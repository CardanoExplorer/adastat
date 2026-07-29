<template>
  <div v-html="html" class="prose prose-sm max-w-none wrap-anywhere dark:prose-invert"></div>
</template>

<script setup lang="ts">
defineProps<{
  html: string
}>()
</script>
