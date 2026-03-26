<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="holders.ada"
        :value="formatNumber(data.account_with_amount)" />

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="BlocksIcon"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="amount.hold"
        :value="formatToken(formatValue(data.shelley_amount))" />

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="LoupeIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="holders.stake"
        :value="formatNumber(data.delegator_with_stake)" />

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="DataCloudIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="stake.live"
        :value="formatToken(formatValue(data.stake))" />
    </div>

    <h1 class="relative mt-10 flex max-w-max items-center gap-2 text-2xl font-medium capitalize">
      <select
        class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800"
        @change="changePage($event)">
        <option value="" selected>{{ t('accounts.stake') }}</option>
        <option value="addresses">{{ t('addresses.legacy') }}</option>
      </select>
      {{ t('accounts.stake') }}
      <ChevronIcon
        class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
        stroke-width="1.3" />
    </h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('accounts.stake.desc') }}</div>

    <HolderIcons :data="data.account_types" :zero="data.account - data.account_with_amount" class="mb-15" />

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
      :unique-key="(row) => row.base16"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #watchlist="{ row: { bech32, base16 } }">
        <WatchlistToggle type="account" :data="bech32" :legacy-data="base16.slice(2)" class="mt-3.5 h-4 w-4" />
      </template>
      <template #account="{ row: { base16, bech32, balance } }">
        <DataListHolder :bech32="bech32" :base16="base16" :balance="balance" />
      </template>
      <template #pool="{ row: { pool_bech32, pool_hash, pool_name, pool_ticker } }">
        <DataListPool :name="pool_name" :bech32="pool_bech32" :hash="pool_hash" :ticker="pool_ticker" />
      </template>
      <template #drep="{ row: { drep_bech32, drep_base16, drep_given_name, drep_image } }">
        <DataListDRep :name="drep_given_name" :bech32="drep_bech32" :base16="drep_base16" :image="drep_image" />
      </template>
      <template #num="{ id, row }">
        {{ row[id] == null ? '–' : formatNumber(row[id]) }}
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
      </template>
      <template #act="{ id, row }">
        <DataListActivity :tx-hash="row[`${id}_hash`]" :tx-time="row[`${id}_time`]" :last="id == 'last_tx'" />
      </template>
    </DataList>

    <!-- <DataGrid v-else :rows="rows" unique-key="base16" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />
    </DataGrid> -->

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.account"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import BlocksIcon from '@/assets/icons/blocks.svg?component'
import ChevronIcon from '@/assets/icons/chevron.svg?component'
import DataCloudIcon from '@/assets/icons/data_cloud.svg?component'
import LoupeIcon from '@/assets/icons/loupe.svg?component'
import BackgroundIcon from '@/assets/icons/menu_holders.svg?component'
import PyramidIcon from '@/assets/icons/pyramid.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber, formatToken, formatValue } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataPagination from '@/components/DataPagination.vue'
import HolderIcons from '@/components/HolderIcons.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
// import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
// import VImg from '@/components/VImg.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

const {
  router,
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
    { id: 'account' },
    { id: 'balance', slot: 'ada' },
    { id: 'total_reward_amount', slot: 'ada' },
    { id: 'token', slot: 'num' },
    { id: 'first_tx', slot: 'act' },
    { id: 'last_tx', slot: 'act' },
    { id: 'tx', slot: 'num' },
    { id: 'pool' },
    { id: 'drep' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.accounts',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )

const changePage = (event: any) => {
  if (event?.target?.value) {
    router.push({ name: event.target.value })
  }
}
</script>
