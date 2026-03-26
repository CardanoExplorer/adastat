<template>
  <div class="my-6 flex flex-wrap justify-center gap-3">
    <ChartJS class="grid h-40 w-40 place-items-center" :config="chartConfig">
      <div class="grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-light dark:bg-gray-800">
        <div class="mt-1">
          {{ t('target') }}
          <div class="mt-0.5 text-xs font-medium text-up-500 dark:text-up-400">{{ formatPercent(threshold) }}</div>
        </div>
      </div>
      <div class="pointer-events-none absolute inset-0" :style="{ transform: `rotate(${360 * threshold}deg)` }">
        <svg viewBox="0 0 8 60" fill="none" stroke="currentColor" class="absolute -top-1 left-19 h-15 w-2 stroke-3 text-white dark:text-gray-900">
          <path d="M4 4q3 4 0 8t0 8 0 8 0 8 0 8" />
          <!-- <path d="M2 0 6 8 2 16l4 8-4 8 4 8-4 8" /> -->
          <!-- <path d="m5 0c0 3-3 3-3 6s3 3 3 6-3 3-3 6 3 3 3 6-3 3-3 6 3 3 3 6-3 3-3 6 3 3 3 6" /> -->
          <path
            d="M1 51h6l-3-4z"
            class="fill-current stroke-1"
            :class="
              posRatio >= threshold
                ? 'text-up-600 dark:text-up-400'
                : (negStake as number) / (liveStake as number) >= 1 - threshold
                  ? 'text-down-600 dark:text-down-400'
                  : 'text-sky-50 dark:text-gray-800'
            " />
        </svg>
      </div>
    </ChartJS>
    <div class="flex w-max flex-col items-stretch justify-center gap-3">
      <DataGridSection class="relative rounded-lg border border-up-600 p-2 text-xs dark:border-up-400">
        <DataGridSectionRow hide-dots :key="id" v-for="{ id, stake } of pos">
          <template #title>
            <div class="opacity-70">{{ t(id) }}</div>
          </template>
          <TooltipAmount :value="stake" />
        </DataGridSectionRow>
        <div class="absolute -top-3 -left-3 flex size-7 bg-white p-1 dark:bg-gray-900">
          <div
            class="mt-auto ml-auto rounded-full border"
            :class="
              posRatio >= threshold
                ? 'size-5 bg-up-600 stroke-2 text-white opacity-85 dark:bg-up-400 dark:text-gray-900'
                : 'size-4.5 text-up-600 dark:text-up-400'
            ">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M6 11l3.5 3L14 6" />
            </svg>
          </div>
        </div>
        <div class="absolute -top-3 right-3 bg-white p-1 font-sans text-s font-normal text-up-500 dark:bg-gray-900 dark:text-up-400">
          {{ formatPercent(posRatio, 2) }}
        </div>
      </DataGridSection>
      <DataGridSection class="relative rounded-lg border border-down-600 p-2 pt-0 pb-3.5 text-xs dark:border-down-400">
        <DataGridSectionRow hide-dots :key="id" v-for="{ id, stake } of neg">
          <template #title>
            <div class="opacity-70">
              {{ t(id) }}
            </div>
          </template>
          <TooltipAmount :value="stake" />
        </DataGridSectionRow>
        <div class="absolute -right-3 -bottom-3 size-7 bg-white p-1 dark:bg-gray-900">
          <div
            class="rounded-full border"
            :class="
              (negStake as number) / (liveStake as number) >= 1 - threshold
                ? 'size-5 bg-down-600 stroke-2 text-white opacity-85 dark:bg-down-400 dark:text-gray-900'
                : 'size-4.5 text-down-600 dark:text-down-400'
            ">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M6.5 6.5l7 7m-7 0 7-7" />
            </svg>
          </div>
        </div>
        <div class="absolute -bottom-3 left-3 bg-white p-1 font-sans text-s font-normal text-down-500 dark:bg-gray-900 dark:text-down-400">
          {{ formatPercent(1 - posRatio, 2) }}
        </div>
      </DataGridSection>
    </div>
  </div>

  <div class="flex text-xs">
    <div>
      <span class="text-3xs opacity-50">{{ t('stake.live') }}</span> <TooltipAmount :value="liveStake" class="inline" />
    </div>
    <VTooltip class="ml-auto">
      <span class="text-3xs opacity-50">{{ t('excluded') }}</span> {{ formatToken(formatValue(excludedStake)) }}
      <template #tooltip>
        <div :key="id" v-for="{ id, stake } of exc" class="flex items-end justify-end gap-1">
          <div class="mr-auto text-3xs opacity-80">{{ t(id) }}:</div>
          <FormattedAmount :value="stake" />
        </div>
      </template>
    </VTooltip>
  </div>
  <div class="overflow-hidden rounded-md bg-sky-50 dark:bg-gray-800">
    <div
      class="h-4 bg-linear-to-br from-violet-300 to-indigo-400 opacity-70 md:h-5 dark:from-violet-500 dark:to-indigo-500"
      :style="{ width: Math.round(((liveStake as number) / (totalStake as number)) * 100) + '%' }"></div>
  </div>
  <div class="text-center">
    <span class="text-3xs opacity-50">{{ t('total') }}</span> <TooltipAmount :value="totalStake" class="inline" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import { t } from '@/i18n'
