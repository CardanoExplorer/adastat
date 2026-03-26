<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-3">
      <div class="relative order-1 sm:pt-2 xl:pt-3">
        <h1 class="text-2xl font-medium">
          {{ t('poll.spo') }}
        </h1>
        <div class="mb-10 text-xl font-medium" :class="statusColors[status!]">
          {{ data.title }}
        </div>
        <div class="mx-auto mb-4 w-75 text-center">
          <span class="rounded-md bg-sky-100 box-decoration-clone p-1.5 px-2 text-sm leading-6 font-medium text-slate-800 dark:bg-gray-800 dark:text-gray-300">
            {{ data.question }}
          </span>
        </div>
        <div class="relative mx-auto w-75">
          <div class="flex h-32">
            <div class="flex flex-col">
              <div class="mt-6 opacity-70">{{ t('voting.start') }}</div>
              <RouterLink
                :to="{ name: 'transaction', params: { id: data.tx_hash } }"
                class="absolute top-11 z-1 text-xs font-medium text-indigo-700 underline dark:text-indigo-400">
                {{ formatDateTime(data.tx_time) }}
              </RouterLink>
              <div v-if="actionEpoch" class="mt-auto opacity-30">
                {{ t('closed') }}
              </div>
              <ActionStatus v-else-if="status != 'active'" class="mt-auto" type="infoaction" :expired_epoch="actionEpoch" />
            </div>
            <div class="relative flex-1">
              <svg viewBox="0 0 165 128" fill="none" stroke="currentColor" class="h-32 w-full" preserveAspectRatio="none">
                <path
                  v-if="votingProgress < 100"
                  pathLength="100"
                  stroke-dasharray="0.5 0.5"
                  d="M12 26c7-6 24 7 41 0C75 17 42-5 74 3c24 7 20 22 9 23-32 7 49 45-48 48-49 3-45 54 14 32 48-12 29 9 57 2 37-11 29 1 48 3"
                  class="animate-dash opacity-50" />
                <path
                  pathLength="100"
                  :stroke-dasharray="`${votingProgress} 200`"
                  d="M12 26c7-6 24 7 41 0C75 17 42-5 74 3c24 7 20 22 9 23-32 7 49 45-48 48-49 3-45 54 14 32 48-12 29 9 57 2 37-11 29 1 48 3"
                  class="stroke-2 text-emerald-500 dark:text-emerald-400" />
                <path d="M9 26a3 3 0 10.1 0" fill="currentColor" stroke="none" class="text-emerald-700 dark:text-emerald-400" />
                <path v-if="finalEpoch" d="M5 103a3 3 0 10.1 0" fill="currentColor" stroke="currentColor" class="text-emerald-700 dark:text-emerald-400" />
                <path v-if="votingProgress < 100" d="M157 110a3 3 0 10.1 0" pathLength="8" stroke-dasharray="1 1" class="opacity-50" />
                <path v-else d="M157 110a3 3 0 10.1 0" fill="currentColor" stroke="currentColor" class="text-emerald-700 dark:text-emerald-400" />
              </svg>
              <!-- <div class="-mt-12 text-center text-2xs opacity-70">
                {{ finalEpoch ? t('epoch') + ' ' + formatNumber(finalEpoch) : '' }}
              </div> -->
              <FinishIcon
                v-if="status != 'active'"
                class="absolute bottom-6 size-4 text-emerald-700 dark:text-emerald-400"
                :class="actionEpoch ? 'right-0' : 'left-3'" />
            </div>
            <div class="place-content-end" :class="actionEpoch ? null : status == 'active' ? 'opacity-70' : 'opacity-30'">
              <ActionStatus v-if="actionEpoch" type="infoaction" :expired_epoch="actionEpoch" :dropped_epoch="actionEpoch" />
              <template v-else>
                {{ t(finalEpoch ? 'completed' : 'deadline') }}
              </template>
            </div>
          </div>
          <div class="mt-1 flex text-xs">
            <template v-if="status != 'active'">
              <div :class="actionEpoch ? 'opacity-30' : 'opacity-70'">
                {{ formatDateTime(getEpochStartTime(finalEpoch)) }}
              </div>
              <div class="ml-auto" :class="actionEpoch ? 'opacity-70' : 'opacity-30'">
                {{ formatDateTime(getEpochStartTime(actionEpoch || finalEpoch + 1)) }}
              </div>
            </template>
            <div v-else class="-mt-1 ml-auto text-amber-700 dark:text-orange-300">{{ formatDateTime(expiryTime) }}</div>
          </div>
          <div v-if="!finalEpoch" class="absolute top-5 right-3 perspective-normal perspective-origin-bottom-left">
            <I18nT
              tag="div"
              keypath="time.left"
              class="rotate-x-25 -rotate-y-5 rounded-lg border-2 px-2 pt-1 pb-0.5 text-center text-base leading-5 font-bold text-emerald-400 uppercase dark:text-emerald-600">
              <template #time>
                <div class="mb-0.5 -ml-5 rounded-md bg-violet-500 p-1 px-2 text-gray-100 dark:bg-violet-600">
                  {{ t('n.' + timeLeft.unit, timeLeft.num) }}
                </div>
              </template>
            </I18nT>
          </div>
        </div>
      </div>

      <VCard class="order-3 pb-6 md:pb-6 xl:pb-6" dark :key="k" v-for="(k, i) in chartTypes">
        <div class="relative flex pb-6 text-lg font-semibold">
          {{ t('poll.by.' + k) }}
          <VSwitcher
            class="mt-1 ml-auto"
            :model-value="Boolean(chartsCollapsed[k])"
            @update:modelValue="($event) => (chartsCollapsed[k] = $event ? 'collapsed_' : '')" />
          <div class="absolute -top-3.5 right-1 text-3xs font-normal opacity-80">{{ t('poll.group') }}</div>
        </div>

        <template :key="j" v-for="(answer, j) of chartsData.answers">
          <div class="relative mb-3">
            <div class="overflow-hidden rounded-md bg-sky-50 dark:bg-gray-800">
              <div
                class="h-4 md:h-5 dark:opacity-70"
                :class="answerClasses[j]"
                :style="{ width: 'max(0.5rem, ' + answer[`${chartsCollapsed[k]}${k}_percent`] + '%)' }"></div>
            </div>
            <div
              class="absolute -top-0.5 left-0 h-5 rounded-md rounded-r-xs md:h-6"
              :class="answerClasses[j]"
              :style="{ width: 'max(0.25rem, ' + answer[`${chartsCollapsed[k]}${k}_cluster_percent`] + '%)' }"></div>
            <div class="absolute inset-0 flex justify-between gap-2 p-0.5 px-2 text-xs">
              <div class="flex-1 truncate font-light">{{ chartsCollapsed[k] ? answer.collapsed : answer.name }}</div>
              <div class="flex gap-1">
                <VTooltip v-if="i == 0 || i == 2">
                  {{ formatToken(formatValue(answer[chartsCollapsed[k] + k])) }}
                  <template #tooltip>
                    <div>{{ t('pool.multi') }}: {{ formatToken(formatValue(answer[chartsCollapsed[k] + k + '_cluster'])) }}</div>
                    <div>{{ t('pool.single') }}: {{ formatToken(formatValue(answer[chartsCollapsed[k] + k + '_single'])) }}</div>
                  </template>
                </VTooltip>
                <VTooltip v-else>
                  {{ formatNumber(answer[chartsCollapsed[k] + k]) }}
                  <template #tooltip>
                    <div>{{ t('pool.multi') }}: {{ formatNumber(answer[chartsCollapsed[k] + k + '_cluster']) }}</div>
                    <div>{{ t('pool.single') }}: {{ formatNumber(answer[chartsCollapsed[k] + k + '_single']) }}</div>
                  </template>
                </VTooltip>
                /
                <VTooltip>
                  {{ formatPercent(answer[chartsCollapsed[k] + k + '_ratio'], 1) }}
                  <template #tooltip>
                    <div>
                      {{ t('pool.multi') }}: {{ formatPercent(answer[chartsCollapsed[k] + k + '_cluster_ratio_option'], 1) }} ({{
                        formatPercent(answer[chartsCollapsed[k] + k + '_cluster_ratio'], 1)
                      }})
                    </div>
                    <div>
                      {{ t('pool.single') }}: {{ formatPercent(answer[chartsCollapsed[k] + k + '_single_ratio_option'], 1) }} ({{
                        formatPercent(answer[chartsCollapsed[k] + k + '_single_ratio'], 1)
                      }})
                    </div>
                  </template>
                </VTooltip>
              </div>
            </div>
          </div>
        </template>

        <div class="mt-8 grid auto-rows-min grid-cols-[1fr_auto_1fr] gap-x-2 text-2xs text-gray-500 dark:text-gray-400">
          <div class="row-span-2 row-start-2 -mt-1 min-w-0 text-right leading-3">
            {{ t('operators.multi') }}
          </div>

          <div class="relative col-start-2 row-start-2 flex gap-1 px-2 whitespace-nowrap">
            {{ t(['stake.total', 'pools.total', 'pledge.total', 'delegators.total', 'total_spos'][i]!) }}:
            <VTooltip v-if="i == 0 || i == 2" class="font-medium text-gray-900 dark:text-gray-100">
              {{ formatToken(formatValue(chartsData[k])) }}
              <template #tooltip>
                <div>
                  {{ t('pool.multi') }}: {{ formatToken(formatValue(chartsData[`${k}_cluster`])) }} ({{ formatPercent(chartsData[`${k}_cluster_ratio`], 1) }})
                </div>
                <div>
                  {{ t('pool.single') }}: {{ formatToken(formatValue(chartsData[`${k}_single`])) }} ({{ formatPercent(chartsData[`${k}_single_ratio`], 1) }})
                </div>
              </template>
            </VTooltip>
            <VTooltip v-else class="font-medium text-gray-900 dark:text-gray-100">
              {{ formatNumber(chartsData[k]) }}
              <template #tooltip>
                <div>{{ t('pool.multi') }}: {{ formatNumber(chartsData[`${k}_cluster`]) }} ({{ formatPercent(chartsData[`${k}_cluster_ratio`], 1) }})</div>
                <div>{{ t('pool.single') }}: {{ formatNumber(chartsData[`${k}_single`]) }} ({{ formatPercent(chartsData[`${k}_single_ratio`], 1) }})</div>
              </template>
            </VTooltip>
            <div
              class="pointer-events-none absolute -top-1 left-0 h-6 rounded-md rounded-r-xs border border-r-0"
              :style="{ width: chartsData[`${k}_cluster_ratio`] * 100 + '%' }">
              <svg viewBox="0 0 40 16" fill="none" stroke="currentColor" class="absolute -top-4 -left-8 h-4 w-10">
                <path d="M1 13C6-7 32 2 38 12" stroke-dasharray="3 3" />
                <path d="M35 10l2-2 1 4Z" fill="currentColor" />
              </svg>
            </div>
            <div
              class="pointer-events-none absolute -top-0.5 right-0 h-5 rounded-r-md border border-l-0"
              :style="{ width: chartsData[`${k}_single_ratio`] * 100 + '%' }">
              <svg viewBox="0 0 40 16" fill="none" stroke="currentColor" class="absolute -right-8 -bottom-4 h-4 w-10">
                <path d="M39 3C34 23 8 14 2 4" stroke-dasharray="3 3" />
                <path d="m5 6-2 2-1-4Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div class="col-start-3 row-span-2 row-start-1 flex min-w-0 items-end leading-3">
            {{ t('operators.single') }}
          </div>
        </div>
      </VCard>

      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-3">
        <DataGridSectionHeader class="mb-2 max-w-max">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('poll.hash') }}
        </DataGridSectionHeader>
        <div class="flex items-center text-sm">
          <TextTruncate :text="data.hash" class="text-slate-500 dark:text-gray-300" highlight="font-medium text-amber-500 dark:text-amber-400" />
          <CopyToClipboard :text="data.hash" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #votes>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #pool="{ row: { name, hash, bech32, ticker } }">
            <DataListPool :name="name" :bech32="bech32" :hash="hash" :ticker="ticker" />
          </template>
          <template #vote="{ row: { answer, answer_code, msg } }">
            <VoteLabel :vote="answer" :comment="msg" :color-class="voteClasses[answer_code]" />
          </template>
          <template #tx="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #ada="{ id, row }">
            {{ formatToken(formatValue(row[id])) }}
          </template>
          <template #delegator="{ row: { delegator } }">
            {{ formatNumber(delegator) }}
          </template>
          <template #leverage="{ row: { leverage } }">
            {{ leverage === Infinity ? 'Infinity' : formatPercent(leverage) }}
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="data.votes?.rows?.length ?? 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ `There are no transactions in this block` }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'

