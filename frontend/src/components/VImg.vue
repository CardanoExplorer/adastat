<template>
  <div class="flex shrink-0 items-center justify-center overflow-hidden" :class="refClass">
    <img
      v-if="resolvedSrc"
      :src="resolvedSrc"
      :alt="alt"
      class="max-h-full max-w-full"
      :class="[{ 'h-full w-full animate-pulse bg-sky-100 dark:bg-gray-800': placeholder }, imgClass]"
      loading="lazy"
      @load="load"
      @error="error" />
    <component
      v-else
      :is="placeholder ? ImageErrorIcon : ImageNoIcon"
      class="h-full max-h-16 w-full max-w-16 opacity-50"
      :class="fallbackClass" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import ImageErrorIcon from '@/assets/icons/img_error.svg?component'
import ImageNoIcon from '@/assets/icons/no_img.svg?component'

import { getUrl } from '@/utils/helper'

const { src, imgClass, fallbackClass, successClass, errorClass } = defineProps<{
  src: string | undefined
  alt?: string
  imgClass?: string
  fallbackClass?: string
  successClass?: string
  errorClass?: string
}>()

const resolvedSrc = ref<string>()

const placeholder = ref<boolean>()

const refClass = ref<string>()

const load = () => {
  placeholder.value = false
  refClass.value = successClass
}

const error = () => {
  resolvedSrc.value = ''
  refClass.value = errorClass
}

watch(
  () => src,
  () => {
    resolvedSrc.value = src ? getUrl(src) : ''
    placeholder.value = Boolean(src)
  },
  {
    immediate: true,
  }
)
</script>
