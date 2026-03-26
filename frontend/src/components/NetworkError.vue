<template>
  <div>
    <h1>{{ $t('error.code_' + errorCode) }}</h1>
    <p>{{ $t('error.desc_' + errorCode) }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { code } = defineProps<{ code: number }>()

const errorCode = computed(() => {
  return (
    {
      404: 404,
      500: 500,
      503: 503,
    }[code] || 504
  )
})
</script>