import FinishIcon from '@/assets/icons/finish.svg?component'
import VotesIcon from '@/assets/icons/votes.svg?component'

import { t } from '@/i18n'
import { lastSyncTime, useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatDateTime, formatNumber, formatPercent, formatToken, formatValue } from '@/utils/formatter'
import { getEpochEndTime, getEpochStartTime, getTabData, getTableCols, getTimeLeft } from '@/utils/helper'
import { limit } from '@/utils/settings'

import ActionStatus from '@/components/ActionStatus.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataPagination from '@/components/DataPagination.vue'
// import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import VCard from '@/components/VCard.vue'
import VSwitcher from '@/components/VSwitcher.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'
import VoteLabel from '@/components/VoteLabel.vue'

type TabId = keyof typeof tabData

const statusColors = {
  closed: 'text-violet-500 dark:text-violet-400',
  completed: 'text-indigo-500 dark:text-indigo-400',
  active: 'text-sky-500 dark:text-sky-400',
}

const answerClasses = [
  'bg-amber-300 dark:bg-yellow-600',
  'bg-lime-300 dark:bg-lime-700',
  'bg-teal-300 dark:bg-teal-600',
  'bg-sky-300 dark:bg-sky-700',
  'bg-slate-300 dark:bg-gray-600',
  'bg-rose-300 dark:bg-red-400',
]

