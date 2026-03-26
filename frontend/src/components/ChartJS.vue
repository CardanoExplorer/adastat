<template>
  <div class="relative">
    <Transition enter-from-class="opacity-0" enter-active-class="transition duration-1000" appear mode="out-in" :duration="{ enter: 1000, leave: 0 }">
      <canvas ref="canvasRef" class="absolute" style="width: 100%; height: 100%"> </canvas>
    </Transition>
    <slot />
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div
        v-if="showTooltip"
        class="pointer-events-none absolute z-50 min-w-30 rounded-lg bg-fuchsia-100/50 p-2 pb-0.5 text-xs font-medium whitespace-nowrap inset-shadow-glass shadow-sky-50 inset-shadow-white backdrop-filter-[url(#gaussian-blur)_saturate(1.2)] transition-all duration-500 dark:bg-slate-900/70 dark:shadow-gray-900 dark:inset-shadow-gray-800"
        :style="tooltipStyle">
        <!-- <div
        v-if="showTooltip"
        class="pointer-events-none absolute z-50 min-w-30 rounded-md border border-indigo-100 bg-sky-50/50 p-2 pb-0.5 text-xs font-medium whitespace-nowrap shadow shadow-slate-200 backdrop-blur-sm transition-all duration-500 dark:border-gray-800 dark:bg-gray-800/50 dark:shadow-gray-700"
        :style="tooltipStyle"> -->
        <div class="mb-1.5 flex gap-1.5" :key="color" v-for="{ color, before, lines } of tooltipBody">
          <div class="mt-px h-3.5 w-3.5 rounded-full" :style="{ background: color }"></div>
          <div v-if="before.length" class="mr-2">
            <div :key="row" v-for="row of before">
              {{ row }}
            </div>
          </div>
          <div class="ml-auto">
            <div :key="row" v-for="row of lines">
              {{ row }}
            </div>
          </div>
        </div>
        <template v-if="tooltipTitle!.length">
          <div class="mt-2 h-px bg-linear-to-r via-slate-200 dark:via-gray-700"></div>
          <div class="mt-1.5 mb-1 text-center" :key="title" v-for="title of tooltipTitle">
            {{ title }}
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfigurationCustomTypesPerDataset,
  // type ChartType,
  type ChartTypeRegistry,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  // type Scriptable,
  // type ScriptableContext,
  Tooltip,
} from 'chart.js'
import { type StyleValue, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { getColorValue } from '@/utils/chartjs'
import { darkMode } from '@/utils/settings'

// ;(Tooltip.positioners as any).cursor = function (chartElements: any, coordinates: any) {
//   return coordinates
// }

// Then in options:

// options: {
//   tooltips: {
//     position: 'cursor',
//   }
// }

declare module 'chart.js' {
  interface ChartTypeRegistry {
    shadowLine: Omit<ChartTypeRegistry['line'], 'datasetOptions'> & {
      datasetOptions: ChartTypeRegistry['line']['datasetOptions'] & {
        shadowColor?: string
        shadowBlur?: number
        shadowOffsetX?: number
        shadowOffsetY?: number
      }
    }
  }

  // interface FillerControllerDatasetOptions {
  //   tooltipColor?: string
  // }

  // interface ChartDatasetProperties<TType extends ChartType, TData> {
  //   tooltipColor?: string | string[];
  // }

  interface ControllerDatasetOptions {
    tooltipColor?: string | string[]
  }
}

// declare module 'chartjs-chart-treemap' {
//   interface TreemapControllerDatasetOptions<DType> {
//     borderRadius?: number | { top?: number; right?: number; bottom?: number; left?: number }
//   }
// }

class ShadowLineController extends LineController {
  draw() {
    const ctx = this.chart.ctx,
      dataset = this.getDataset() as ChartTypeRegistry['shadowLine']['datasetOptions']

    ctx.shadowColor = dataset.shadowColor || '#000'
    ctx.shadowBlur = dataset.shadowBlur || 10
    ctx.shadowOffsetX = dataset.shadowOffsetX || 0
    ctx.shadowOffsetY = dataset.shadowOffsetY || 0

    super.draw()
  }
}
ShadowLineController.id = 'shadowLine'
ShadowLineController.defaults = LineController.defaults

Chart.register(
  BarController,
  LineController,
  ShadowLineController,
  DoughnutController,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler
)

const isFontLoading = ref(document.fonts.status == 'loaded')

Chart.defaults.responsive = true
// Chart.defaults.aspectRatio = 999
Chart.defaults.maintainAspectRatio = false
// Chart.defaults.resizeDelay = 500
Chart.defaults.layout.padding = 0
// Chart.defaults.devicePixelRatio = 1
Chart.defaults.font.family = 'Montserrat, sans-serif'
// Chart.defaults.font.size = 11
Chart.defaults.color = () => getColorValue(darkMode.value ? '--color-gray-400' : '--color-slate-500')
Chart.defaults.scale.grid.color = () => getColorValue(darkMode.value ? '--color-gray-800' : '--color-slate-100')
Chart.defaults.interaction.mode = 'index'
Chart.defaults.interaction.intersect = false

Chart.defaults.elements.line.borderWidth = 2
Chart.defaults.elements.line.tension = 0.3
Chart.defaults.elements.point.radius = 0
Chart.defaults.elements.point.borderWidth = 2
Chart.defaults.elements.point.hoverRadius = 2
Chart.defaults.elements.point.hoverBorderWidth = 4

// Chart.defaults.plugins.tooltip.boxPadding = 3
// Chart.defaults.plugins.tooltip.boxWidth = 14
// Chart.defaults.plugins.tooltip.boxHeight = 14
// Chart.defaults.plugins.tooltip.backgroundColor = '#141f29d9'
// Chart.defaults.plugins.tooltip.multiKeyBackground = '#141f29d9'
// Chart.defaults.plugins.tooltip.active = true
Chart.defaults.plugins.tooltip.enabled = false
Chart.defaults.plugins.tooltip.callbacks.labelColor = (context) => {
  const dataset = context.dataset,
    index = context.dataIndex

  let specificColor

  if (dataset.tooltipColor) {
    if (Array.isArray(dataset.tooltipColor)) {
      specificColor = dataset.tooltipColor[index]
    } else {
      specificColor = dataset.tooltipColor
    }
  }

  if (!specificColor) {
    const bgColor = dataset.backgroundColor

    if (Array.isArray(bgColor)) {
      specificColor = bgColor[index]
    } else {
      specificColor = bgColor
    }
  }

  return {
    borderColor: '#0000',
    backgroundColor: specificColor || context.element.options.borderColor || context.element.options.backgroundColor,
  }

  // return {
  //   borderColor: '#0000',
  //   backgroundColor: context.dataset.tooltipColor || context.element.options.borderColor, // item.chart.getDatasetMeta(item.datasetIndex).controller.getStyle(item.dataIndex, false).borderColor,
  // }
}

document.fonts.ready.then(() => {
  isFontLoading.value = true
})

export type { ChartConfigurationCustomTypesPerDataset }
</script>

<script lang="ts" setup>
const { config } = defineProps<{
  config?: ChartConfigurationCustomTypesPerDataset
}>()

const chartInstance = shallowRef<Chart>(),
  canvasRef = useTemplateRef('canvasRef'),
  showTooltip = ref(false),
  tooltipTitle = ref<string[]>(),
  tooltipBody = ref<{ color: string; before: string[]; lines: string[] }[]>(),
  tooltipStyle = ref<StyleValue>()

onUnmounted(() => {
  chartInstance.value?.destroy()
})

onMounted(() => {
  watch(
    () => config,
    (newConfig) => {
      if (newConfig) {
        if (newConfig.options?.plugins?.tooltip?.enabled) {
          newConfig.options.plugins.tooltip.enabled = false
          newConfig.options.plugins.tooltip.external = (ctx) => {
            const { chart, tooltip } = ctx

            if (tooltip.opacity) {
              tooltipTitle.value = tooltip.title
              // console.log(tooltip)

              tooltipBody.value = []
              tooltip.body.forEach((body, i) => {
                tooltipBody.value?.push({
                  color: (tooltip.labelColors[i]?.backgroundColor as string) ?? '#0000',
                  before: body.before,
                  lines: body.lines,
                })
              })

              const { offsetLeft, offsetTop, offsetWidth } = chart.canvas,
                translateX = tooltip.caretX > offsetWidth / 2 ? '-100%' : '0'

              tooltipStyle.value = {
                left: offsetLeft + tooltip.caretX + (translateX == '0' ? 10 : -10) + 'px',
                top: offsetTop + tooltip.caretY + 'px',
                transform: `translate(${translateX}, -50%)`,
              }

              showTooltip.value = true
            } else {
              showTooltip.value = false
            }
          }
        }
        if (chartInstance.value) {
          chartInstance.value.data = newConfig.data
          if (newConfig.options) {
            chartInstance.value.options = newConfig.options
          }
          chartInstance.value.update('none')
        } else {
          chartInstance.value = new Chart(canvasRef.value!, newConfig)
        }
      }
    },
    {
      immediate: true,
    }
  )
})

watch(isFontLoading, () => {
  chartInstance.value?.update('none')
})

defineExpose({
  chartInstance,
})
</script>
