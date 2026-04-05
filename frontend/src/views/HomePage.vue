<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="grid grid-cols-2 grid-rows-3 gap-2 sm:grid-cols-3 sm:grid-rows-3 sm:gap-3 md:grid-cols-4 md:grid-rows-4 md:gap-4 xl:grid-cols-5 xl:grid-rows-3">
      <MainCard
        :class="
          priceChange < 0 ? 'border-b-down-400 dark:border-b-down-500/50' : 'border-b-up-400 dark:border-b-up-400/50'
        "
        title="ada_price"
        :value="formatCurrency(formatPrice(data.exchange_rate))">
        <template #icon>
          <ChartJS class="h-9 w-28 min-w-0" :config="priceChartConfig" />
        </template>
        <template #desc>
          <UpDown :value="formatPercent(Math.abs(priceChange), 2)" :negative="priceChange < 0" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        title="market_cap"
        :value="formatCurrency(formatValue(data.circulating_supply * data.exchange_rate))">
        <template #icon>
          <div class="h-9 text-[2.25rem] leading-9 font-light text-indigo-500 dark:text-indigo-400">
            <span class="text-2xl text-slate-400 dark:text-gray-200">#</span>{{ 10 }}
          </div>
        </template>
        <template #desc>
          <MainCardDesc
            title="volume"
            :value="formatCurrency(formatValue((data.circulating_supply * data.exchange_rate) / 10))"
            bg="bg-indigo-50 dark:bg-indigo-500/10" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-sky-400 dark:border-b-cyan-400/50"
        title="supply.circulating"
        :value="formatToken(formatValue(data.circulating_supply))">
        <template #icon>
          <CircularProgress
            :value="circSupplyPercent"
            class="from-sky-500 to-slate-200 to-0% dark:from-cyan-400 dark:to-gray-600" />
        </template>
        <template #desc>
          <MainCardDesc title="total" :value="fTotalSupply" bg="bg-sky-50 dark:bg-sky-500/10" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        title="stake.live"
        :value="formatToken(formatValue(data.total_stake))">
        <template #icon>
          <CircularProgress
            :value="data.total_stake / data.circulating_supply"
            class="from-amber-500 to-slate-200 to-0% dark:from-yellow-400 dark:to-gray-600" />
        </template>
        <template #desc>
          <UpDown :value="formatPercent(Math.abs(liveStakeChange), 2)" :negative="liveStakeChange < 0" />
        </template>
      </MainCard>

      <MainCard
        class="sm:col-start-3 sm:row-start-1 md:col-start-1 md:row-start-3 xl:col-start-3 xl:row-start-1"
        :class="
          holdersChange < 0 ? 'border-b-down-400 dark:border-b-down-500/50' : 'border-b-up-400 dark:border-b-up-400/50'
        "
        :icon="HoldersIcon"
        :icon-class="[
          'text-slate-400 dark:text-gray-200',
          holdersChange < 0 ? '*:last:text-down-600' : '*:last:text-up-500',
        ]"
        title="holders.ada">
        <template #desc>
          <UpDown :value="formatNumber(Math.abs(holdersChange), 2)" :negative="holdersChange < 0" />
        </template>
        <template #value>
          <CountUp :key="numberFormat" :value="data.holders" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PoolsIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="pools.with_stake">
        <template #desc>
          <MainCardDesc title="total" :value="formatNumber(data.pool)" bg="bg-blue-50 dark:bg-blue-500/10" />
        </template>
        <template #value>
          <CountUp :key="numberFormat" :value="data.pool_with_stake" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <EpochProgress
        class="col-span-2 sm:col-span-3 md:col-span-4 md:col-start-1 md:row-start-4 xl:col-span-3 xl:col-start-1 xl:row-start-3" />

      <VCard
        class="col-span-2 row-span-3 flex h-64 flex-col sm:col-span-3 md:col-span-2 md:col-start-3 md:row-start-1 md:h-auto xl:col-start-4 xl:row-start-1"
        dark>
        <div class="flex flex-wrap items-center gap-2 pb-4 text-lg font-semibold">
          <div class="mr-5">{{ t('transactions.in_past_epoch') }}</div>
          <div class="ml-auto flex items-center text-xs font-normal">
            <div
              class="mr-2 h-3 w-3 rounded-full bg-linear-to-tr from-indigo-400 to-blue-400 dark:from-indigo-700"></div>
            <div>{{ t('transactions') }}</div>
            <div
              class="mr-2 ml-5 h-3 w-3 rounded-full bg-linear-to-tr from-fuchsia-400 to-pink-400 dark:from-fuchsia-700"></div>
            <div>{{ t('amount') }}</div>
          </div>
        </div>
        <ChartJS class="flex-1" :config="epochTxChartConfig" />
      </VCard>
    </div>

    <div class="relative mt-2 h-64 overflow-hidden sm:mt-3 md:mt-4">
      <div class="light:bg-sky/30 absolute bottom-6 left-0 h-18 w-full bg-blue-100 mask-ocean dark:bg-sky-950"></div>

      <div
        class="absolute bottom-18 flex flex-row-reverse items-end"
        ref="shipsWrapper"
        :style="{ paddingLeft: shipsPadding + 'px', left: shipsX + 'px' }">
        <TransitionGroup
          :enter-active-class="appVisible ? 'ease-out transition-transform duration-1000' : undefined"
          enter-from-class="transform-(--ship-enter)">
          <RouterLink
            :key="ship.hash"
            :to="{ name: 'block', params: { id: ship.hash } }"
            :title="t('block') + ' ' + formatNumber(ship.no)"
            :style="{
              marginRight: ship.distance + 'px',
              '--ship-enter': 'translateX(' + ship.offset + 'px)',
              ...(ship.orphan == null
                ? null
                : {
                    position: 'absolute',
                    left: -ship.orphan! + 'px',
                    transform: 'translateY(100%) rotate(180deg)',
                    transformOrigin: 'bottom',
                    transition: 'transform 1s linear',
                  }),
            }"
            v-for="ship of shipList">
            <BlockShip
              class="animate-ship"
              :style="{
                width: ship.width + 'px',
                marginBottom: ship.draft + 'px',
                animationDuration: ship.pitching + 's',
              }"
              :no="ship.no"
              :utilization="ship.utilization"
              :size="ship.size"
              :title="ship.poolTicker"
              :pool-hash="ship.poolHash"
              :pool-bech32="ship.poolBech32"
              :winner="ship.winner" />
          </RouterLink>
        </TransitionGroup>
      </div>

      <div
        class="absolute bottom-0 left-0 mb-4 h-20 w-2/1 animate-ocean bg-linear-to-b from-blue-200 to-sky-100 mask-ocean dark:from-sky-900 dark:to-gray-900">
        <div class="-ml-1 h-4 bg-cyan-500 mask-wave dark:bg-sky-400"></div>
      </div>

      <div class="pointer-events-none absolute bottom-0 h-24 w-full bg-linear-to-b to-sky-50 dark:to-gray-900"></div>
      <div
        class="pointer-events-none absolute bottom-0 left-0 h-64 w-24 bg-linear-to-l to-sky-50 dark:to-gray-900"></div>
      <div
        class="pointer-events-none absolute right-0 bottom-0 h-64 w-24 bg-linear-to-r to-sky-50 dark:to-gray-900"></div>
    </div>

    <template v-if="isWatchlistVisible">
      <div
        class="relative z-1 -mb-10 ml-2 max-w-max rounded bg-white p-0.5 px-1.5 text-s sm:mt-20 sm:-mb-23 sm:ml-auto md:mr-3 md:-mb-24 lg:mr-4 dark:bg-gray-800">
        {{ t('watchlist') }}
      </div>
      <WatchList />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref, useTemplateRef, watch } from 'vue'