const voteClasses = [
  'bg-amber-300 dark:bg-yellow-600',
  'bg-lime-300 dark:bg-lime-600',
  'bg-teal-300 dark:bg-teal-600',
  'bg-sky-300 dark:bg-sky-600',
  'bg-slate-300 dark:bg-gray-400',
  'bg-rose-300 dark:bg-red-400',
]

const tabData = getTabData({
  votes: {
    icon: VotesIcon,
    colList: [
      { id: 'pool' },
      { id: 'vote' },
      { id: 'tx' },
      { id: 'live_stake', slot: 'ada' },
      { id: 'delegator' },
      { id: 'pledge', slot: 'ada' },
      { id: 'leverage' },
    ],
    sortKeyMap: {
      tx: 'tx_time',
      live_stake: 'live_stake',
      delegator: 'delegator',
      pledge: 'pledge',
      leverage: 'leverage',
    },
  },
})

const {
    route,
    errorCode,
    data,
    sortPoint,
    sortKey,
    sortDir,
    sortHandling,
    rows,
    rowsType,
    setRowsType,
    setApiRows,
    pageCount,
    moreHandling,
    moreHandler,
    sortHandler,
    socketDataHandler,
  } = useViewApi(),
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value)

let sortedRows: typeof rows.value

const getSortedRows = (tabId = tab.value!) => {
  const _data = data.value!,
    sortField = tabData[tabId].sortKeyMap[sortKey.value]

  sortedRows = _data[tabId]?.rows || []

  if (sortField) {
    const retVal = sortDir.value == 'desc' ? -1 : 1
    sortedRows.sort((a, b) => {
      return a[sortField] == b[sortField] ? 0 : Number(a[sortField]) > Number(b[sortField]) ? retVal : -retVal
    })
  }

  return sortedRows.slice(0, limit.value)
}

