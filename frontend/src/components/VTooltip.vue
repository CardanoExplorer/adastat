<template>
  <component
    :is="tag"
    :class="{ 'cursor-help': cursorHelp && tooltipData }"
    :title="titleVisible ? title : null"
    :style="{ opacity: tooltipData ? '30%' : null }"
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
        <div
          class="flex max-w-72 items-center overflow-hidden rounded-md px-2.5 py-1.5 text-xs wrap-break-word hyphens-auto *:whitespace-normal"
          :class="bg">
          <div class="min-w-0 flex-1">
            <slot name="tooltip">
              <template v-if="title">{{ title }}</template>
              <slot v-else />
            </slot>
          </div>
          <CopyToClipboard v-if="copy" :text="copy" class="ml-2 size-5 shrink-0 border-l pl-2" />
        </div>
        <div
          class="absolute left-1/2 -ml-1.5 h-2 w-3 translate-y-0 mask-tooltip-triangle"
          :class="[tooltipData.arrowTop ? 'top-0 rotate-180' : 'bottom-0', bg]"
          :style="{ '--tw-translate-x': tooltipData.arrowTransform ?? 0 }"></div>
      </div>
    </Teleport>
  </component>
</template>

<script setup lang="ts">
import {
  type CSSProperties,
  type Component,
  type StyleValue,
  inject,
  nextTick,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'

import { pointerSymbol, touchSymbol } from '@/utils/injectionSymbols'

import CopyToClipboard from './CopyToClipboard.vue'

let tooltipTimerID: number | undefined,
  longPressTimerID: number | undefined,
  updateTooltipHandler: ReturnType<typeof watch> | undefined

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
  copy?: string
}>()

const emit = defineEmits(['show', 'hide'])

const targetRef = useTemplateRef('target'),
  tooltipRef = useTemplateRef('tooltip'),
  tooltipData = ref<Record<string, string | number>>(),
  titleVisible = ref(true),
  pointer = inject(pointerSymbol)!,
  touch = inject(touchSymbol)!,
  docEl = document.documentElement,
  onClick = ref()

const targetRect = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

const tooltipRect = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

const leftTriangle = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
}

const rightTriangle = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
}

const getTarget = () => ((targetRef.value! as any).$el ?? targetRef.value) as HTMLElement

const setTargetRect = () => {
  const target = getTarget(),
    targetClientRect = target.getBoundingClientRect(),
    targetRectOriginal = {
      left: Math.floor(Math.max(targetClientRect.left, 0)),
      top: Math.floor(Math.max(targetClientRect.top, 0)),
      right: Math.ceil(Math.min(targetClientRect.right, docEl.clientWidth)),
      bottom: Math.ceil(Math.min(targetClientRect.bottom, docEl.clientHeight)),
    }

  targetRect.left = targetRectOriginal.left
  targetRect.top = targetRectOriginal.top
  targetRect.right = targetRectOriginal.right
  targetRect.bottom = targetRectOriginal.bottom

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
        targetRect.bottom = Math.floor(
          Math.max(targetElementsRect.leftBottom.top, targetElementsRect.rightBottom.top) - 1
        )
        isTargetRectValid = false
      }
    }
  }
}

const getTriangleHeight = (cond: boolean, arrowTop: any) => {
  if (cond) {
    return arrowTop ? tooltipRect.bottom - tooltipRect.top : tooltipRect.top - tooltipRect.bottom
  }

  return arrowTop ? targetRect.top - targetRect.bottom : targetRect.bottom - targetRect.top
}

const getTooltipData = () => {
  const tooltip = tooltipRef.value
  if (tooltip) {
    const tooltipClientRect = tooltip.getBoundingClientRect(),
      tooltipLeft = Math.floor(targetRect.left - (tooltipClientRect.width - targetRect.right + targetRect.left) / 2),
      tooltipRight = tooltipLeft + tooltipClientRect.width,
      tData: Record<string, string | number> = {}

    let tooltipOffsetX = 0
    if (tooltipLeft < 0) {
      tooltipOffsetX = tooltipLeft
    } else if (tooltipRight > docEl.clientWidth) {
      tooltipOffsetX = Math.ceil(tooltipRight - docEl.clientWidth)
    }
    tData.left = tooltipLeft - tooltipOffsetX + window.scrollX + 'px'

    if (tooltipOffsetX) {
      tData.arrowTransform = `${tooltipOffsetX}px`
    }

    const translateY =
      tooltipClientRect.height <= targetRect.top ||
      (targetRect.bottom + tooltipClientRect.height > docEl.clientHeight &&
        targetRect.top + window.scrollY >= tooltipClientRect.height)
        ? -8
        : 8

    tData.transform = `translateY(${translateY}px)`

    if (translateY > 0) {
      tData.top = targetRect.bottom + window.scrollY - translateY + 'px'
      tData.arrowTop = 1

      tooltipRect.top = targetRect.bottom
    } else {
      tData.top = Math.ceil(targetRect.top + window.scrollY - tooltipClientRect.height) - translateY + 'px'

      tooltipRect.top = targetRect.top - tooltipClientRect.height
    }

    tooltipRect.bottom = tooltipRect.top + tooltipClientRect.height
    tooltipRect.left = tooltipLeft - tooltipOffsetX
    tooltipRect.right = tooltipRight - tooltipOffsetX

    leftTriangle.x = Math.max(tooltipRect.left, targetRect.left)
    leftTriangle.y = tData.arrowTop ? tooltipRect.top : targetRect.top
    leftTriangle.w = Math.abs(tooltipRect.left - targetRect.left)
    leftTriangle.h = getTriangleHeight(tooltipRect.left > targetRect.left, tData.arrowTop)

    rightTriangle.x = Math.min(tooltipRect.right, targetRect.right)
    rightTriangle.y = leftTriangle.y
    rightTriangle.w = Math.abs(tooltipRect.right - targetRect.right)
    rightTriangle.h = getTriangleHeight(targetRect.right > tooltipRect.right, tData.arrowTop)

    return tData
  }
}

