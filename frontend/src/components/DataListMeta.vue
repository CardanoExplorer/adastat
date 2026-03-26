<template>
  <template v-if="url">
    <a
      :href="getUrl(url)"
      target="_blank"
      class="mb-1 block w-72 max-w-[30vw] truncate font-medium text-sky-500 underline dark:text-cyan-400">
      {{ url }}
    </a>
    <div class="w-40 max-w-[30vw]"><TextTruncate :text="hash!" class="text-xs font-light" /></div>
  </template>
  <slot v-else> – </slot>
</template>

<script setup lang="ts">
import { getUrl } from '@/utils/helper'

import TextTruncate from '@/components/TextTruncate.vue'

defineProps<
  | {
      url: undefined
      hash: undefined
    }
  | {
      url: string
      hash: string
    }
>()
</script>
