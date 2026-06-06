<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-2 @7xl:grid-cols-4">
      <VCard dark>
        <ChartJS class="grid h-40 place-items-center" :config="activeChartConfig">
          <div
            class="z-1 grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-medium dark:bg-gray-800">
            <div>
              <div class="opacity-50">{{ t('total') }}</div>
              <hr class="my-1 opacity-50" />
              <div>{{ formatNumber(data.total) }}</div>
            </div>
          </div>
        </ChartJS>
        <div class="mt-2 text-center text-s">
          {{ t('dreps.active') }}:
          <span class="text-lg font-semibold text-sky-500 dark:text-sky-400">
            {{ formatNumber(data.active_total) }}
          </span>
        </div>
      </VCard>

      <VCard dark>
        <ChartJS class="grid h-40 place-items-center" :config="delegatorChartConfig">
          <div
            class="z-1 grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-medium dark:bg-gray-800">
            <div>
              <div class="opacity-50">{{ t('total') }}</div>
              <hr class="my-1 opacity-50" />
              <div>{{ formatNumber(data.delegator) }}</div>
            </div>
          </div>
          <template #label="{ label }">
            <div class="w-min">{{ t(label.label) }}</div>
          </template>
        </ChartJS>
        <div class="mt-2 text-center text-s">
          {{ t('delegators.active') }}:
          <span class="bg-linear-to-r from-amber-500 to-yellow-500 bg-clip-text text-lg font-semibold text-transparent">
            {{ formatNumber(data.delegator - data.inactive_delegator - data.abstain_delegator) }}
          </span>
        </div>
      </VCard>

      <VCard dark>
        <ChartJS class="grid h-40 place-items-center" :config="stakeChartConfig">
          <div
            class="z-1 grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-medium dark:bg-gray-800">
            <div>
              <div class="opacity-50">{{ t('total') }}</div>
              <hr class="my-1 opacity-50" />
              <div>{{ formatToken(formatValue(data.live_stake)) }}</div>
            </div>
          </div>
          <template #label="{ label }">
            <div class="w-min">{{ t(label.label) }}</div>
          </template>
        </ChartJS>
        <div class="mt-2 text-center text-s">
          {{ t('stake.active') }}:
          <span
            class="bg-linear-to-r from-emerald-500 to-green-500 bg-clip-text text-lg font-semibold text-transparent">
            {{ formatToken(formatValue(data.live_stake - data.abstain_stake - data.inactive_stake)) }}
          </span>
        </div>
      </VCard>

      <VCard dark>
        <ChartJS class="grid h-40 place-items-center" :config="thresholdChartConfig">
          <div
            class="relative z-1 grid size-15 place-items-center rounded-full bg-sky-50 text-center text-2xs font-medium dark:bg-gray-800">
            <div>
              <div class="opacity-50">{{ t('target') }}</div>
              <hr class="my-1 opacity-50" />
              <div class="relative underline decoration-dashed">
                <select
                  v-model="threshold"
                  class="absolute inset-0 w-max cursor-pointer appearance-none bg-white px-3 opacity-0 dark:bg-gray-800">
                  <option :key="v" :value="v" v-for="v of [0.75, 0.67, 0.6, 0.51]">{{ formatPercent(v) }}</option>
                </select>
                {{ formatPercent(threshold) }}
              </div>
            </div>
            <svg
              viewBox="0 0 60 60"
              class="pointer-events-none absolute -top-2 -left-2 size-19 text-indigo-500 transition-transform dark:text-indigo-400"
              :style="{ transform: `rotate(${360 * threshold}deg)` }">
              <path d="M27 5h6l-3-4z" class="fill-current stroke-1" />
            </svg>
          </div>
          <template #label="{ label }">
            <div class="max-w-20 truncate">{{ label.label || t('dreps.other') }}</div>
          </template>
          <template #tooltip-color="{ color: bech32 }">
            <VImg
              v-if="bech32"
              class="h-5 w-5"
              :src="getUrl(`/images/dreps/${bech32}.webp`)"
              imgClass="rounded"
              fallback-class="stroke-[0.5]" />
          </template>
        </ChartJS>
        <div class="mt-2 text-center text-s">
          {{ t('dreps.required') }}:
          <span class="text-lg font-semibold text-indigo-500 dark:text-indigo-400">
            {{ formatNumber(requiredDreps) }}
          </span>
        </div>
      </VCard>
    </div>

    <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('dreps') }}</h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('dreps.desc') }}</div>

    <div class="mb-4 flex justify-between">
      <LayoutSwitcher />
      <BackgroundIcon
        v-if="layout == 'list'"
        class="pointer-events-none fixed top-1/4 right-4 z-10 h-1/2 text-sky-800 opacity-1 sm:right-8 md:right-10 lg:right-[max(5rem,50%-55rem)] dark:text-gray-400" />
      <SortSelector
        v-else
        :sort-key-map="sortKeyMap"
        :sort-point="sortPoint"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        :sort-handling="sortHandling"
        @sort="sortHandler" />
    </div>

    <DataList
      v-if="layout == 'list' || true"
      :cols="cols"
      view="dreps"
      :rows="rows"
      :unique-key="(row) => row.bech32"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #watchlist="{ row: { bech32 } }">
        <WatchlistToggle type="drep" :data="bech32" class="mt-3.5 h-4 w-4" />
      </template>
      <template #drep="{ row: { bech32, base16, given_name, image } }">
        <DataListDRep :name="given_name" :bech32="bech32" :base16="base16" :image="image" />
      </template>
      <template #reg_time="{ row: { tx_hash, tx_time } }">
        <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
      </template>
      <template #active_until="{ row: { last_active_epoch } }">
        <DataListTimeUntil :epoch="last_active_epoch" />
      </template>
      <template #delegator="{ row: { delegator } }">
        {{ formatNumber(delegator) }}
      </template>
      <template #live_stake="{ row: { live_stake } }">
        <TooltipAmount :value="live_stake" />
      </template>
    </DataList>

    <!-- <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />
    </DataGrid> -->

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.total"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import BackgroundIcon from '@/assets/icons/menu_dreps.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { addAlpha, compensateBorderPlugin, conicGradiend, getColorValue, outerLabelsPlugin } from '@/utils/chartjs'
import { formatNumber, formatPercent, formatToken, formatValue } from '@/utils/formatter'
import { type ColList, getTableCols, getUrl } from '@/utils/helper'
import { darkMode, layout } from '@/utils/settings'

