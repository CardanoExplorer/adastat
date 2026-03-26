<template>
  <div class="max-h-50 overflow-hidden">
    <VImg :src="src" class="mx-auto mb-4 max-h-30 max-w-30 rounded-xl" img-class="w-full h-full" />
    <VImg
      :src="src"
      class="mx-auto max-h-30 max-w-30 -scale-y-100 rounded-xl mask-linear-0 mask-linear-from-0% mask-linear-to-50% opacity-20"
      img-class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import VImg from '@/components/VImg.vue'

defineProps<{
  src: string
}>()
</script>