import { addAlpha, getColorValue } from '@/utils/chartjs'
import { formatPercent, formatToken, formatValue } from '@/utils/formatter'
import { darkMode, trendColors } from '@/utils/settings'

import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VTooltip from '@/components/VTooltip.vue'

type VotingData = {
  id: string
  stake: number
}

const { pos, neg, liveStake } = defineProps<{
  pos: VotingData[]
  neg: VotingData[]
  exc: VotingData[]
  threshold: number
  liveStake: number | `${number}`
  posStake: number | `${number}`
  negStake: number | `${number}`
  excludedStake: number | `${number}`
  totalStake: number | `${number}`
  posRatio: number
}>()

const chartConfig = ref<ChartConfigurationCustomTypesPerDataset>()

// const chartRef = useTemplateRef('chart')

// const highlightSegment = (index: number, show = true) => {
// const chart = chartRef.value?.chartInstance,
//   activeElement = show ? [{ datasetIndex: 0, index }] : []

// if (chart) {
//   chart.setActiveElements(activeElement)
//   chart.tooltip?.setActiveElements(activeElement, { x: 0, y: 0 })
//   chart.update()
// }
// }

const initChartData = () => {
  const totalStake = Number(liveStake),
    minVisibleStake = totalStake / 100, // 1 percent
    data: number[] = [],
    visualData: number[] = [],
    labels: string[] = [],
    colors: string[] = [],
    // borderColors: string[] = [],
    hoverColors: string[] = [],
    posColor = getColorValue('--trend-up-400'),
    negColor = getColorValue('--trend-down-400'),
    notVotedColor = getColorValue(darkMode.value ? '--color-gray-400' : '--color-sky-300')

  for (const { id, stake } of pos) {
    if (stake > 0) {
      colors.push(addAlpha(posColor, id == 'yes' ? 0.9 : 0.6))
      hoverColors.push(id == 'yes' ? posColor : addAlpha(posColor, 0.7))
      // borderColors.push(posColor)

      data.push(stake)
      visualData.push(stake < minVisibleStake ? minVisibleStake : stake)
      labels.push(id)
    }
  }

  for (let i = neg.length - 1; i >= 0; i--) {
    const { id, stake } = neg[i]!

    if (stake > 0) {
      if (id == 'not_voted') {
        colors.push(addAlpha(notVotedColor, 0.1))
        hoverColors.push(addAlpha(notVotedColor, 0.15))
      } else {
        colors.push(addAlpha(negColor, id == 'no' ? 0.9 : 0.6))
        hoverColors.push(id == 'no' ? negColor : addAlpha(negColor, 0.7))
      }
      // borderColors.push(addAlpha(negColor, 0.5))

      data.push(stake)
      visualData.push(stake < minVisibleStake ? minVisibleStake : stake)
      labels.push(id)
    }
  }

  // const alphaColors = colors.map((color) => addAlpha(color, 0.8))

  // console.log(data)

  chartConfig.value = {
    data: {
      labels: labels,
      datasets: [
        {
          type: 'doughnut',
          // tooltipColor: colors,
          data: visualData,
          // borderJoinStyle: 'round',
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          hoverBorderColor: hoverColors,
          // borderColor: borderColors,
          // hoverOffset: 1,
          // offset: 5,
          spacing: data.length > 1 ? 2 : 0,
          // borderAlign: 'inner',
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverOffset: 1,
          borderRadius: data.length > 1 ? 4 : 0,
          // borderRadius: data.length > 1 ? (ctx) => (ctx.chart.data.labels![ctx.dataIndex] == 'not_voted' ? 0 : 4) : 0,
          // hoverBorderRadius: 0,
          // borderColor: () => (darkMode.value ? getColorValue('--color-gray-900') : '#fff'),
        },
      ],
    },
    options: {
      // events: [],
      animation: false,
      // layout: { padding: 2 },
      interaction: {
        mode: 'nearest',
        intersect: true,
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => formatToken(formatValue(data[tooltipItems[0]!.dataIndex]!)),
            beforeLabel: (tooltipItem) => t(tooltipItem.label),
            label: (tooltipItem) => formatPercent(data[tooltipItem.dataIndex]! / totalStake, 2),
          },
        },
      },
    },
  }
}
// return `${t(item.label)}: ${formatPercent(stake / totalStake, 2)}`

watch([darkMode, trendColors], initChartData, { immediate: true })
</script>
