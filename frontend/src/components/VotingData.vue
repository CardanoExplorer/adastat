<template>
  <div
    class="absolute top-3 right-2 grid h-5 grid-cols-2 items-center rounded bg-sky-100 text-center text-2xs text-slate-700 md:top-4 md:right-3 lg:right-4 xl:top-5 dark:bg-gray-800 dark:text-gray-300">
    <div
      class="pointer-events-none absolute h-6 w-1/2 rounded bg-sky-200 transition-transform dark:bg-sky-600"
      :class="{ 'translate-x-full': countView }"></div>
    <button
      type="button"
      class="relative z-1 flex h-5 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      :aria-label="t(stakeLabel)"
      :title="t(stakeLabel)"
      :aria-pressed="!countView"
      @click="countView = false">
      ₳
    </button>
    <button
      type="button"
      class="relative z-1 flex h-5 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      :aria-label="t('voters')"
      :title="t('voters')"
      :aria-pressed="countView"
      @click="countView = true">
      <VotersIcon class="size-3.5 stroke-2" />
    </button>
  </div>
  <div class="my-6 flex flex-wrap justify-center gap-3">
    <ChartJS class="grid h-40 w-40 place-items-center" :config="chartConfig">
      <div
        class="grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-light dark:bg-gray-800">
        <div class="mt-1">
          {{ t(countView ? 'voters' : 'target') }}
          <div class="mt-0.5 text-xs font-medium" :class="{ 'text-up-500 dark:text-up-400': !countView }">
            {{ countView ? formatNumber(displayData.live) : formatPercent(threshold) }}
          </div>
        </div>
      </div>
      <div
        v-if="!countView"
        class="pointer-events-none absolute inset-0"
        :style="{ transform: `rotate(${360 * threshold}deg)` }">
        <svg
          viewBox="0 0 8 56"
          fill="none"
          stroke="currentColor"
          class="absolute -top-1.5 left-19 h-14 w-2 fill-current text-white dark:text-gray-900">
          <path d="M4 7q3 4 0 8t0 8 0 8 0 8 0 8" class="stroke-2" />
          <path
            d="m4 5 3-4H1zm0 44 3 4H1z"
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
        <DataGridSectionRow hide-dots :key="id" v-for="{ id, value } of displayData.pos">
          <template #title>
            <div class="opacity-70">{{ t(id as any) }}</div>
          </template>
          <TooltipAmount :value="value" v-bind="amountFormat" />
        </DataGridSectionRow>
        <div class="absolute -top-3 -left-3 flex size-7 bg-white p-1 dark:bg-gray-900">
          <div
            class="mt-auto ml-auto rounded-full border"
            :class="
              !countView && posRatio >= threshold
                ? 'size-5 bg-up-600 stroke-2 text-white opacity-85 dark:bg-up-400 dark:text-gray-900'
                : 'size-4.5 text-up-600 dark:text-up-400'
            ">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M6 11l3.5 3L14 6" />
            </svg>
          </div>
        </div>
        <div
          class="absolute -top-3 right-3 bg-white p-1 font-sans text-s font-normal text-up-500 dark:bg-gray-900 dark:text-up-400">
          {{ formatPercent(displayData.posRatio, 2) }}
        </div>
      </DataGridSection>
      <DataGridSection class="relative rounded-lg border border-down-600 p-2 pt-0 pb-3.5 text-xs dark:border-down-400">
        <DataGridSectionRow hide-dots :key="id" v-for="{ id, value } of displayData.neg">
          <template #title>
            <div class="opacity-70">
              {{ t(id as any) }}
            </div>
          </template>
          <TooltipAmount :value="value" v-bind="amountFormat" />
        </DataGridSectionRow>
        <div class="absolute -right-3 -bottom-3 size-7 bg-white p-1 dark:bg-gray-900">
          <div
            class="rounded-full border"
            :class="
              !countView && (negStake as number) / (liveStake as number) >= 1 - threshold
                ? 'size-5 bg-down-600 stroke-2 text-white opacity-85 dark:bg-down-400 dark:text-gray-900'
                : 'size-4.5 text-down-600 dark:text-down-400'
            ">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M6.5 6.5l7 7m-7 0 7-7" />
            </svg>
          </div>
        </div>
        <div
          class="absolute -bottom-3 left-3 bg-white p-1 font-sans text-s font-normal text-down-500 dark:bg-gray-900 dark:text-down-400">
          {{ formatPercent((displayData.live as number) > 0 ? 1 - displayData.posRatio : 0, 2) }}
        </div>
      </DataGridSection>
    </div>
  </div>

  <div class="flex text-xs">
    <div>
      <span class="mr-1 text-3xs opacity-50">{{ t(countView ? 'voters' : 'stake.live') }}</span>
      <TooltipAmount :value="displayData.live" v-bind="amountFormat" class="inline" />
    </div>
    <VTooltip class="ml-auto">
      <span class="text-3xs opacity-50">{{ t('excluded') }}</span>
      {{ countView ? formatNumber(displayData.excluded) : formatToken(formatValue(displayData.excluded)) }}
      <template #tooltip>
        <div :key="id" v-for="{ id, value } of displayData.exc" class="flex items-end justify-end gap-1">
          <div class="mr-auto text-3xs opacity-80">{{ t(id as any) }}:</div>
          <FormattedAmount :value="value" v-bind="amountFormat" />
        </div>
      </template>
    </VTooltip>
  </div>
  <div class="overflow-hidden rounded-md bg-sky-50 dark:bg-gray-800">
    <div
      class="h-4 bg-linear-to-br from-violet-300 to-indigo-400 opacity-70 md:h-5 dark:from-violet-500 dark:to-indigo-500"
      :style="{
        width:
          ((displayData.total as number) > 0
            ? Math.round(((displayData.live as number) / (displayData.total as number)) * 100)
            : 0) + '%',
      }"></div>
  </div>
  <div class="text-center">
    <span class="mr-1 text-3xs opacity-50">{{ t('total') }}</span>
    <TooltipAmount :value="displayData.total" v-bind="amountFormat" class="inline" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import VotersIcon from '@/assets/icons/holders.svg?component'

