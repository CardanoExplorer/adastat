<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
      <MainCard
        class="border-b-blue-400 dark:border-b-sky-400/50"
        :icon="PyramidIcon"
        icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
        title="gov_actions.active"
        :value="formatNumber(data.active)">
        <template #desc>
          <MainCardDesc title="total" :value="formatNumber(data.total)" bg="bg-blue-50 dark:bg-blue-500/10" />
        </template>
      </MainCard>

      <MainCard
        class="border-b-amber-400 dark:border-b-amber-400/50"
        :icon="DoneIcon"
        icon-class="text-amber-400 *:last:text-slate-400 dark:text-yellow-400 dark:*:last:text-gray-200"
        title="gov_actions.ratified"
        :value="formatNumber(data.ratified)" />

      <!-- <MainCard
        class="border-b-up-400 dark:border-b-up-400/50"
        :icon="LoupeIcon"
        icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
        title="stake.active"
        :value="formatCurrency(formatValue(data.live_stake - data.abstain_stake - data.inactive_stake))">
        <template #desc>
          <MainCardDesc title="total" :value="formatCurrency(formatValue(data.live_stake))" bg="bg-green-50 dark:bg-green-500/10" />
        </template>
      </MainCard> -->

      <!-- <MainCard
        class="border-b-indigo-400 dark:border-b-indigo-400/50"
        :icon="DataCloudIcon"
        icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
        title="blocks.size"
        :value="formatBytes(data.sum_block_size)" /> -->
    </div>

    <h1 class="relative mt-10 flex max-w-max items-center gap-2 text-2xl font-medium capitalize">
      <select
        class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800"
        @change="changePage($event)">
        <option value="" selected>{{ t('gov_actions') }}</option>
        <option value="polls">{{ t('polls') }}</option>
      </select>
      {{ t('gov_actions') }}
      <ChevronIcon
        class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
        stroke-width="1.3" />
    </h1>
    <div class="mt-2.5 mb-15 text-s text-slate-600 dark:text-gray-400">{{ t('gov_actions.desc') }}</div>

    <div class="mb-4 flex gap-2">
      <LayoutSwitcher />
      <FilterSelector
        :filter-key-map="filterKeyMap"
        :filter-key="filterKey"
        :filter-handling="filterHandling"
        @filter="setFilter"
        class="ml-auto" />
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
      :unique-key="(row) => row.tx_hash + '#' + row.index"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :sort-handling="sortHandling"
      @sort="sortHandler">
      <template #gov_action="{ row: { index, title, tx_hash } }">
        <RouterLink
          :to="{ name: 'gov_action', params: { id: tx_hash + ('0' + parseInt(index).toString(16)).slice(-2) } }"
          class="mb-1 block w-72 max-w-[30vw]">
          <TextTruncate
            :text="title"
            :tail-length="0"
            class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
        </RouterLink>
      </template>
      <template #type="{ row: { type } }"> {{ t('gov_action.type.' + type) }} </template>
      <template #status="{ row: { type, enacted_epoch, ratified_epoch, dropped_epoch, expired_epoch } }">
        <ActionStatus
          :type="type"
          :enacted_epoch="enacted_epoch"
          :ratified_epoch="ratified_epoch"
          :dropped_epoch="dropped_epoch"
          :expired_epoch="expired_epoch" />
      </template>
      <template
        #cc="{
          row: { cc_yes, cc_no, cc_active, cc_quorum_denominator, cc_quorum_numerator, expired_epoch, ratified_epoch },
        }">
        <template v-if="cc_active != null">
          <template
            v-if="
              !cc_active || !cc_quorum_denominator || cc_yes / cc_active >= cc_quorum_numerator / cc_quorum_denominator
            ">
            {{ t('confirmed') }}
            <PercentFilled
              class="mt-1"
              :value="cc_yes"
              :max="cc_active"
              :color-var="darkMode ? '--color-up-400' : '--color-up-500'" />
          </template>
          <template
            v-else-if="
              cc_no / cc_active > 1 - cc_quorum_numerator / cc_quorum_denominator ||
              (cc_yes / cc_active < cc_quorum_numerator / cc_quorum_denominator && (expired_epoch || ratified_epoch))
            ">
            {{ t('rejected') }}
            <PercentFilled
              class="mt-1"
              :value="cc_yes"
              :max="cc_active"
              :color-var="darkMode ? '--color-down-400' : '--color-down-500'" />
          </template>
          <template v-else>
            {{ t('pending') }}
            <PercentFilled
              class="mt-1"
              :value="cc_yes"
              :max="cc_active"
              :color-var="darkMode ? '--color-cyan-400' : '--color-sky-500'" />
          </template>
        </template>
        <template v-else>–</template>
      </template>
      <template #drep="{ row: { type, drep_active_stake, drep_yes_stake, drep_threshold } }">
        <CircularProgress
          v-if="drep_active_stake != null"
          :value="drep_active_stake ? drep_yes_stake / drep_active_stake : 0"
          :fraction-digits="drep_yes_stake / drep_active_stake < 0.1 ? 1 : 0"
          class="w-12 to-slate-200 to-0% dark:to-gray-600"
          :class="
            (
              type == 'infoaction'
                ? drep_yes_stake / drep_active_stake > 0.5
                : drep_yes_stake / drep_active_stake >= drep_threshold
            )
              ? 'from-up-500 dark:from-up-400'
              : 'from-down-500 dark:from-down-400'
          " />
        <template v-else>–</template>
      </template>
      <template #pool="{ row: { type, pool_active_stake, pool_yes_stake, pool_threshold } }">
        <CircularProgress
          v-if="pool_active_stake != null"
          :value="pool_active_stake ? pool_yes_stake / pool_active_stake : 0"
          :fraction-digits="pool_yes_stake / pool_active_stake < 0.1 ? 1 : 0"
          class="w-12 to-slate-200 to-0% dark:to-gray-600"
          :class="
            (
              type == 'infoaction'
                ? pool_yes_stake / pool_active_stake > 0.5
                : pool_yes_stake / pool_active_stake >= pool_threshold
            )
              ? 'from-up-500 dark:from-up-400'
              : 'from-down-500 dark:from-down-400'
          " />
        <template v-else>–</template>
      </template>
      <template #submission_time="{ row: { submission_time, tx_hash } }">
        <DataListActivity :tx-hash="tx_hash" :tx-time="submission_time" />
      </template>
      <template #expiry_epoch="{ row: { expiry_epoch, ratified_epoch, expired_epoch, dropped_epoch } }">
        <DataListTimeUntil :epoch="(ratified_epoch || expired_epoch || dropped_epoch || expiry_epoch) - 1" />
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
import { ref } from 'vue'