const setTabRows = () => {
  tabRows.value = rows.value

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows(() => getSortedRows(tabId))

  tab.value = tabId
}

const onTabChange = async () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.poll.' + tabValue,
      slot: col.slot || col.id,
      sort: sortKeyMap?.[col.id],
    }))
  )

  setTabRows()

  if (route.meta.api?.scrollPosition) {
    await nextTick()

    window.scrollTo(route.meta.api.scrollPosition)

    route.meta.api.scrollPosition = undefined
  }
}

const onSort = async (newKey: string) => {
  await sortHandler(newKey, getSortedRows, setTabRows)
}

const onShowMore = async () => {
  await moreHandler(() => sortedRows.slice(pageCount.value * limit.value, (pageCount.value + 1) * limit.value), setTabRows)
}
const finalEpoch = computed(() => {
  const _data = data.value!

  return _data.phase2_epoch
})

const actionEpoch = computed(() => {
  const _data = data.value!

  return _data.phase3_epoch
})

const expiryTime = computed(() => getEpochEndTime(data.value!.phase2_epoch - 1))

const status = computed<keyof typeof statusColors>(() => {
  const _data = data.value!

  return _data.phase3_epoch ? 'completed' : _data.phase2_epoch ? 'closed' : 'active'
})

const votingProgress = computed<number>(() => {
  const _data = data.value!

  let val = 0

  if (actionEpoch.value) {
    val = 100
  } else if (finalEpoch.value) {
    const point = 64, // point position for ratified/expired epoch
      endEpochTime = getEpochEndTime(finalEpoch.value - 1),
      timing = lastSyncTime.value - endEpochTime,
      duration = getEpochEndTime(finalEpoch.value) - endEpochTime

    val = Math.floor(point + (timing / duration) * (100 - point))
  } else {
    const timing = lastSyncTime.value - _data.tx_time,
      duration = expiryTime.value - _data.tx_time

    val = Math.floor((timing / duration) * 100)
  }

  return val
})