import { t } from '@/i18n'
import { addAlpha, compensateBorderPlugin, getColorValue } from '@/utils/chartjs'
import { formatNumber, formatPercent, formatToken, formatValue } from '@/utils/formatter'
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
  count: number
}

const {
  pos,
  neg,
  exc,
  liveStake,
  excludedStake,
  totalStake,
  totalCount,
  posRatio,
  stakeLabel = 'voting_power',
} = defineProps<{
  stakeLabel?: 'stake' | 'voting_power'
  pos: VotingData[]
  neg: VotingData[]
  exc: VotingData[]
  threshold: number
  liveStake: number | `${number}`
  posStake: number | `${number}`
  negStake: number | `${number}`
  excludedStake: number | `${number}`
  totalStake: number | `${number}`
  totalCount: number
  posRatio: number
}>()

const countView = ref(false),
  chartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  amountFormat = computed(() => (countView.value ? { fractionDigits: 0, currency: '', short: false } : {}))

const displayData = computed(() => {
  const field = countView.value ? 'count' : 'stake',
    displayRows = (rows: VotingData[]) => rows.map((row) => ({ id: row.id, value: row[field] })),
    excludedCount = exc.reduce((acc, row) => acc + row.count, 0),
    liveCount = totalCount - excludedCount,
    posCount = pos.reduce((acc, row) => acc + row.count, 0)

  return {
    pos: displayRows(pos),
    neg: displayRows(neg),
    exc: displayRows(exc),
    live: countView.value ? liveCount : liveStake,
    excluded: countView.value ? excludedCount : excludedStake,
    total: countView.value ? totalCount : totalStake,
    posRatio: countView.value ? (liveCount > 0 ? Math.round((posCount / liveCount) * 10_000) / 10_000 : 0) : posRatio,
  }
})

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
  const total = Number(displayData.value.live),
    minVisibleStake = countView.value ? 0 : total / 100, // 1 percent for stake
    data: number[] = [],
    visualData: number[] = [],
    labels: string[] = [],
    colors: string[] = [],
    // borderColors: string[] = [],
    hoverColors: string[] = [],
    posColor = getColorValue('--trend-up-400'),
    negColor = getColorValue('--trend-down-400'),
    notVotedColor = getColorValue(darkMode.value ? '--color-gray-400' : '--color-sky-300')

  for (const { id, value } of displayData.value.pos) {
    if (value > 0) {
      colors.push(addAlpha(posColor, id == 'yes' ? 0.9 : 0.6))
      hoverColors.push(id == 'yes' ? posColor : addAlpha(posColor, 0.7))
      // borderColors.push(posColor)

      data.push(value)
      visualData.push(value < minVisibleStake ? minVisibleStake : value)
      labels.push(id)
    }
  }

  for (let i = displayData.value.neg.length - 1; i >= 0; i--) {
    const { id, value } = displayData.value.neg[i]!

    if (value > 0) {
      if (id == 'not_voted' || id == 'always_abstain') {
        colors.push(addAlpha(notVotedColor, 0.1))
        hoverColors.push(addAlpha(notVotedColor, 0.15))
      } else {
        colors.push(addAlpha(negColor, id == 'no' ? 0.9 : 0.6))
        hoverColors.push(id == 'no' ? negColor : addAlpha(negColor, 0.7))
      }
      // borderColors.push(addAlpha(negColor, 0.5))

      data.push(value)
      visualData.push(value < minVisibleStake ? minVisibleStake : value)
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
          // hoverBorderColor: hoverColors,
          // borderColor: borderColors,
          // hoverOffset: 1,
          // offset: 5,
          // spacing: data.length > 1 ? 2 : 0,
          // borderAlign: 'inner',
          borderWidth: 2,
          borderColor: '#0000',
          hoverBorderWidth: 0,
          hoverOffset: 1,
          borderRadius: data.length > 1 ? 6 : 0,
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
            title: (tooltipItems) => {
              const value = data[tooltipItems[0]!.dataIndex]!

              return countView.value ? formatNumber(value) : formatToken(formatValue(value))
            },
            beforeLabel: (tooltipItem) => t(tooltipItem.label as any),
            label: (tooltipItem) => formatPercent(total ? data[tooltipItem.dataIndex]! / total : 0, 2),
          },
        },
      },
    },
    plugins: [compensateBorderPlugin],
  }
}
// return `${t(item.label)}: ${formatPercent(stake / totalStake, 2)}`

watch([darkMode, trendColors, displayData], initChartData, {
  immediate: true,
})
</script>