import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListTimeUntil from '@/components/DataListTimeUntil.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import SortSelector from '@/components/SortSelector.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VImg from '@/components/VImg.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

// import TextTruncate from '@/components/TextTruncate.vue'

const {
  route,
  errorCode,
  data,
  rows,
  sortPoint,
  sortKey,
  sortDir,
  sortHandler,
  sortHandling,
  limitHandling,
  limitHandler,
  moreHandler,
  moreHandling,
  page,
  pageCount,
} = useViewApi()

const sortKeyMap = route.meta.api!.sortKeyMap!,
  colList: ColList = [
    { id: 'watchlist' },
    { id: 'drep' },
    { id: 'delegator' },
    { id: 'live_stake' },
    { id: 'active_until' },
    { id: 'reg_time' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.dreps',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )

const activeChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  delegatorChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  stakeChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  thresholdChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  requiredDreps = ref(0),
  threshold = ref(0.67)

const initChartData = () => {
  const _data = data.value

  if (_data) {
    const activeDrepColor = getColorValue(darkMode.value ? '--color-sky-400' : '--color-sky-500'),
      inactiveDrepColor = getColorValue(darkMode.value ? '--color-gray-800' : '--color-sky-50')

    activeChartConfig.value = {
      data: {
        labels: ['dreps.active', 'dreps.inactive'],
        datasets: [
          {
            type: 'doughnut',
            data: [_data.active_total, _data.total - _data.active_total],
            backgroundColor: [addAlpha(activeDrepColor, 0.9), addAlpha(inactiveDrepColor, 0.9)],
            hoverBackgroundColor: [activeDrepColor, inactiveDrepColor],
            borderWidth: 1.5,
            borderColor: '#0000',
            hoverBorderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          mode: 'nearest',
          intersect: true,
        },
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              title: (tooltipItems) => formatNumber(tooltipItems[0]!.raw as number),
              beforeLabel: (tooltipItem) => t(tooltipItem.label),
              label: (tooltipItem) => formatPercent((tooltipItem.raw as number) / _data.total),
            },
          },
        },
      },
      plugins: [compensateBorderPlugin],
    }

    const activeDelegatorColor = getColorValue(darkMode.value ? '--color-amber-500' : '--color-yellow-400'),
      noConfidenceDelegatorColor = getColorValue(darkMode.value ? '--color-amber-600' : '--color-amber-400'),
      abstainDelegatorColor = inactiveDrepColor,
      inactiveDelegatorColor = getColorValue(darkMode.value ? '--color-yellow-800' : '--color-yellow-300')

    const abstainStrokeColor = getColorValue(darkMode.value ? '--color-gray-500' : '--color-slate-400')

    delegatorChartConfig.value = {
      data: {
        labels: ['dreps.active', 'always_no_confidence', 'always_abstain', 'dreps.inactive'],
        datasets: [
          {
            type: 'doughnut',
            data: [
              _data.delegator - _data.no_confidence_delegator - _data.abstain_delegator - _data.inactive_delegator,
              _data.no_confidence_delegator,
              _data.abstain_delegator,
              _data.inactive_delegator,
            ],
            backgroundColor: [
              addAlpha(activeDelegatorColor, 0.9),
              addAlpha(noConfidenceDelegatorColor, 0.9),
              addAlpha(abstainDelegatorColor, 0.9),
              addAlpha(inactiveDelegatorColor, 0.9),
            ],
            hoverBackgroundColor: [
              activeDelegatorColor,
              noConfidenceDelegatorColor,
              abstainDelegatorColor,
              inactiveDelegatorColor,
            ],
            borderWidth: 1.5,
            borderColor: '#0000',
            hoverBorderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          mode: 'nearest',
          intersect: true,
        },
        plugins: {
          outerLabels: {
            enabled: true,
            stroke: { 2: abstainStrokeColor },
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (tooltipItems) => formatNumber(tooltipItems[0]!.raw as number),
              beforeLabel: (tooltipItem) => t(tooltipItem.label),
              label: (tooltipItem) => formatPercent((tooltipItem.raw as number) / _data.delegator),
            },
          },
        },
      },
      plugins: [compensateBorderPlugin, outerLabelsPlugin],
    }

    const activeStakeColor = getColorValue(darkMode.value ? '--color-green-500' : '--color-green-400'),
      noConfidenceStakeColor = getColorValue(darkMode.value ? '--color-green-600' : '--color-green-500'),
      abstainStakeColor = inactiveDrepColor,
      inactiveStakeColor = getColorValue(darkMode.value ? '--color-emerald-800' : '--color-emerald-300')

    stakeChartConfig.value = {
      data: {
        labels: ['dreps.active', 'always_no_confidence', 'always_abstain', 'dreps.inactive'],
        datasets: [
          {
            type: 'doughnut',
            data: [
              +_data.live_stake - _data.no_confidence_stake - _data.abstain_stake - _data.inactive_stake,
              +_data.no_confidence_stake,
              +_data.abstain_stake,
              +_data.inactive_stake,
            ],
            backgroundColor: [
              addAlpha(activeStakeColor, 0.9),
              addAlpha(noConfidenceStakeColor, 0.9),
              addAlpha(abstainStakeColor, 0.9),
              addAlpha(inactiveStakeColor, 0.9),
            ],
            hoverBackgroundColor: [activeStakeColor, noConfidenceStakeColor, abstainStakeColor, inactiveStakeColor],
            borderWidth: 1.5,
            borderColor: '#0000',
            hoverBorderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          mode: 'nearest',
          intersect: true,
        },
        plugins: {
          outerLabels: {
            enabled: true,
            stroke: { 2: abstainStrokeColor },
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (tooltipItems) => formatToken(formatValue(tooltipItems[0]!.raw as number)),
              beforeLabel: (tooltipItem) => t(tooltipItem.label),
              label: (tooltipItem) => formatPercent((tooltipItem.raw as number) / _data.live_stake),
            },
          },
        },
      },
      plugins: [compensateBorderPlugin, outerLabelsPlugin],
    }

    const thresholdLabels: string[] = [],
      thresholdData: number[] = [],
      optColor = getColorValue(darkMode.value ? '--color-gray-900' : '--color-white')

    const activeStake = _data.live_stake - _data.abstain_stake - _data.inactive_stake,
      requiredStake = activeStake * threshold.value

    let thresholdStake = 0

    requiredDreps.value = 0

    for (const drep of _data.threshold) {
      if (thresholdStake >= requiredStake) {
        break
      }

      const stake = +drep.stake

      thresholdStake += stake

      thresholdLabels.push(drep.name || drep.bech32)
      thresholdData.push(stake)

      requiredDreps.value++
    }

    if (thresholdStake < activeStake) {
      thresholdLabels.push('')
      thresholdData.push(activeStake - thresholdStake)
    }

    thresholdChartConfig.value = {
      data: {
        labels: thresholdLabels,
        datasets: [
          {
            type: 'doughnut',
            data: thresholdData,
            backgroundColor: conicGradiend([
              { offset: 0, color: getColorValue(darkMode.value ? '--color-indigo-600' : '--color-indigo-500') },
              {
                offset: thresholdStake / activeStake,
                color: getColorValue(darkMode.value ? '--color-indigo-500' : '--color-indigo-400'),
              },
              {
                offset: thresholdStake / activeStake,
                color: getColorValue(darkMode.value ? '--color-indigo-400' : '--color-indigo-300'),
              },
              { offset: 1, color: optColor },
            ]),
            borderWidth: 1,
            borderColor: optColor,
            hoverBorderWidth: 0,
            borderRadius: (item) => {
              if (!item.dataIndex) {
                return {
                  innerStart: 5,
                  innerEnd: 0,
                  outerStart: 5,
                  outerEnd: 0,
                }
              }

              return 0
            },
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          mode: 'nearest',
          intersect: true,
        },
        plugins: {
          outerLabels: {
            enabled: true,
            stroke: () => abstainStrokeColor,
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (tooltipItems) => formatToken(formatValue(tooltipItems[0]!.raw as number)),
              beforeLabel: (tooltipItem) => t(tooltipItem.label || 'dreps.other'),
              label: (tooltipItem) => formatPercent((tooltipItem.raw as number) / activeStake, 2),
              labelColor: (tooltipItem) => {
                return {
                  borderColor: '',
                  backgroundColor:
                    (tooltipItem.dataIndex < thresholdData.length - 1 &&
                      _data.threshold[tooltipItem.dataIndex]?.bech32) ||
                    '',
                }
              },
            },
          },
        },
      },
      plugins: [outerLabelsPlugin],
    }
  }
}

watch([darkMode, data, threshold], initChartData, { immediate: true })
</script>
