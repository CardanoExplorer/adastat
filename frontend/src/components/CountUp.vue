<template>
  <div>
    <div v-if="stableWidth" class="inline-grid">
      <div class="absolute col-span-full row-span-full" ref="countUpRef"></div>
      <div class="invisible col-span-full row-span-full">{{ stableValue }}</div>
    </div>
    <div v-else ref="countUpRef" class="inline-block"></div>
  </div>
</template>

<script setup lang="ts">
import { CountUp, type CountUpOptions } from 'countup.js'
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

const {
  value,
  appear,
  duration = 1,
  decimalPlaces = 0,
  easing = true,
  stableWidth,
  formatter,
  options,
} = defineProps<{
  value: number
  appear?: boolean
  duration?: number
  decimalPlaces?: number
  easing?: boolean
  stableWidth?: boolean
  formatter?: (n: number) => string
  options?: Omit<CountUpOptions, 'duration' | 'decimalPlaces' | 'formattingFn' | 'useEasing'>
}>()

const countUpRef = useTemplateRef<HTMLElement>('countUpRef'),
  stableValue = ref<string>()

let countUp: CountUp

watch(
  () => value,
  () => {
    if (stableWidth) {
      stableValue.value = formatter ? formatter(value) : (value as any as string)
    }
    if (countUp) {
      countUp.update(value)
    }
  },
  {
    immediate: true,
  }
)

onMounted(() => {
  countUp = new CountUp(countUpRef.value!, value, {
    startVal: appear ? 0 : value,
    duration: duration,
    decimalPlaces: decimalPlaces,
    formattingFn: formatter,
    useEasing: easing,
    ...options,
  })

  countUp[appear && value ? 'start' : 'reset']()
})

onUnmounted(() => {
  countUp.options!.startVal = value
  countUp.reset()
})
</script>
