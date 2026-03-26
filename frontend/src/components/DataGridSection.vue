<template>
  <slot name="header">
    <DataGridSectionHeader v-if="header" class="mt-5 mb-3" :header="header" />
  </slot>
  <div class="font-alt font-medium" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'

const { header = '' } = defineProps<{
  header?: string
}>()
</script>
