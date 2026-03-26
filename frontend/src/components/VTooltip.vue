<template>
  <component
    :is="tag"
    :class="{ 'cursor-help': cursorHelp && tooltipData }"
    :title="titleVisible ? title : null"
    ref="target"
    @pointerover="onPointerOver"
    @click="onClick">
    <slot />

    <Teleport to="body">
      <div
        v-if="tooltipData"
        class="absolute z-80 p-2 transition duration-300"
        :style="{
          top: tooltipData.top,
          left: tooltipData.left,
          opacity: tooltipData.opacity,
          visibility: tooltipData.visibility as CSSProperties['visibility'],
          transform: tooltipData.transform as CSSProperties['transform'],
        }"
        ref="tooltip">
        <!-- <div
          v-if="tooltipData.arrowTop"
          class="relative left-1/2 -mb-2 w-fit"
          :style="{ transform: tooltipData.arrowTransform as string, marginLeft: tooltipData.arrowMarginLeft }">
          <div class="border-c3 bg-c22 h-2 w-2 rounded-full border"></div>
          <div class="border-c3 bg-c22 ml-1 h-3.5 w-3.5 rounded-full border"></div>
        </div> -->
        <div class="max-w-72 overflow-hidden rounded px-2.5 py-1.5 text-xs wrap-break-word hyphens-auto *:whitespace-normal" :class="bg">
          <slot name="tooltip">
            <template v-if="title">{{ title }}</template>
            <slot v-else />
          </slot>
        </div>
        <div
          class="absolute left-1/2 -ml-1 size-2 translate-y-0 rotate-45"
          :class="[tooltipData.arrowTop ? 'top-1' : 'bottom-1', bg]"
          :style="{ '--tw-translate-x': tooltipData.arrowTransform ?? 0 }"></div>
        <!-- <div
          v-if="!tooltipData.arrowTop"
          class="relative left-1/2 -mt-2 w-fit"
          :style="{ transform: tooltipData.arrowTransform as string, marginLeft: tooltipData.arrowMarginLeft }">
          <div class="border-c3 bg-c22 ml-1 h-3.5 w-3.5 rounded-full border"></div>
          <div class="border-c3 bg-c22 h-2 w-2 rounded-full border"></div>
        </div> -->
      </div>
    </Teleport>
  </component>
</template>

