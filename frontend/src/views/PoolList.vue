<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
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

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="DoneIcon"
        icon-class="text-amber-400 *:last:text-slate-400 dark:text-yellow-400 dark:*:last:text-gray-200"
        title="retired">
        <template #value>
          <CountUp :key="numberFormat" :value="data.pool_retired" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="BlocksIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="slot.leaders">
        <template #value>
          <CountUp :key="numberFormat" :value="data.pool_with_block" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="SaturationIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="saturation.point"
        :value="formatToken(formatValue(data.saturation_point))" />
    </div>

    <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('pools') }}</h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('pools.desc') }}</div>

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
      :unique-key="(row) => row.bech32"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #watchlist="{ row: { bech32, hash } }">
        <WatchlistToggle type="pool" :data="bech32" :legacy-data="hash" class="mt-3.5 h-4 w-4" />
      </template>
      <template #pool="{ row: { bech32, hash, name, ticker, itn, mithril } }">
        <DataListPool :name="name" :bech32="bech32" :hash="hash" :ticker="ticker" :itn="itn" :mithril="mithril" />
      </template>
      <template #margin="{ id, row }">
        {{ formatPercent(row[id], 2, true) }}
      </template>
      <template #apr="{ row: { apr } }">
        {{ formatPercent(apr[0], 2, true) }}
      </template>
      <template #num="{ id, row }">
        {{ formatNumber(row[id]) }}
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
        <PercentFilled
          v-if="id == 'live_stake'"
          :value="row[id]"
          :max="data.saturation_point"
          :max-cap="Infinity"
          class="mt-1" />
      </template>
      <template #pledge="{ row: { pledge, owner_live_stake } }">
        <div class="flex items-center gap-1.5">
          <TooltipAmount :value="pledge" />
          <VTooltip
            v-if="owner_live_stake - pledge < 0"
            class="size-4 cursor-help text-orange-500 dark:text-orange-400"
            bg="bg-orange-200 dark:bg-yellow-700">
            <WarningIcon stroke-width="1.5" />
            <template #tooltip>
              {{ t('pledge.not_met') }}
            </template>
          </VTooltip>
        </div>
      </template>
    </DataList>

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.pool"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import BlocksIcon from '@/assets/icons/blocks.svg?component'
import DoneIcon from '@/assets/icons/done.svg?component'
import BackgroundIcon from '@/assets/icons/menu_blocks.svg?component'
import PoolsIcon from '@/assets/icons/pools.svg?component'
import SaturationIcon from '@/assets/icons/saturation.svg?component'
import WarningIcon from '@/assets/icons/warning.svg?component'

import { numberFormat, t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber, formatPercent, formatToken, formatValue } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

import CountUp from '@/components/CountUp.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
// import DataGridTimeAgo from '@/components/DataGridTimeAgo.vue'
import DataList from '@/components/DataList.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VTooltip from '@/components/VTooltip.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

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
    { id: 'pool' },
    { id: 'live_stake', slot: 'ada' },
    { id: 'delegator', slot: 'num' },
    { id: 'margin' },
    { id: 'fixed_cost', slot: 'ada' },
    { id: 'pledge' },
    { id: 'block', slot: 'num' },
    { id: 'total_block', slot: 'num' },
    { id: 'reward_amount', slot: 'ada' },
    { id: 'pool_fee', slot: 'ada' },
    { id: 'active_stake', slot: 'ada' },
    { id: 'live_leverage', slot: 'num' },
    { id: 'apr' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.pools',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )
</script>
