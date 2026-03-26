<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="relative overflow-hidden border-b-blue-400 dark:border-b-sky-400/50"
        title="epoch.current"
        :value="formatNumber(data.epoch_no)">
        <template #icon>
          <!-- <img :src="EpochsSrc" class="pointer-events-none absolute -top-10 left-0" /> -->
          <div class="h-9 w-12 overflow-hidden rounded-md">
            <img
              :src="getEpochImage(data.epoch_no)"
              :alt="t(`epoch.phase.${getEpochName(data.epoch_no)}`)"
              class="h-12 w-12" />
          </div>
        </template>
        <template #desc>
          <MainCardDesc :title="`epoch.phase.${getEpochName(data.epoch_no)}`" bg="bg-blue-50 dark:bg-blue-500/10" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="slot.epoch">
        <template #icon>
          <CircularProgress
            :value="(data.epoch_slot_no ?? 0) / epochLength"
            class="from-amber-500 to-slate-200 to-0% dark:from-yellow-400 dark:to-gray-600" />
        </template>
        <template #desc>
          <MainCardDesc title="total" :value="formatNumber(epochLength)" bg="bg-yellow-50 dark:bg-yellow-500/10" />
        </template>
        <template #value>
          <CountUp
            :key="numberFormat"
            :value="data.epoch_slot_no ?? 0"
            :formatter="(v) => formatNumber(v)"
            stableWidth />
        </template>
      </MainCard>
    </div>

    <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('epochs') }}</h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('epochs.desc') }}</div>

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
      :rows="rows"
      :unique-key="(row) => row.no"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #no="{ row: { no } }">
        <RouterLink :to="{ name: 'epoch', params: { id: no } }" class="block">
          <div class="mb-1.5 font-medium text-sky-500 underline dark:text-cyan-400">
            {{ formatNumber(no) }}
          </div>
          <div class="text-xs font-light">{{ t(`epoch.phase.${getEpochName(no)}`) }}</div>
        </RouterLink>
      </template>
      <template #holder="{ row: { account_with_amount, byron_with_amount } }">
        {{ formatNumber(account_with_amount + byron_with_amount) }}
      </template>
      <template #num="{ id, row }">
        {{ formatNumber(row[id]) }}
      </template>
      <template #account_with_reward="{ row: { account_with_reward, no } }">
        <div :class="{ 'font-light italic opacity-50': account_with_reward == null || no > data.epoch_no - 2 }">
          {{ account_with_reward == null ? t('pending') : formatNumber(account_with_reward) }}
        </div>
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
      </template>
      <template #ada_null="{ id, row }">
        <div v-if="row[id] == null" class="font-light italic opacity-50">{{ t('pending') }}</div>
        <TooltipAmount
          v-else
          :value="row[id]"
          :class="{ 'font-light italic opacity-50': row.no > data.epoch_no - 2 }" />
      </template>
      <template #start="{ row: { no } }">
        <DataListActivity tx-hash="" :tx-time="getEpochStartTime(no)" />
      </template>
      <template #end="{ row: { no } }">
        <DataListActivity v-if="no < data.epoch_no" tx-hash="" :tx-time="getEpochEndTime(no)" last />
        <div v-else class="font-light italic opacity-50">
          {{ t('pending') }}
          <div class="mt-1 text-xs leading-5">{{ formatDateTime(getEpochEndTime(no)) }}</div>
        </div>
      </template>
      <template #market_cap="{ row: { exchange_rate, circulating_supply } }">
        <TooltipAmount :value="circulating_supply * exchange_rate" :currency="currencies[currency]?.sign" />
      </template>
      <template #exchange_rate="{ row: { exchange_rate } }">
        {{ formatCurrency(formatPrice(exchange_rate)) }}
      </template>
      <template #circulating_supply="{ row: { circulating_supply } }">
        <TooltipAmount :value="circulating_supply" />
        <PercentFilled :value="circulating_supply" :max="maxSupply" :fraction-digits="2" class="mt-1" />
      </template>
      <template #block="{ row: { block, no } }">
        {{ formatNumber(block) }}
        <PercentFilled
          :value="block"
          :max="no < data.epoch_no ? blockPerEpoch : (blockPerEpoch * (data.epoch_slot_no ?? 0)) / epochLength"
          inverted
          class="mt-1" />
      </template>
      <template #block_with_tx="{ row: { block, block_with_tx } }">
        {{ formatNumber(block_with_tx) }}
        <PercentFilled :value="block_with_tx" :max="block" inverted class="mt-1" />
      </template>
      <template #block_size="{ row: { block, block_size } }">
        {{ formatBytes(block_size) }}
        <PercentFilled :value="block_size" :max="block * maxBlockSize" class="mt-1" />
      </template>
    </DataList>

    <!-- <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />
    </DataGrid> -->

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.epoch_no + 1"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import BackgroundIcon from '@/assets/icons/menu_epochs.svg?component'

// import EpochsSrc from '@/assets/images/epochs.svg'

import { currencies, currency, numberFormat, t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatBytes, formatCurrency, formatDateTime, formatNumber, formatPrice } from '@/utils/formatter'
import {
  type ColList,
  getEpochEndTime,
  getEpochImage,
  getEpochName,
  getEpochStartTime,
  getTableCols,
} from '@/utils/helper'
import { layout } from '@/utils/settings'

import CircularProgress from '@/components/CircularProgress.vue'
import CountUp from '@/components/CountUp.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'

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

const maxSupply = import.meta.env.VITE_TOTAL_SUPPLY,
  epochLength = import.meta.env.VITE_EPOCH_LENGTH,
  blockPerEpoch = epochLength * import.meta.env.VITE_ACTIVE_SLOTS_COEFF,
  maxBlockSize = 90112

const sortKeyMap = route.meta.api!.sortKeyMap!,
  colList: ColList = [
    { id: 'no' },
    { id: 'tx_amount', slot: 'ada' },
    { id: 'circulating_supply' },
    { id: 'pool_with_block', slot: 'num' },
    { id: 'pool_with_stake', slot: 'num' },
    { id: 'pool_fee', slot: 'ada_null' },
    { id: 'reward_amount', slot: 'ada_null' },
    { id: 'delegator_with_stake', slot: 'num' },
    { id: 'account_with_reward' },
    { id: 'stake', slot: 'ada' },
    { id: 'holder' },
    { id: 'pool_register', slot: 'num' },
    { id: 'pool_retire', slot: 'num' },
    { id: 'block_with_tx' },
    { id: 'token', slot: 'num' },
    { id: 'token_policy', slot: 'num' },
    { id: 'token_holder', slot: 'num' },
    { id: 'token_tx', slot: 'num' },
    { id: 'tx_out_sum', slot: 'ada' },
    { id: 'tx_fee', slot: 'ada' },
    { id: 'tx', slot: 'num' },
    { id: 'block' },
    { id: 'block_size' },
    { id: 'start' },
    { id: 'end' },
    { id: 'market_cap' },
    { id: 'exchange_rate' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.epochs',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )
</script>
