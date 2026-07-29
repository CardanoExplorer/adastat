<template>
  <div class="flex items-center gap-1.5">
    <div
      class="relative w-max rounded-sx p-0.5 px-2.5 text-2xs font-medium whitespace-nowrap text-slate-700 capitalize"
      :class="[
        colorClass ??
          (vote == 'no'
            ? 'bg-down-300 dark:bg-down-400'
            : vote == 'yes'
              ? 'bg-up-300 dark:bg-up-400'
              : vote == 'abstain'
                ? 'bg-slate-300 dark:bg-gray-400'
                : 'bg-sky-100 dark:bg-gray-800'),
        vote ? 'dark:text-gray-900' : 'dark:text-gray-300',
        { 'line-through': invalid },
      ]">
      <slot>{{ t(vote || 'not_voted') }}</slot>
    </div>
    <VTooltip
      v-if="invalid"
      class="size-4 cursor-help text-orange-500 dark:text-orange-400"
      bg="bg-orange-200 dark:bg-yellow-700">
      <WarningIcon stroke-width="1.5" />
      <template #tooltip>
        {{ t(`vote.invalid.${invalid.reason}` as any, { vote: t(invalid.vote as any) }) }}
      </template>
    </VTooltip>
    <VTooltip
      v-if="comment || rationale"
      ref="commentTooltip"
      tag="button"
      type="button"
      class="size-4 cursor-help opacity-70"
      :aria-label="`${t(comment ? 'comment' : 'rationale')}: ${t('show.more')}`"
      aria-haspopup="dialog"
      @show="onTooltipShow"
      @hide="onTooltipHide"
      @click="openDetails">
      <InfoIcon stroke-width="1.5" />
      <template #tooltip>
        <div
          ref="commentPreview"
          class="vote-comment-preview max-h-30 overflow-hidden py-1"
          :class="{ 'scroll-mask-b': commentOverflow }">
          <div ref="commentPreviewContent" class="pointer-events-none">
            <MarkdownContent :html="comment || (rationale as string)" class="text-xs text-slate-950 dark:text-white" />
          </div>
        </div>
        <button
          v-if="commentOverflow || rationale"
          type="button"
          class="float-right py-1 text-xs underline decoration-dashed underline-offset-2"
          @click.stop="openDetails">
          {{ t('show.more') }}
        </button>
      </template>
    </VTooltip>
  </div>
</template>

<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'

import InfoIcon from '@/assets/icons/info.svg?component'
import WarningIcon from '@/assets/icons/warning.svg?component'

import { t } from '@/i18n'
import type { Vote } from '@/utils/helper'
import { openVoteDetailsModalSymbol } from '@/utils/injectionSymbols'

import MarkdownContent from '@/components/MarkdownContent.vue'
import VTooltip from '@/components/VTooltip.vue'

const props = defineProps<{
  vote?: Vote
  comment?: string
  rationale?: string
  invalid?: {
    reason: string
    vote: string
  }
  colorClass?: string
}>()

const openVoteDetailsModal = inject(openVoteDetailsModalSymbol)!,
  commentTooltipRef = useTemplateRef('commentTooltip'),
  commentPreviewRef = useTemplateRef('commentPreview'),
  commentPreviewContentRef = useTemplateRef('commentPreviewContent'),
  commentOverflow = ref(false)

let previewResizeObserver: ResizeObserver | undefined

const updateCommentOverflow = () => {
  const preview = commentPreviewRef.value
  commentOverflow.value = Boolean(preview && preview.scrollHeight > preview.clientHeight + 1)
}

const onTooltipShow = () => {
  nextTick(() => {
    updateCommentOverflow()

    if (commentPreviewContentRef.value) {
      previewResizeObserver = new ResizeObserver(updateCommentOverflow)
      previewResizeObserver.observe(commentPreviewContentRef.value)
    }
  })
}

const onTooltipHide = () => {
  previewResizeObserver?.disconnect()
  previewResizeObserver = undefined
}

const openDetails = () => {
  if (props.comment || props.rationale) {
    onTooltipHide()
    commentTooltipRef.value?.hide()
    openVoteDetailsModal(props, commentTooltipRef.value?.getTarget())
  }
}

onBeforeUnmount(onTooltipHide)
</script>