import HoldersIcon from '@/assets/icons/holders.svg?component'
import PoolsIcon from '@/assets/icons/pools.svg?component'

import { numberFormat, t } from '@/i18n'
// import state from '@/state'
import { useViewApi } from '@/utils/api'
import { getColorValue, horizontalGradiend, verticalGradiend } from '@/utils/chartjs'
// import type { ApiResponse, ApiResponseSuccess } from '@/utils/api'
import { formatCurrency, formatNumber, formatPercent, formatPrice, formatToken, formatValue } from '@/utils/formatter'
import { type AnyObject, getRatio } from '@/utils/helper'
import { appVisibleSymbol } from '@/utils/injectionSymbols'
import { darkMode, trendColors } from '@/utils/settings'

import WatchList from '@/views/WatchList.vue'

import BlockShip from '@/components/BlockShip.vue'
import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import CircularProgress from '@/components/CircularProgress.vue'
import CountUp from '@/components/CountUp.vue'
// import EChartWrapper from '@/components/EChartWrapper.vue'
import EpochProgress from '@/components/EpochProgress.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
import UpDown from '@/components/UpDown.vue'
import VCard from '@/components/VCard.vue'

// const ChartJS = defineAsyncComponent({
//   loader: () => import('@/components/ChartJS.vue'),
//   loadingComponent: h('div', { class: 'h-full w-full animate-pulse bg-gray-400/10 mask-chart' }),
//   delay: 500,
// })

