<template>
  <component v-if="tag" :is="tag" v-bind="$attrs">
    <slot />
  </component>
  <slot v-else />
</template>

<script setup lang="ts">
import { type Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  tag: string | Component | null
}>()
</script>