const timeLeft = computed(() => getTimeLeft(expiryTime.value - lastSyncTime.value))

const snapshot = false

// const poolData: {
//   list: Record<string, any>
//   filteredList: Record<string, any>
// } = {
//   list: {},
//   filteredList: {},
// }

// const filter = reactive({
//   answer: '',
//   search: '',
//   search_all: false,
// })

// const fSearch = computed(() => filter.search.trim().toLowerCase())

// const checkPoolFilter = (pool: any) => {
//   if (filter.answer !== '' && pool.answer != filter.answer) {
//     return false
//   }

//   if (fSearch.value.length < 3 || pool.ticker.toLowerCase().indexOf(fSearch.value) >= 0) {
//     return true
//   }

//   return filter.search_all && pool.name.toLowerCase().indexOf(fSearch.value) >= 0
// }

const chartTypes = ['stake', 'pool', 'pledge', 'delegator', 'operator'] as const

const chartsData = reactive({
  answers: [] as any[],
  stake: 0,
  pool: 0,
  pledge: 0,
  delegator: 0,
  operator: 0,
  stake_cluster: 0,
  pool_cluster: 0,
  pledge_cluster: 0,
  delegator_cluster: 0,
  operator_cluster: 0,
  stake_single: 0,
  pool_single: 0,
  pledge_single: 0,
  delegator_single: 0,
  operator_single: 0,

  stake_cluster_ratio: 0,
  pool_cluster_ratio: 0,
  pledge_cluster_ratio: 0,
  delegator_cluster_ratio: 0,
  operator_cluster_ratio: 0,
  stake_single_ratio: 0,
  pool_single_ratio: 0,
  pledge_single_ratio: 0,
  delegator_single_ratio: 0,
  operator_single_ratio: 0,
})