type Ship = {
  no: number
  slotNo: number
  hash: string
  size: number
  poolTicker: string
  poolHash: string
  poolBech32: string
  winner: boolean
  utilization: number
  draft: number
  distance: number
  offset: number
  width: number
  pitching: number
  orphan: number | null
}

let shipsAnimation!: Animation,
  ships: Record<Ship['no'], Ship> = {},
  latestEpochsData: AnyObject[]

const maxBlockSize = 90112,
  shipsPadding = 40,
  totalSupply = import.meta.env.VITE_TOTAL_SUPPLY,
  fTotalSupply = formatToken(formatValue(totalSupply))

const { errorCode, data } = useViewApi(),
  shipList = reactive<Ship[]>([]),
  shipsRef = useTemplateRef('shipsWrapper'),
  shipsX = ref<number>(0),
  priceChange = ref(0),
  // marketCapChange = ref(0),
  circSupplyPercent = ref(0),
  liveStakeChange = ref(0),
  holdersChange = ref(0),
  // priceOption = ref(),
  priceChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  // marketCapOption = ref(),
  // marketCapChartConfig = ref(),
  // txAmountCountOption = ref(),
  epochTxChartConfig = ref<ChartConfigurationCustomTypesPerDataset>()

const isWatchlistVisible = computed(() => {
  const { pools, accounts, dreps, tokens } = data.value || {}

  return pools.rows.length || accounts.rows.length || dreps.rows.length || tokens.rows.length
})

const appVisible = inject(appVisibleSymbol)!

