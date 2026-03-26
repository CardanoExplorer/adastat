<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="LoupeIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="tokens.total">
        <template #value>
          <CountUp :key="numberFormat" :value="data.token" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="HoldersIcon"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="holders">
        <template #value>
          <CountUp :key="numberFormat" :value="data.holder" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="MenuTransactionsIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="transactions">
        <template #value>
          <CountUp :key="numberFormat" :value="data.tx" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="LockedIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="policies">
        <template #value>
          <CountUp :key="numberFormat" :value="data.policy" :formatter="(v) => formatNumber(v)" />
        </template>
      </MainCard>
    </div>

    <h1 class="relative mt-10 flex max-w-max items-center gap-2 text-2xl font-medium capitalize">
      <select class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800" @change="changePage($event)">
        <option value="" selected>{{ t('tokens') }}</option>
        <option value="policies">{{ t('policies') }}</option>
      </select>
      {{ t('tokens') }}
      <ChevronIcon class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270" stroke-width="1.3" />
    </h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('tokens.desc') }}</div>

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
      :unique-key="(row) => row.fingerprint"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #watchlist="{ row: { fingerprint } }">
        <WatchlistToggle type="token" :data="fingerprint" class="mt-3.5 h-4 w-4" />
      </template>
      <template #token="{ row: { fingerprint, name, ticker, asset_name, asset_name_hex, image } }">
        <DataListToken :fingerprint="fingerprint" :name="name" :ticker="ticker" :asset_name="asset_name" :asset_name_hex="asset_name_hex" :image="image" />
      </template>
      <template #policy="{ row: { policy } }">
        <RouterLink :to="{ name: 'policy', params: { id: policy } }" class="block w-40 max-w-[30vw]">
          <TextTruncate :text="policy" class="font-medium text-sky-500 *:underline dark:text-cyan-400" />
        </RouterLink>
      </template>
      <template #num="{ id, row }">
        {{ formatNumber(row[id]) }}
      </template>
      <template #act="{ id, row }">
        <DataListActivity :tx-hash="row[`${id}_hash`]" :tx-time="row[`${id}_time`]" :last="id == 'last_tx'" />
      </template>
      <template #supply="{ row: { supply, decimals } }">
        <TooltipAmount :value="supply" :fraction-digits="decimals" currency="" />
      </template>
    </DataList>

    <!-- <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />
    </DataGrid> -->

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.token"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import ChevronIcon from '@/assets/icons/chevron.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import LockedIcon from '@/assets/icons/locked.svg?component'
import LoupeIcon from '@/assets/icons/loupe.svg?component'
import BackgroundIcon from '@/assets/icons/menu_tokens.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'

import { numberFormat, t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

import CountUp from '@/components/CountUp.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListToken from '@/components/DataListToken.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
// import MainCardDesc from '@/components/MainCardDesc.vue'
import SortSelector from '@/components/SortSelector.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
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
    { id: 'token' },
    { id: 'policy' },
    { id: 'holder', slot: 'num' },
    { id: 'supply' },
    { id: 'decimals', slot: 'num' },
    { id: 'first_tx', slot: 'act' },
    { id: 'last_tx', slot: 'act' },
    { id: 'tx', slot: 'num' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.tokens',
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
