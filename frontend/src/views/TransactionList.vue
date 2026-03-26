<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="BlocksIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="transactions.total"
        :value="formatNumber(data.tx)" />

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
        title="current_load"
        :value="formatPercent(data.live_load)" />

      <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="LoupeIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="avg_per_epoch"
        :value="formatNumber(data.avg_tx)" />

      <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="CoinsIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="fees.total"
        :value="formatToken(formatValue(data.tx_fee))" />
    </div>

    <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('transactions') }}</h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('transactions.desc') }}</div>

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
      <template #transaction="{ row: { hash } }">
        <RouterLink
          :to="{ name: 'transaction', params: { id: hash } }"
          class="block w-40 max-w-[30vw] font-sans font-medium">
          <TextTruncate :text="hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
        </RouterLink>
      </template>
      <template #time="{ row: { time } }">
        <DataListTimeAgo :time="time" />
      </template>
      <template #size="{ row: { size } }">
        {{ formatBytes(size) }}
        <PercentFilled :value="size" :max="maxTxSize" class="mt-1" />
      </template>
      <template #script_size="{ row: { script_size } }">
        {{ formatBytes(script_size) }}
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
      <template #block_index="{ row: { epoch_no, block_no, block_hash, block_index } }">
        <RouterLink
          :to="{ name: 'block', params: { id: block_hash } }"
          class="font-medium text-sky-500 underline dark:text-cyan-400"
          >{{ epoch_no == null ? t('block.genesis') : formatNumber(block_no) }}</RouterLink
        >
        / <span class="text-xs font-normal">{{ epoch_no == null ? '–' : formatNumber(block_index) }}</span>
      </template>
      <template #num="{ id, row }">
        {{ row[id] == null ? '–' : formatNumber(row[id]) }}
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
      </template>
    </DataList>

    <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon
        class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />

      <div class="mb-8 flex justify-between gap-3">
        <RouterLink
          :to="{ name: 'transaction', params: { id: row.hash } }"
          class="max-w-3/5 min-w-0 text-sm font-medium">
          <TextTruncate :text="row.hash" class="mt-6 text-sky-500 *:underline dark:text-cyan-400" />
        </RouterLink>
        <div class="shrink-0 text-right font-light">
          <DataGridTimeAgo :time="row.time" />
        </div>
      </div>

      <DataGridSection>
        <DataGridSectionRow title="amount">
          <TooltipAmount :value="row.amount" />
        </DataGridSectionRow>
        <DataGridSectionRow title="output.sum">
          <TooltipAmount :value="row.out_sum" />
        </DataGridSectionRow>
        <DataGridSectionRow title="fee">
          <TooltipAmount :value="row.fee" />
        </DataGridSectionRow>
        <DataGridSectionRow title="deposit">
          <TooltipAmount :value="row.deposit" />
        </DataGridSectionRow>
        <DataGridSectionRow title="tokens">
          {{ formatNumber(row.token) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="size">
          {{ formatBytes(row.size) }}
        </DataGridSectionRow>
        <DataGridSectionRow title="utilization">
          <PercentFilled :value="row.size" :max="maxTxSize" class="my-0.5" />
        </DataGridSectionRow>
        <DataGridSectionRow title="script.size">
          {{ formatBytes(row.script_size) }}
        </DataGridSectionRow>
      </DataGridSection>

      <DataGridSection>
        <template #header>
          <DataGridSectionHeader class="mt-4.5 mb-3" header="block.data" />
        </template>
        <DataGridSectionRow title="block">
          <RouterLink
            :to="{ name: 'block', params: { id: row.block_hash } }"
            class="text-sky-500 underline dark:text-cyan-400">
            {{ row.slot_no == null ? t('block.genesis') : formatNumber(row.block_no) }}
          </RouterLink>
        </DataGridSectionRow>
        <DataGridSectionRow title="index">
          {{ row.slot_no == null ? '–' : formatNumber(row.block_index) }}
        </DataGridSectionRow>
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
      </DataGridSection>
    </DataGrid>

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.tx"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import BlocksIcon from '@/assets/icons/blocks.svg?component'
import CoinsIcon from '@/assets/icons/coins.svg?component'
import LoupeIcon from '@/assets/icons/loupe.svg?component'
import BackgroundIcon from '@/assets/icons/menu_transactions.svg?component'
import PyramidIcon from '@/assets/icons/pyramid.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatBytes, formatNumber, formatPercent, formatToken, formatValue } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

import DataGrid from '@/components/DataGrid.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataGridTimeAgo from '@/components/DataGridTimeAgo.vue'
import DataList from '@/components/DataList.vue'
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

const maxTxSize = 16384,
  sortKeyMap = route.meta.api!.sortKeyMap!,
  colList: ColList = [
    { id: 'transaction' },
    { id: 'time' },
    { id: 'amount', slot: 'ada' },
    { id: 'out_sum', slot: 'ada' },
    { id: 'fee', slot: 'ada' },
    { id: 'deposit', slot: 'ada' },
    { id: 'token', slot: 'num' },
    { id: 'size' },
    { id: 'script_size' },
    { id: 'block_index' },
    { id: 'slot_no', slot: 'num' },
    { id: 'epoch_slot' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.transactions',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  )
</script>