const initShips = async () => {
  const blockRows = [...(data.value?.blocks.rows ?? [])].reverse()

  if (data && blockRows.length) {
    shipsAnimation?.pause()

    const shipsEl = shipsRef.value!,
      elBoundingRect = shipsEl.getBoundingClientRect(),
      parentElBoundingRect = shipsEl.parentElement!.getBoundingClientRect(),
      maxPossibleWidth = parentElBoundingRect.width // Math.max(window.screen.width, window.screen.height)

    let shipsOffset = elBoundingRect.x - parentElBoundingRect.x,
      shipsEnd = elBoundingRect.width + shipsOffset,
      newShipsWidth = 0,
      orphanWidth = 0

    for (let i = shipList.length - 1; i >= 0; i--) {
      if (shipList[i]!.orphan != null) {
        shipList.splice(i, 1)
      }
    }

    // if (blockRows[5].no % 10 == 0) {
    //   blockRows[5].hash = '00'
    //   blockRows[5].pool_ticker = 'ORP00'
    //   blockRows[5].size = maxBlockSize
    //   blockRows[5].slot_no = blockRows[4].slot_no + 50
    // } else if (blockRows[4].no % 10 == 0) {
    //   blockRows[4].hash = '00'
    //   blockRows[5].hash = '01'
    //   blockRows[4].pool_ticker = 'ORP00'
    //   blockRows[5].pool_ticker = 'ORP01'
    //   blockRows[4].size = maxBlockSize
    //   blockRows[5].size = maxBlockSize
    //   blockRows[4].slot_no = blockRows[3].slot_no + 50
    //   blockRows[5].slot_no = blockRows[3].slot_no + 100
    // }

    if ((!ships[blockRows[0].no] && !ships[blockRows[0].no - 1]) || shipsOffset > maxPossibleWidth) {
      ships = {}
      shipList.length = 0
      shipsOffset = 0
      shipsEnd = 0
      shipsX.value = 0
    }

    for (const blockRow of blockRows) {
      if (!ships[blockRow.no] || ships[blockRow.no]!.hash != blockRow.hash || ships[blockRow.no]!.orphan != null) {
        const utilization = getRatio(blockRow.size, maxBlockSize),
          prevSlotNo = ships[blockRow.no - 1]?.slotNo ?? -1,
          distance = prevSlotNo < 0 ? 0 : (blockRow.slot_no - prevSlotNo - 1) * 4 + 4,
          width = 80 + Math.round(utilization * 40)

        if (ships[blockRow.no] && ships[blockRow.no]!.orphan == null) {
          for (const ship of shipList) {
            if (ship.no >= blockRow.no) {
              orphanWidth += ship.width + ship.distance

              ship.orphan = orphanWidth - shipsPadding
            }
          }
        }

        ships[blockRow.no] = {
          no: blockRow.epoch_no == null ? null : blockRow.no,
          slotNo: blockRow.slot_no,
          hash: blockRow.hash,
          size: blockRow.size,
          poolTicker: blockRow.pool_ticker,
          poolHash: blockRow.pool_hash,
          poolBech32: blockRow.pool_bech32,
          winner: Boolean(ships[blockRow.no]),
          utilization: utilization,
          draft: 4 - Math.round(utilization * 12),
          distance: distance,
          offset: (shipsOffset ? -shipsOffset : 0) - shipsPadding,
          width: width,
          pitching: 6 + Math.round(utilization * 6),
          orphan: null,
        }

        shipList.push(ships[blockRow.no]!)

        newShipsWidth += width + distance
      }
    }

    while (shipList.length > blockRows.length && shipsEnd - shipList[0]!.width > maxPossibleWidth) {
      const removedShip = shipList.shift()!

      delete ships[removedShip.no]

      shipsEnd -= removedShip.width + shipList[0]!.distance

      shipList[0]!.distance = 0
    }

    if (newShipsWidth) {
      shipsAnimation?.cancel()

      if (orphanWidth) {
        for (const ship of shipList) {
          if (ship.orphan != null) {
            ship.orphan -= newShipsWidth
          }
        }
      }

      shipsX.value = shipsOffset - newShipsWidth + orphanWidth

      if (shipsX.value < 0) {
        await new Promise<void>((resolve) => {
          shipsAnimation = shipsEl.animate(
            {
              transform: ['translateX(0px)', 'translateX(' + -shipsX.value + 'px)'],
            },
            {
              easing: 'ease',
              duration: 1000,
            }
          )
          shipsAnimation.onfinish = shipsAnimation.oncancel = () => {
            resolve()
          }
        })

        shipsX.value = 0
      }

      const maxPossibleOffset =
        maxPossibleWidth - shipsX.value - shipList[shipList.length - 1]!.width - shipsPadding * 2

      if (maxPossibleOffset > 0) {
        const stepCount = 8,
          initSpeed = 6, // px per second for the first step
          stepDistance = maxPossibleOffset / stepCount,
          keyframes = []

        let totalDuration = 0,
          accumulatedOffset = 0

        for (let i = stepCount; i > 0; i--) {
          const stepSpeed = (i * initSpeed) / stepCount

          totalDuration += stepDistance / stepSpeed
        }

        for (let i = 0; i <= stepCount; i++) {
          keyframes.push({
            transform: 'translateX(' + stepDistance * i + 'px)',
            offset: Math.min(accumulatedOffset, 1),
          })

          const stepSpeed = ((stepCount - i) * initSpeed) / stepCount,
            stepDuration = stepDistance / stepSpeed

          accumulatedOffset += stepDuration / totalDuration
        }

        shipsAnimation = shipsEl.animate(keyframes, {
          easing: 'linear',
          duration: totalDuration * 1000,
        })
        shipsAnimation.onfinish = () => {
          shipsX.value += maxPossibleOffset
        }
      }
    } else {
      shipsAnimation?.play()
    }
  }
}

