<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="block.height"
        :value="formatNumber(data.block_height)" />

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="BlocksIcon"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="with_tx"
        :value="formatNumber(data.block_with_tx)" />

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="LoupeIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="avg_per_epoch"
        :value="formatNumber(data.avg_block)" />

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="DataCloudIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="blocks.size"
        :value="formatBytes(data.sum_block_size)" />
    </div>

    <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('blocks') }}</h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('blocks.desc') }}</div>

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
      v-if="layout == 'list'"
      :cols="cols"
      :rows="rows"
      :unique-key="(row) => row.hash"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #block="{ row: { epoch_no, hash, no } }">
        <RouterLink :to="{ name: 'block', params: { id: hash } }" class="block w-40 max-w-[30vw] font-sans font-medium">
          <TextTruncate :text="hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
          <div class="font-normal">{{ epoch_no == null ? t('block.genesis') : formatNumber(no) }}</div>
        </RouterLink>
      </template>
      <template #time="{ row: { time } }">
        <DataListTimeAgo :time="time" />
      </template>
      <template #size="{ row: { size } }">
        {{ formatBytes(size) }}
        <PercentFilled :value="size" :max="maxBlockSize" class="mt-1" />
      </template>
      <template #epoch_slot="{ row: { epoch_no, epoch_slot_no } }">
        <template v-if="epoch_no == null">–</template>
        <template v-else>
          <RouterLink
            :to="{ name: 'epoch', params: { id: epoch_no } }"
            class="font-medium text-sky-500 underline dark:text-cyan-400">
            {{ formatNumber(epoch_no) }}
          </RouterLink>
          / <span class="text-xs font-normal">{{ formatNumber(epoch_slot_no) }}</span>
        </template>
      </template>
      <template #pool="{ row: { pool_bech32, pool_hash, pool_name, pool_ticker } }">
        <DataListPool :name="pool_name" :bech32="pool_bech32" :hash="pool_hash" :ticker="pool_ticker" />
      </template>
      <template #num="{ id, row }">
        {{ row[id] == null ? '–' : formatNumber(row[id]) }}
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
      </template>
      <template #proto_ver="{ row: { proto_major, proto_minor } }"> {{ proto_major }}.{{ proto_minor }} </template>
    </DataList>

    <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon
        class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />

      <div class="mb-8 flex justify-between gap-3">
        <RouterLink :to="{ name: 'block', params: { id: row.hash } }" class="max-w-3/5 min-w-0 text-sm font-medium">
          {{ row.epoch_no == null ? t('block.genesis') : formatNumber(row.no) }}
          <TextTruncate :text="row.hash" class="mt-1 text-sky-500 *:underline dark:text-cyan-400" />
        </RouterLink>
        <div class="shrink-0 text-right font-light">
          <DataGridTimeAgo :time="row.time" />
        </div>
      </div>

      <DataGridSection>
        <DataGridSectionRow title="slot">
          {{ row.slot_no == null ? '–' : formatNumber(row.slot_no) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="epoch">
          <template v-if="row.epoch_no == null">–</template>
          <RouterLink
            v-else
            :to="{ name: 'epoch', params: { id: row.epoch_no } }"
            class="text-sky-500 underline dark:text-cyan-400">
            {{ formatNumber(row.epoch_no) }}
          </RouterLink>
        </DataGridSectionRow>
        <DataGridSectionRow title="slot.epoch">
          {{ row.epoch_slot_no == null ? '–' : formatNumber(row.epoch_slot_no) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="size">
          {{ formatBytes(row.size) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="utilization">
          <PercentFilled :value="row.size" :max="maxBlockSize" class="my-0.5" />
        </DataGridSectionRow>
      </DataGridSection>

      <DataGridSection>
        <template #header>
          <DataGridSectionHeader class="mt-4.5 mb-3" header="transaction.data" />
        </template>
        <DataGridSectionRow title="transactions">
          {{ formatNumber(row.tx) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="table_cols.blocks.tx_amount">
          <TooltipAmount :value="row.tx_amount" />
        </DataGridSectionRow>
        <DataGridSectionRow title="table_cols.blocks.tx_out_sum">
          <TooltipAmount :value="row.tx_out_sum" />
        </DataGridSectionRow>
        <DataGridSectionRow title="table_cols.blocks.tx_fee">
          <TooltipAmount :value="row.tx_fee" />
        </DataGridSectionRow>
      </DataGridSection>

      <DataGridSectionHeader class="my-5">{{ t('table_cols.blocks.pool') }}</DataGridSectionHeader>
      <DataGridPool :name="row.pool_name" :bech32="row.pool_bech32" :hash="row.pool_hash" :ticker="row.pool_ticker" />
    </DataGrid>

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.block_height + 1"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import BlocksIcon from '@/assets/icons/blocks.svg?component'
import DataCloudIcon from '@/assets/icons/data_cloud.svg?component'
import LoupeIcon from '@/assets/icons/loupe.svg?component'
import BackgroundIcon from '@/assets/icons/menu_blocks.svg?component'
import PyramidIcon from '@/assets/icons/pyramid.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatBytes, formatNumber } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

import DataGrid from '@/components/DataGrid.vue'
import DataGridPool from '@/components/DataGridPool.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataGridTimeAgo from '@/components/DataGridTimeAgo.vue'
import DataList from '@/components/DataList.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeAgo from '@/components/DataListTimeAgo.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'

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

const maxBlockSize = 90112,
  sortKeyMap = route.meta.api!.sortKeyMap!,
  colList: ColList = [
    { id: 'block' },
    { id: 'time' },
    { id: 'tx', slot: 'num' },
    { id: 'size' },
    { id: 'pool' },
    { id: 'slot_no', slot: 'num' },
    { id: 'epoch_slot' },
    { id: 'tx_amount', slot: 'ada' },
    { id: 'tx_out_sum', slot: 'ada' },
    { id: 'tx_fee', slot: 'ada' },
    { id: 'proto_ver' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.blocks',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )
</script>