<script setup lang="ts">
import { type CSSProperties, type Component, type StyleValue, inject, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import { pointerSymbol } from '@/utils/injectionSymbols'

let tooltipTimerID: number | undefined, updateTooltipHandler: ReturnType<typeof watch> | undefined

const {
  tag = 'div',
  title,
  truncate,
  cursorHelp,
  hideByClick,
  bg = 'bg-sky-200 dark:bg-sky-600',
} = defineProps<{
  tag?: string | Component
  title?: string
  truncate?: boolean
  cursorHelp?: boolean
  hideByClick?: boolean
  bg?: StyleValue
}>()

const emit = defineEmits(['show', 'hide'])

const targetRef = useTemplateRef('target'),
  tooltipRef = useTemplateRef('tooltip'),
  tooltipData = ref<Record<string, string | number>>(),
  titleVisible = ref(true),
  pointer = inject(pointerSymbol)!,
  docEl = document.documentElement,
  onClick = ref()

let targetRect = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

const setTargetRect = () => {
  const target = ((targetRef.value! as any).$el ?? targetRef.value) as HTMLElement,
    targetClientRect = target.getBoundingClientRect(),
    targetRectOriginal = {
      left: Math.floor(Math.max(targetClientRect.left, 0)),
      top: Math.floor(Math.max(targetClientRect.top, 0)),
      right: Math.ceil(Math.min(targetClientRect.right, docEl.clientWidth)),
      bottom: Math.ceil(Math.min(targetClientRect.bottom, docEl.clientHeight)),
    }

  targetRect = {
    left: targetRectOriginal.left,
    top: targetRectOriginal.top,
    right: targetRectOriginal.right,
    bottom: targetRectOriginal.bottom,
  }

  const targetElements = {
    leftTop: true,
    leftBottom: true,
    rightTop: true,
    rightBottom: true,
  }

  let isTargetRectValid = false

  while (!isTargetRectValid) {
    const targetElementsRect = {} as Record<keyof typeof targetElements, DOMRect>

    for (const position of Object.keys(targetElements) as Array<keyof typeof targetElements>) {
      const el = (() => {
        switch (position) {
          case 'leftTop':
            return document.elementFromPoint(targetRect.left + 1, targetRect.top + 1)
          case 'leftBottom':
            return document.elementFromPoint(targetRect.left + 1, targetRect.bottom - 1)
          case 'rightTop':
            return document.elementFromPoint(targetRect.right - 1, targetRect.top + 1)
          case 'rightBottom':
            return document.elementFromPoint(targetRect.right - 1, targetRect.bottom - 1)
        }
      })()

      if (el) {
        if (target.contains(el) || el.contains(target)) {
          delete targetElements[position]
        } else {
          targetElementsRect[position] = el.getBoundingClientRect()
        }
      } else {
        delete targetElements[position]
      }
    }

    isTargetRectValid = true
    if (targetElementsRect.leftTop && targetElementsRect.leftBottom) {
      const left = Math.ceil(Math.min(targetElementsRect.leftTop.right, targetElementsRect.leftBottom.right) + 1)
      if (left > targetRect.left && left <= targetRectOriginal.right) {
        targetRect.left = left
        isTargetRectValid = false
      }
    }
    if (targetElementsRect.leftTop && targetElementsRect.rightTop) {
      const top = Math.ceil(Math.min(targetElementsRect.leftTop.bottom, targetElementsRect.rightTop.bottom) + 1)
      if (top > targetRect.top && top <= targetRectOriginal.bottom) {
        targetRect.top = top
        isTargetRectValid = false
      }
    }
    if (targetElementsRect.rightTop && targetElementsRect.rightBottom) {
      const right = Math.floor(Math.max(targetElementsRect.rightTop.left, targetElementsRect.rightBottom.left) - 1)
      if (right < targetRect.right && right >= targetRectOriginal.left) {
        targetRect.right = right
        isTargetRectValid = false
      }
    }
    if (targetElementsRect.leftBottom && targetElementsRect.rightBottom) {
      const bottom = Math.floor(Math.max(targetElementsRect.leftBottom.top, targetElementsRect.rightBottom.top) - 1)
      if (bottom < targetRect.bottom && bottom >= targetRectOriginal.top) {
        targetRect.bottom = Math.floor(Math.max(targetElementsRect.leftBottom.top, targetElementsRect.rightBottom.top) - 1)
        isTargetRectValid = false
      }
    }
  }
}

const getTooltipData = () => {
  const tooltip = tooltipRef.value
  if (tooltip) {
    const tooltipClientRect = tooltip.getBoundingClientRect(),
      tooltipLeft = Math.floor(targetRect.left - (tooltipClientRect.width - targetRect.right + targetRect.left) / 2),
      // tooltipLeft = Math.floor(pointer.x - tooltipClientRect.width / 2),
      tooltipRight = tooltipLeft + tooltipClientRect.width,
      tData: Record<string, string | number> = {}

    let tooltipOffsetX = 0
    if (tooltipLeft < 0) {
      tooltipOffsetX = tooltipLeft
    } else if (tooltipRight > docEl.clientWidth) {
      tooltipOffsetX = Math.ceil(tooltipRight - docEl.clientWidth)
    }
    tData.left = tooltipLeft - tooltipOffsetX + window.scrollX + 'px'

    // tData.arrowMarginLeft = '-0.25rem'
    if (tooltipOffsetX) {
      tData.arrowTransform = `${tooltipOffsetX}px`
    }
    // if (tooltipOffsetX) {
    //   tData.arrowTransform = `translateX(${tooltipOffsetX}px) rotate(45deg)`
    // if (tooltipOffsetX > 0) {
    //   tData.arrowTransform += ' rotateY(180deg)'
    //   tData.arrowMarginLeft = '-0.75rem'
    // }
    // }

    if (
      tooltipClientRect.height <= targetRect.top ||
      (targetRect.bottom + tooltipClientRect.height > docEl.clientHeight && targetRect.top + window.scrollY >= tooltipClientRect.height)
    ) {
      tData.top = Math.ceil(targetRect.top + window.scrollY - tooltipClientRect.height) - 8 + 'px'
      tData.transform = `translateY(8px)`
    } else {
      tData.top = targetRect.bottom + window.scrollY + 8 + 'px'
      tData.transform = `translateY(-8px)`
      tData.arrowTop = 1
    }

    return tData
  }
}

const isPointerInTargetRect = () => {
  return pointer.x >= targetRect.left && pointer.x <= targetRect.right && pointer.y >= targetRect.top && pointer.y <= targetRect.bottom
}

const hideTooltip = () => {
  console.log('hideTooltip')
  tooltipData.value = removeListeners() as undefined

  emit('hide')
}

const updateTooltip = (event?: Event) => {
  if (tooltipData.value) {
    if (event) {
      setTargetRect()
    }

    if (isPointerInTargetRect()) {
      tooltipData.value = getTooltipData()
    } else {
      hideTooltip()
    }
  }
}

const removeListeners = () => {
  titleVisible.value = true
  onClick.value = null
  tooltipTimerID = clearTimeout(tooltipTimerID) as undefined

  window.removeEventListener('scroll', updateTooltip, true)
  window.removeEventListener('resize', updateTooltip)

  updateTooltipHandler?.stop()
}

const setListeners = () => {
  titleVisible.value = false
  if (hideByClick) {
    onClick.value = hideTooltip
  }

  window.addEventListener('scroll', updateTooltip, true)
  window.addEventListener('resize', updateTooltip)

  updateTooltipHandler = watch(pointer, () => {
    updateTooltip()
  })
}

const onPointerOver = () => {
  titleVisible.value = false
  if (tooltipTimerID === undefined && !tooltipData.value) {
    if (truncate) {
      const target = ((targetRef.value! as any).$el ?? targetRef.value) as HTMLElement

      let show = target.scrollWidth > target.clientWidth

      if (!show) {
        for (const childEl of target.children) {
          if (childEl.scrollWidth > childEl.clientWidth) {
            show = true
            break
          }
        }

        if (!show) {
          return
        }
      }
    }

    let active = true

    tooltipTimerID = setTimeout(() => {
      if (active) {
        setTargetRect()
      }

      if (isPointerInTargetRect()) {
        tooltipData.value = {
          left: 0,
          top: 0,
          opacity: 0,
          visibility: 'hidden',
          // transform: 'skewY(30deg)',
        }

        nextTick(() => {
          removeListeners()
          if (active) {
            tooltipData.value = getTooltipData()

            if (tooltipData.value) {
              setListeners()

              emit('show')
            }
          }
        })
      } else {
        removeListeners()
      }
    }, 500)

    if (hideByClick) {
      onClick.value = () => {
        active = false
      }
    }
  }
}

onUnmounted(() => {
  removeListeners()
})
</script>