const initChartData = () => {
  const epochData = [],
    txCountData = [],
    txAmountData = [],
    priceData = []

  for (const d of latestEpochsData) {
    const txAmount: number = d.tx_amount,
      txCount: number = d.tx

    epochData.push(d.no)

    txAmountData.push(txAmount)

    txCountData.push(txCount)

    priceData.push(d.price)
  }

  priceData.push(data.value?.exchange_rate)

  const calculateNiceTicks = (minVal: number, maxVal: number, stepCount: number) => {
    const range = maxVal - minVal,
      step = range / stepCount

    let stepMagnitude = Math.pow(10, Math.floor(Math.log10(step))),
      niceStepFraction = Math.ceil(step / stepMagnitude),
      niceStep!: number,
      niceMinFraction!: number,
      niceMaxFraction!: number

    while (true) {
      niceStep = stepMagnitude * niceStepFraction
      niceMinFraction = Math.floor(minVal / niceStep)
      niceMaxFraction = Math.ceil(maxVal / niceStep)

      if (niceMaxFraction - niceMinFraction > stepCount) {
        niceStepFraction++
        if (niceStepFraction > 10) {
          niceStepFraction = 1
          stepMagnitude *= 10
        }
      } else {
        break
      }
    }

    niceMinFraction = Math.max(0, niceMinFraction - Math.ceil((stepCount - niceMaxFraction + niceMinFraction) / 2))
    niceMaxFraction = niceMinFraction + stepCount

    const niceMinVal = niceStep * niceMinFraction,
      niceMaxVal = niceStep * niceMaxFraction

    return {
      min: niceMinVal,
      max: niceMaxVal,
      step: niceStep,
    }
  }

  const priceColors = (
      darkMode.value
        ? priceChange.value < 0
          ? ['--trend-down-600', '--trend-down-900', '--color-gray-800']
          : ['--trend-up-500', '--trend-up-900', '--color-gray-800']
        : priceChange.value < 0
          ? ['--trend-down-600', '--trend-down-200', '--color-white']
          : ['--trend-up-500', '--trend-up-200', '--color-white']
    ).map((color) => getColorValue(color)),
    minPrice = Math.min(...priceData),
    maxPrice = Math.max(...priceData)

  const txAmountColor = (
      darkMode.value
        ? ['--color-fuchsia-700', '--color-pink-400', '--color-pink-600']
        : ['--color-fuchsia-400', '--color-pink-400', '--color-pink-300']
    ).map((color) => getColorValue(color)),
    minTxAmount = Math.min(...txAmountData),
    maxTxAmount = Math.max(...txAmountData),
    txAmountTicks = calculateNiceTicks(minTxAmount, maxTxAmount, 4)

  const txCountColor = (
      darkMode.value
        ? ['--color-indigo-700', '--color-blue-400', '--color-blue-600']
        : ['--color-indigo-400', '--color-blue-400', '--color-blue-300']
    ).map((color) => getColorValue(color)),
    minTxCount = Math.min(...txCountData),
    maxTxCount = Math.max(...txCountData),
    txCountTicks = calculateNiceTicks(minTxCount, maxTxCount, 4)

  priceChartConfig.value = {
    data: {
      labels: priceData,
      datasets: [
        {
          type: 'line',
          data: priceData,
          borderColor: priceColors[0],
          borderWidth: 2,
          pointRadius: 0,
          backgroundColor: verticalGradiend([
            { offset: 0, color: priceColors[1]! },
            { offset: 1, color: priceColors[2]! },
          ]),
          fill: 'start',
        },
      ],
    },
    options: {
      events: [],
      animation: false,
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
          min: Math.max(0, minPrice - (maxPrice - minPrice) / 4),
          max: maxPrice * 1.05,
        },
      },
      layout: { padding: 1 },
    },
  }

  epochTxChartConfig.value = {
    data: {
      labels: epochData,
      datasets: [
        {
          type: 'shadowLine',
          data: txCountData,
          tooltipColor: `linear-gradient(90deg, ${txCountColor[0]}, ${txCountColor[1]})`,
          borderColor: horizontalGradiend([
            { offset: 0, color: txCountColor[0]! },
            { offset: 1, color: txCountColor[1]! },
          ]),
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'count',
          shadowColor: txCountColor[2],
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        },
        {
          type: 'shadowLine',
          data: txAmountData,
          tooltipColor: `linear-gradient(90deg, ${txAmountColor[0]}, ${txAmountColor[1]})`,
          borderColor: horizontalGradiend([
            { offset: 0, color: txAmountColor[0]! },
            { offset: 1, color: txAmountColor[1]! },
          ]),
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'amount',
          shadowColor: txAmountColor[2],
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        },
      ],
    },
    options: {
      // events: [],
      // animations: {
      //   tension: {
      //     duration: 1000,
      //     easing: 'linear',
      //     from: 0,
      //     to: 0.5,
      //     loop: true,
      //   },
      // },
      // interaction: {
      //   mode: 'index',
      //   intersect: false,
      // },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => t('epoch') + ' ' + formatNumber(tooltipItems[0]!.label as `${number}`),
            beforeLabel: (tooltipItem) => t(tooltipItem.dataset.yAxisID == 'count' ? 'transactions' : 'amount'),
            label: (item) =>
              item.dataset.yAxisID == 'amount'
                ? formatToken(formatValue(item.raw as number))
                : formatNumber(item.raw as number),
          },
          // usePointStyle: true,
          // caretSize: 0,
          // padding: 10,
          // bodySpacing: 5,
          // intersect: true,
          // position: 'nearest',
          // mode: 'nearest',
          // callbacks: {
          //   title: () => 'title',
          //   label: (item: any) => item.parsed + '%',
          // },
        },
      },
      scales: {
        x: {
          border: {
            display: false,
          },
          grid: {
            drawOnChartArea: false,
            // drawTicks: true,
          },
          offset: true,
          // ticks: {
          //   padding: 20,
          // },
        },
        count: {
          // type: 'linear',
          // display: true,
          position: 'left',
          ticks: {
            callback: (value) => {
              return formatNumber(value as number, 0, true) // + ' '
            },
            // maxTicksLimit: 7,
            stepSize: txCountTicks.step,
            // autoSkip: false,
            // padding: 20,
            // color: txCountColor[1],
            // mirror: true,
            // backdropColor: '#f00',
            // backdropPadding: 5,
            // showLabelBackdrop: true,
          },
          border: {
            display: false,
          },
          grid: {
            // drawOnChartArea: false, // only want the grid lines for one axis to show up
            // drawTicks: false,
            tickColor: '#0000',
            tickLength: 4,
            // color: () => (darkMode.value ? '#fff' : '#000'),
            // borderColor: () => (darkMode.value ? '#fff' : '#000'),
          },
          min: txCountTicks.min,
          max: txCountTicks.max,
        },
        amount: {
          // type: 'linear',
          // display: true,
          position: 'right',
          ticks: {
            callback: (value) => {
              return formatToken(formatValue(value as number))
            },
            // maxTicksLimit: 7,
            stepSize: txAmountTicks.step,
            // autoSkip: false,
            // padding: 20,
            // backdropColor: txAmountColor[1],
            // color: 'white',
            // showLabelBackdrop: (ctx) => ctx.index == 0,
            // color: (ctx) => {
            //   if (ctx.index == ctx.scale.ticks.length - 1) {
            //     return txAmountColor[1]
            //   }
            // },
          },
          border: {
            display: false,
          },
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
            // padding: 20,
            // drawTicks: false,
            tickColor: '#0000',
            tickLength: 4,
            // color: () => (darkMode.value ? '#2b3844' : '#eeeeee'),
            // borderColor: () => (darkMode.value ? '#2b3844' : '#eeeeee'),
          },
          min: txAmountTicks.min,
          max: txAmountTicks.max,
          // min: minTxAmount - (maxTxAmount - minTxAmount) / 4,
          // max: maxTxAmount,
        },
        // x: {
        // display: false,
        // },
        // y: {
        // display: false,
        // min: minPrice - (maxPrice - minPrice) / 4,
        // max: maxPrice,
        // },
      },
      // layout: { padding: 1 },
      // plugins: {
      //   tooltip: {
      //     display: true,
      //   },
      // },
    },
    // plugins: [
    //   {
    // beforeDatasetsDraw: (chart: any) => {
    //   if (!chart.ctx._stroke) {
    //     chart.ctx._stroke = chart.ctx.stroke
    //     chart.ctx.stroke = (...args: any) => {
    //       if (!chart.ctx) return
    //       chart.ctx.save()
    //       chart.ctx.shadowColor = 'rgba(0,0,0,1)'
    //       chart.ctx.shadowBlur = 20
    //       chart.ctx.shadowOffsetX = 0
    //       chart.ctx.shadowOffsetY = 0
    //       chart.ctx._stroke(...args)
    //       chart.ctx.restore()
    //     }
    //   }
    // },
    // beforeDraw: (chart: any) => {
    //   console.log('beforeDatasetsDraw', chart)
    // },
    // beforeDatasetsDraw: (chart: any) => {
    //   console.log('beforeDatasetsDraw', chart)
    //   const padding = { top: 10, right: 10, bottom: 10, left: 10 }
    //   const area = chart.chartArea
    //   area.top += padding.top
    //   area.bottom -= padding.bottom
    //   area.left += padding.left
    //   area.right -= padding.right
    // },
    //   },
    // ],
  }
}

watch(
  data,
  (_data) => {
    latestEpochsData =
      _data?.latest_epochs_data?.sort((a: any, b: any) => {
        return a.no > b.no ? 1 : -1
      }) || []

    const latestEpochData = latestEpochsData[0]

    if (latestEpochData) {
      circSupplyPercent.value = _data!.circulating_supply / +totalSupply

      if (latestEpochData?.price && latestEpochData.supply) {
        priceChange.value = _data!.exchange_rate / latestEpochData.price - 1
        // marketCapChange.value = (priceChange.value * _data.circulating_supply) / latestEpochData.supply
      }

      if (latestEpochData?.stake) {
        liveStakeChange.value = _data!.total_stake / latestEpochData.stake - 1
      }

      if (latestEpochData?.holders) {
        holdersChange.value = _data!.holders - latestEpochData.holders
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  // initChartData()
  initShips()
})

watch([darkMode, trendColors], initChartData, { immediate: true })

onUnmounted(() => {
  shipsAnimation?.cancel()
})

watch(data, initShips)
</script>
