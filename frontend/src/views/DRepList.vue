<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="dreps.active"
        :value="formatNumber(data.active_total)">
        <template #desc>
          <MainCardDesc title="total" :value="formatNumber(data.total)" bg="bg-blue-50 dark:bg-blue-500/10" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="HoldersIcon"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="delegators"
        :value="formatNumber(data.delegator)" />

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="DelegationIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="stake.active"
        :value="formatToken(formatValue(data.live_stake - data.abstain_stake - data.inactive_stake))">
        <template #desc>
          <MainCardDesc title="total" :value="formatToken(formatValue(data.live_stake))" bg="bg-green-50 dark:bg-green-500/10" />
        </template>
      </MainCard>

      <!-- <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="DataCloudIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="blocks.size"
        :value="formatBytes(data.sum_block_size)" /> -->
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
import DelegationIcon from '@/assets/icons/delegation.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import BackgroundIcon from '@/assets/icons/menu_dreps.svg?component'
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
import DataListTimeUntil from '@/components/DataListTimeUntil.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
import SortSelector from '@/components/SortSelector.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
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
  colList: ColList = [{ id: 'watchlist' }, { id: 'drep' }, { id: 'delegator' }, { id: 'live_stake' }, { id: 'active_until' }, { id: 'reg_time' }],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.dreps',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )
</script>
