<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="polls.active"
        :value="formatNumber(data.live_poll)">
        <template #desc>
          <MainCardDesc title="total" :value="formatNumber(data.poll)" bg="bg-blue-50 dark:bg-blue-500/10" />
        </template>
      </MainCard>
    </div>

    <h1 class="relative mt-10 flex max-w-max items-center gap-2 text-2xl font-medium capitalize">
      <select class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800" @change="changePage($event)">
        <option value="" selected>{{ t('polls') }}</option>
        <option value="gov_actions">{{ t('gov_actions') }}</option>
      </select>
      {{ t('polls') }}
      <ChevronIcon class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270" stroke-width="1.3" />
    </h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('polls.desc') }}</div>

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
      :unique-key="(row) => row.hash"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #poll="{ row }">
        <div class="flex w-max items-center gap-2 sm:gap-3 md:gap-4">
          <RouterLink :to="{ name: 'poll', params: { id: row.hash } }" class="group flex w-max gap-2.5">
            <div class="w-72 max-w-[30vw] font-sans">
              <TextTruncate :text="row.title" :tail-length="0" class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
              <div>
                <TextTruncate :text="row.description" :tail-length="0" />
              </div>
            </div>
          </RouterLink>
        </div>
      </template>
      <template #status="{ row: { phase2_epoch, phase3_epoch } }">
        <ActionStatus type="infoaction" :expired_epoch="phase2_epoch" :dropped_epoch="phase3_epoch" />
      </template>
      <template #submission_time="{ row: { tx_time, tx_hash } }">
        <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
      </template>
      <template #expiry_epoch="{ row: { phase2_epoch } }">
        <DataListTimeUntil :epoch="phase2_epoch - 1" />
      </template>
      <template #num="{ id, row }">
        {{ formatNumber(row[id]) }}
      </template>
      <template #ada="{ id, row }">
        <TooltipAmount :value="row[id]" />
      </template>
    </DataList>

    <!-- <DataGrid v-else :rows="rows" unique-key="hash" v-slot="{ row }" class="mt-5 text-s">
      <BackgroundIcon class="pointer-events-none absolute bottom-10 left-10 size-2/3 text-sky-800 opacity-1 dark:text-gray-400" />
    </DataGrid> -->

    <DataPagination
      class="mt-12 md:mt-16"
      :page="page"
      :page-count="pageCount"
      :total="data.poll"
      :limit-handling="limitHandling"
      :more-handling="moreHandling"
      @limit="limitHandler"
      @more="moreHandler" />
  </template>
</template>

<script setup lang="ts">
import ChevronIcon from '@/assets/icons/chevron.svg?component'
import BackgroundIcon from '@/assets/icons/menu_actions.svg?component'
import PyramidIcon from '@/assets/icons/pyramid.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { layout } from '@/utils/settings'

import ActionStatus from '@/components/ActionStatus.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListTimeUntil from '@/components/DataListTimeUntil.vue'
// import DataListPool from '@/components/DataListPool.vue'
import DataPagination from '@/components/DataPagination.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
// import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'

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
    { id: 'poll' },
    { id: 'status' },
    { id: 'pool', slot: 'num' },
    { id: 'stake', slot: 'ada' },
    { id: 'pledge', slot: 'ada' },
    { id: 'delegator', slot: 'num' },
    { id: 'submission_time' },
    { id: 'expiry_epoch' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.polls',
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