const chartsCollapsed = reactive({
  stake: '',
  pool: '',
  pledge: '',
  delegator: '',
  operator: '',
})

const initChartData = () => {
  const _data = data.value

  if (_data) {
    const answers = _data.answers,
      short_answers = _data.short_answers || answers,
      collapsed_answers = _data.collapsed_answers || answers,
      collapsed_keys = _data.collapsed_keys

    chartsData.answers = []

    for (const k of chartTypes) {
      chartsData[k] = 0
      chartsData[`${k}_cluster`] = 0
      chartsData[`${k}_single`] = 0

      chartsCollapsed[k] = ''
    }

    if (Array.isArray(_data.votes?.rows)) {
      const pollBy: any = {
          stake: {},
          pool: {},
          pledge: {},
          delegator: {},
          operator: {},
          collapsed_stake: {},
          collapsed_pool: {},
          collapsed_pledge: {},
          collapsed_delegator: {},
          collapsed_operator: {},

          stake_cluster: {},
          pool_cluster: {},
          pledge_cluster: {},
          delegator_cluster: {},
          operator_cluster: {},
          collapsed_stake_cluster: {},
          collapsed_pool_cluster: {},
          collapsed_pledge_cluster: {},
          collapsed_delegator_cluster: {},
          collapsed_operator_cluster: {},
        },
        cluster: any = {}

      let invalidAnswer

      for (const r of _data.votes.rows) {
        if (!r.isInit) {
          r.live_stake = +r.live_stake
          r.owner_stake = +r.owner_stake
          r.margin = +r.margin
          r.fixed_cost = +r.fixed_cost
          r.pledge = +r.pledge

          r.snapshot_live_stake = +r.snapshot_live_stake
          r.snapshot_owner_stake = +r.snapshot_owner_stake
          r.snapshot_margin = +r.snapshot_margin
          r.snapshot_fixed_cost = +r.snapshot_fixed_cost
          r.snapshot_pledge = +r.snapshot_pledge

          // let msg = [],
          //     rawMsg = []
          // try {
          //   for (let m of r.msg) {
          //     msg.push(escapeHtml(toDisplayString(m)))
          //     rawMsg.push(toDisplayString(m))
          //   }
          // } catch {}
          // r.origMsg = r.msg
          // r.msg = msg.join('<br/>')
          // r.rawMsg = rawMsg.join(' ')
          // if (r.hash == '1d9302a3fb4b3b1935e02b27f0339798d3f08a55fbfdcd43a449a96f') {
          // r.answer = 12
          // }
          if (answers[r.answer]) {
            r.answer_code = r.answer
            r.answer = short_answers[r.answer]
          } else {
            invalidAnswer = 'filter.invalid_answer'
            r.answer_code = answers.length
            r.answer = invalidAnswer
          }
          r.vote_time = +r.vote_time

          // r.ticker = (r.ticker || '').trim()
          // r.name = (r.name || '').trim()

          r.leverage = r.pledge > 0 ? r.live_stake / r.pledge : Infinity
          if (r.leverage > 0 && r.leverage < 10) {
            r.leverage = Math.round(r.leverage * 10) / 10
          } else if (r.leverage !== Infinity) {
            r.leverage = Math.round(r.leverage)
          }

          r.snapshot_leverage = r.snapshot_pledge > 0 ? r.snapshot_live_stake / r.snapshot_pledge : Infinity
          if (r.snapshot_leverage > 0 && r.snapshot_leverage < 10) {
            r.snapshot_leverage = Math.round(r.snapshot_leverage * 10) / 10
          } else if (r.snapshot_leverage !== Infinity) {
            r.snapshot_leverage = Math.round(r.snapshot_leverage)
          }

          r.live_live_stake = r.live_stake
          r.live_owner_stake = r.owner_stake
          r.live_margin = r.margin
          r.live_fixed_cost = r.fixed_cost
          r.live_pledge = r.pledge
          r.live_delegator = r.delegator
          r.live_leverage = r.leverage

          r.isInit = true
        }

        const prefix = snapshot ? 'snapshot_' : 'live_'
        for (const prop of ['live_stake', 'owner_stake', 'margin', 'fixed_cost', 'pledge', 'delegator', 'leverage']) {
          r[prop] = r[prefix + prop]
        }

        // poolData.list[r.hash] = r

        if (!(r.answer_code in pollBy.pool)) {
          for (const k of chartTypes) {
            pollBy[k][r.answer_code] = 0
            pollBy[`${k}_cluster`][r.answer_code] = 0
          }
        }

        pollBy.stake[r.answer_code] += r.live_stake
        pollBy.pool[r.answer_code] += 1
        pollBy.pledge[r.answer_code] += r.pledge
        pollBy.delegator[r.answer_code] += r.delegator

        if (r.cluster != null) {
          pollBy.stake_cluster[r.answer_code] += r.live_stake
          pollBy.pool_cluster[r.answer_code] += 1
          pollBy.pledge_cluster[r.answer_code] += r.pledge
          pollBy.delegator_cluster[r.answer_code] += r.delegator

          if (!cluster[r.cluster] || !cluster[r.cluster][r.answer_code]) {
            pollBy.operator[r.answer_code] += 1
            pollBy.operator_cluster[r.answer_code] += 1
          }
        } else {
          pollBy.operator[r.answer_code] += 1
        }

        if (collapsed_keys) {
          if (!collapsed_keys[r.answer_code]) {
            collapsed_keys[r.answer_code] = [r.answer_code]
          }
          for (const answer_code of collapsed_keys[r.answer_code]) {
            if (!(answer_code in pollBy.collapsed_pool)) {
              for (const k of chartTypes) {
                pollBy[`collapsed_${k}`][answer_code] = 0
                pollBy[`collapsed_${k}_cluster`][answer_code] = 0
              }
            }
            pollBy.collapsed_stake[answer_code] += r.live_stake
            pollBy.collapsed_pool[answer_code] += 1
            pollBy.collapsed_pledge[answer_code] += r.pledge
            pollBy.collapsed_delegator[answer_code] += r.delegator

            if (r.cluster != null) {
              pollBy.collapsed_stake_cluster[answer_code] += r.live_stake
              pollBy.collapsed_pool_cluster[answer_code] += 1
              pollBy.collapsed_pledge_cluster[answer_code] += r.pledge
              pollBy.collapsed_delegator_cluster[answer_code] += r.delegator

              if (!cluster[r.cluster] || !cluster[r.cluster][`collapsed_${answer_code}`]) {
                pollBy.collapsed_operator[answer_code] += 1
                pollBy.collapsed_operator_cluster[answer_code] += 1
              }
            } else {
              pollBy.collapsed_operator[answer_code] += 1
            }
          }
        }

        chartsData.stake += r.live_stake
        chartsData.pool += 1
        chartsData.pledge += r.pledge
        chartsData.delegator += r.delegator

        if (r.cluster != null) {
          chartsData.stake_cluster += r.live_stake
          chartsData.pool_cluster += 1
          chartsData.pledge_cluster += r.pledge
          chartsData.delegator_cluster += r.delegator

          if (!cluster[r.cluster]) {
            chartsData.operator += 1
            chartsData.operator_cluster += 1
            cluster[r.cluster] = {}
          }

          cluster[r.cluster][r.answer_code] = true
          if (collapsed_keys) {
            for (const answer_code of collapsed_keys[r.answer_code]) {
              cluster[r.cluster][`collapsed_${answer_code}`] = true
            }
          }
        } else {
          chartsData.operator += 1
        }
      }

      if (invalidAnswer) {
        answers.push(invalidAnswer)
        short_answers.push(invalidAnswer)
        collapsed_answers.push(invalidAnswer)
      }

      for (let i = 0; i < answers.length; i++) {
        const a: any = {
          name: answers[i],
          short: short_answers[i],
          collapsed: collapsed_answers[i],
        }

        for (const k of chartTypes) {
          a[k] = pollBy[k][i] || 0
          a[k + '_ratio'] = chartsData[k] ? a[k] / chartsData[k] : 0
          a[k + '_percent'] = Math.floor(a[k + '_ratio'] * 1000) / 10

          a[k + '_cluster'] = pollBy[k + '_cluster'][i] || 0
          a[k + '_cluster_ratio'] = chartsData[k] ? a[k + '_cluster'] / chartsData[k] : 0
          a[k + '_cluster_ratio_option'] = a[k] ? a[k + '_cluster'] / a[k] : 0
          a[k + '_cluster_percent'] = Math.floor(a[k + '_cluster_ratio'] * 1000) / 10

          a[k + '_single'] = a[k] - a[k + '_cluster']
          a[k + '_single_ratio'] = a[k + '_ratio'] - a[k + '_cluster_ratio']
          a[k + '_single_ratio_option'] = 1 - a[k + '_cluster_ratio_option']
          a[k + '_single_percent'] = a[k + '_percent'] - a[k + '_cluster_percent']

          if (collapsed_keys) {
            a['collapsed_' + k] = pollBy['collapsed_' + k][i] || 0
            a['collapsed_' + k + '_ratio'] = chartsData[k] ? a['collapsed_' + k] / chartsData[k] : 0
            a['collapsed_' + k + '_percent'] = Math.floor(a['collapsed_' + k + '_ratio'] * 1000) / 10

            a['collapsed_' + k + '_cluster'] = pollBy['collapsed_' + k + '_cluster'][i] || 0
            a['collapsed_' + k + '_cluster_ratio'] = chartsData[k] ? a['collapsed_' + k + '_cluster'] / chartsData[k] : 0
            a['collapsed_' + k + '_cluster_ratio_option'] = a['collapsed_' + k] ? a['collapsed_' + k + '_cluster'] / a['collapsed_' + k] : 0
            a['collapsed_' + k + '_cluster_percent'] = Math.floor(a['collapsed_' + k + '_cluster_ratio'] * 1000) / 10

            a['collapsed_' + k + '_single'] = a['collapsed_' + k] - a['collapsed_' + k + '_cluster']
            a['collapsed_' + k + '_single_ratio'] = a['collapsed_' + k + '_ratio'] - a['collapsed_' + k + '_cluster_ratio']
            a['collapsed_' + k + '_single_ratio_option'] = 1 - a['collapsed_' + k + '_cluster_ratio_option']
            a['collapsed_' + k + '_single_percent'] = a['collapsed_' + k + '_percent'] - a['collapsed_' + k + '_cluster_percent']
          }

          chartsData[`${k}_single`] += a[`${k}_single`]
        }

        chartsData.answers.push(a)
      }

      for (const k of chartTypes) {
        if (chartsData[k]) {
          chartsData[`${k}_cluster_ratio`] = chartsData[`${k}_cluster`] / chartsData[k]
          chartsData[`${k}_single_ratio`] = 1 - chartsData[`${k}_cluster_ratio`]
        } else {
          chartsData[`${k}_cluster_ratio`] = 0
          chartsData[`${k}_single_ratio`] = 0
        }
      }
    }
  }
}

watch(
  () => data.value?.hash,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      initChartData()

      tabs.value = []
      for (const [id, { icon, name }] of Object.entries(tabData)) {
        tabs.value.push({
          id,
          icon,
          name,
        })
      }

      tab.value = rowsType.value as typeof tab.value

      if (tab.value) {
        // history navigation
        getSortedRows()
        onTabChange()
      }
    }
  },
  {
    immediate: true,
  }
)

socketDataHandler.pause()
</script>
