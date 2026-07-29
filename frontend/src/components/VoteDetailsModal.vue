<template>
  <Transition
    enter-from-class="scale-120 opacity-0"
    enter-active-class="duration-300 ease-out"
    leave-active-class="duration-300 ease-out"
    leave-to-class="scale-120 opacity-0"
    @after-enter="onOpen">
    <section
      v-if="visible"
      class="fixed inset-0 z-80 mx-auto flex flex-col overflow-auto overscroll-none bg-sky-50/90 text-sm shadow-blur-xs shadow-slate-400 backdrop-blur-xs sm:bottom-auto sm:max-h-4/5 sm:w-300 sm:max-w-[80vw] sm:overflow-visible sm:rounded-b-3xl sm:backdrop-brightness-200 dark:bg-gray-900/90 dark:shadow-sky-800"
      role="dialog"
      aria-modal="true">
      <div class="flex flex-1 flex-col sm:min-h-0">
        <header
          class="sticky top-0 z-2 bg-sky-50 pt-6 pb-4 shadow-blur shadow-sky-50 sm:mx-auto sm:w-4/5 sm:pt-10 sm:pb-0 dark:bg-gray-900 dark:shadow-gray-900">
          <div
            class="absolute top-0 left-0 h-11 w-full bg-linear-to-b from-fuchsia-100/80 to-sky-50 sm:hidden dark:from-sky-950/80 dark:to-gray-900"></div>
          <div class="relative flex h-10 items-center">
            <h2 class="mx-auto text-lg sm:mx-0">{{ t('comment') }}</h2>
            <button
              type="button"
              class="absolute left-6 size-10 rotate-180 rounded-md bg-sky-100 p-3 text-slate-700 sm:hidden dark:bg-gray-800/50 dark:text-gray-300"
              :aria-label="t('close')"
              @click="emit('close')">
              <ChevronIcon />
            </button>
          </div>
        </header>

        <div
          class="pointer-events-none absolute bottom-0 left-0 hidden h-20 w-full bg-radial-[farthest-side_at_50%_100%] from-fuchsia-100 sm:block dark:from-sky-950"></div>

        <div
          class="mt-2 flex min-h-0 flex-1 scrollbar-track-fuchsia-100 flex-col sm:my-4 sm:-mr-6 sm:overflow-auto sm:overscroll-none sm:mask-[linear-gradient(to_bottom,transparent_0.5rem,black_1.5rem,black_calc(100%-1.5rem),transparent_calc(100%-0.5rem))] sm:pt-2 sm:pb-4 dark:scrollbar-track-sky-900">
          <div class="mx-2 flex flex-1 flex-col sm:ml-[calc(min(60rem,64vw)/8)] sm:w-[min(60rem,64vw)]">
            <section v-if="comment" class="px-2 pt-2 sm:px-0">
              <MarkdownContent :html="comment" class="text-s" />
            </section>

            <section
              v-if="rationale"
              class="px-2 pt-6 sm:px-0"
              :class="{ 'mt-10 border-t border-sky-100 dark:border-gray-800': comment }">
              <h3 class="mb-3 py-2 text-lg">
                {{ t('rationale') }}
              </h3>
              <MarkdownContent :html="rationale" class="text-s" />
            </section>

            <ModalFooter />
          </div>
        </div>
        <div
          class="pointer-events-none sticky bottom-0 z-1 mt-6 shadow-blur shadow-sky-50 sm:hidden dark:shadow-gray-900"></div>
      </div>

      <button
        ref="closeButton"
        type="button"
        class="absolute top-0 right-0 hidden size-10 rounded-md bg-fuchsia-50 py-3 text-slate-700 hover:bg-fuchsia-100 sm:top-3 sm:-right-14 sm:block dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-sky-950"
        :aria-label="t('close')"
        @click="emit('close')">
        <CloseIcon class="mx-auto size-4 rotate-180 stroke-2 pointer-fine:hidden" />
        <div class="hidden text-center text-s leading-4 pointer-fine:block">Esc</div>
      </button>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'

import ChevronIcon from '@/assets/icons/chevron.svg?component'
import CloseIcon from '@/assets/icons/close.svg?component'

import { t } from '@/i18n'
import type { Vote } from '@/utils/helper'
import { keyDownSymbol } from '@/utils/injectionSymbols'

import MarkdownContent from '@/components/MarkdownContent.vue'
import ModalFooter from '@/components/ModalFooter.vue'

const { visible = false } = defineProps<{
  visible?: boolean
  vote?: Vote
  comment?: string
  rationale?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const isTouch = 'ontouchstart' in window || window.navigator.maxTouchPoints > 0,
  keyDown = inject(keyDownSymbol)!,
  closeButtonRef = useTemplateRef('closeButton')

const onOpen = () => {
  if (!isTouch) {
    closeButtonRef.value?.focus()
  }
}

const keyDownHandler = watch(keyDown, (val) => {
  if (val.key == 'Escape') {
    emit('close')
  }
})

watch(
  () => visible,
  (val) => {
    if (val) {
      keyDownHandler.resume()
    } else {
      keyDownHandler.pause()
    }
  },
  {
    immediate: true,
  }
)
</script>