import ChevronIcon from '@/assets/icons/chevron.svg?component'
import DoneIcon from '@/assets/icons/done.svg?component'
import BackgroundIcon from '@/assets/icons/menu_actions.svg?component'
import PyramidIcon from '@/assets/icons/pyramid.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber } from '@/utils/formatter'
import { type ColList, getTableCols } from '@/utils/helper'
import { darkMode, layout } from '@/utils/settings'

import ActionStatus from '@/components/ActionStatus.vue'
import CircularProgress from '@/components/CircularProgress.vue'
// import DataGrid from '@/components/DataGrid.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
// import DataGridSection from '@/components/DataGridSection.vue'
// import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
// import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListTimeUntil from '@/components/DataListTimeUntil.vue'
import DataPagination from '@/components/DataPagination.vue'
import FilterSelector from '@/components/FilterSelector.vue'
import LayoutSwitcher from '@/components/LayoutSwitcher.vue'
import MainCard from '@/components/MainCard.vue'
import MainCardDesc from '@/components/MainCardDesc.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import SortSelector from '@/components/SortSelector.vue'
import TextTruncate from '@/components/TextTruncate.vue'

const {
  router,
  route,
  errorCode,
  data,
  rows,
  filterMap,
  sortPoint,
  sortKey,
  sortDir,
  sortHandler,
  sortHandling,
  limitHandling,
  limitHandler,
  moreHandler,
  moreHandling,
  filterHandler,
  page,
  pageCount,
} = useViewApi()

const sortKeyMap = route.meta.api!.sortKeyMap!,
  colList: ColList = [
    { id: 'gov_action' },
    { id: 'type' },
    { id: 'status' },
    { id: 'cc' },
    { id: 'drep' },
    { id: 'pool' },
    { id: 'submission_time' },
    { id: 'expiry_epoch' },
  ],
  cols = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.gov_actions',
      slot: col.slot || col.id,
      sort: Boolean(sortKeyMap[col.id]),
    }))
  ),
  filterKeyMap = {
    '': 'gov_actions.all',
    parameterchange: 'gov_action.type.parameterchange',
    hardforkinitiation: 'gov_action.type.hardforkinitiation',
    treasurywithdrawals: 'gov_action.type.treasurywithdrawals',
    noconfidence: 'gov_action.type.noconfidence',
    newcommittee: 'gov_action.type.newcommittee',
    newconstitution: 'gov_action.type.newconstitution',
    infoaction: 'gov_action.type.infoaction',
  },
  filterKey = ref<keyof typeof filterKeyMap>(
    filterMap.rows && filterKeyMap[filterMap.rows as keyof typeof filterKeyMap]
      ? (filterMap.rows as keyof typeof filterKeyMap)
      : ''
  ),
  filterHandling = ref(false)

const setFilter = async (val: keyof typeof filterKeyMap) => {
  filterHandling.value = true

  filterKey.value = val

  await filterHandler(
    val
      ? {
          rows: val,
        }
      : {}
  )

  filterHandling.value = false
}

const changePage = (event: any) => {
  if (event?.target?.value) {
    router.push({ name: event.target.value })
  }
}
</script>