const isPointerInTargetRect = () =>
  pointer.x >= targetRect.left &&
  pointer.x <= targetRect.right &&
  pointer.y >= targetRect.top &&
  pointer.y <= targetRect.bottom

const isPointerInTooltipRect = () =>
  pointer.x >= tooltipRect.left &&
  pointer.x <= tooltipRect.right &&
  pointer.y >= tooltipRect.top &&
  pointer.y <= tooltipRect.bottom

const isPointerInLeftTriangle = () => {
  const leftX = leftTriangle.w ? (leftTriangle.x - pointer.x) / leftTriangle.w : 0

  if (leftX >= 0) {
    const leftY = leftTriangle.h ? (pointer.y - leftTriangle.y) / leftTriangle.h : 0

    return leftX >= 0 && leftY >= 0 && leftX + leftY <= 1
  }
}

const isPointerInRightTriangle = () => {
  const leftX = rightTriangle.w ? (pointer.x - rightTriangle.x) / rightTriangle.w : 0

  if (leftX >= 0) {
    const leftY = rightTriangle.h ? (pointer.y - rightTriangle.y) / rightTriangle.h : 0

    return leftX >= 0 && leftY >= 0 && leftX + leftY <= 1
  }
}

const isPointerInTarget = () => {
  return isPointerInTargetRect() || isPointerInTooltipRect() || isPointerInLeftTriangle() || isPointerInRightTriangle()
}

const hideTooltip = () => {
  tooltipData.value = removeListeners() as undefined

  emit('hide')
}

const updateTooltip = (event?: Event) => {
  if (tooltipData.value) {
    if (event) {
      setTargetRect()
    }

    if (isPointerInTarget()) {
      if (event) {
        tooltipData.value = getTooltipData()
      }
    } else {
      hideTooltip()
    }
  }
}

const removeListeners = () => {
  titleVisible.value = true
  onClick.value = null
  tooltipTimerID = clearTimeout(tooltipTimerID) as undefined
  longPressTimerID = clearTimeout(longPressTimerID) as undefined

  window.removeEventListener('scroll', updateTooltip, true)
  window.removeEventListener('resize', updateTooltip)

  document.removeEventListener('pointerdown', onTouchOutsideClick)

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

const onPointerOver = (e: PointerEvent) => {
  if (e.pointerType !== 'touch') {
    titleVisible.value = false
    if (tooltipTimerID === undefined && !tooltipData.value) {
      if (truncate) {
        const target = getTarget()

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

        if (isPointerInTarget()) {
          tooltipData.value = {
            left: 0,
            top: 0,
            opacity: 0,
            visibility: 'hidden',
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
      }, 200)

      if (hideByClick) {
        onClick.value = () => {
          active = false
        }
      }
    }
  }
}

const onTouchOutsideClick = (e: PointerEvent) => {
  if (e.pointerType === 'touch') {
    const target = getTarget()
    if (!target.contains(e.target as Node) && !tooltipRef.value?.contains(e.target as Node)) {
      hideTooltip()
    }
  }
}

watch(
  () => touch.isDown,
  (isDown) => {
    if (touch.pointerType === 'touch') {
      const target = getTarget()

      if (isDown && target.contains(touch.target)) {
        longPressTimerID = setTimeout(() => {
          setTargetRect()

          tooltipData.value = {
            left: 0,
            top: 0,
            opacity: 0,
            visibility: 'hidden',
          }

          nextTick(() => {
            tooltipData.value = getTooltipData()

            if (tooltipData.value) {
              document.addEventListener('pointerdown', onTouchOutsideClick)

              emit('show')
            }
          })
        }, 200)
      } else {
        clearTimeout(longPressTimerID)
      }
    }
  }
)

onUnmounted(() => {
  removeListeners()
})
</script>
