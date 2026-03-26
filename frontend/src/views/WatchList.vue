<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <template v-if="route.name == 'watchlist'">
      <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 @3xl:grid-cols-4">
        <MainCard
          class="border-b-blue-400 dark:border-b-sky-400/50"
          :icon="HoldersIcon"
          icon-class="text-slate-400 *:last:text-blue-500 dark:text-gray-200 dark:*:last:text-sky-500"
          title="accounts.stake"
          :value="formatNumber(data.accounts.rows.length)" />

        <MainCard
          class="border-b-amber-400 dark:border-b-amber-400/50"
          :icon="PoolsIcon"
          icon-class="text-slate-400 *:last:text-amber-500 dark:text-gray-200 dark:*:last:text-yellow-400"
          title="pools"
          :value="formatNumber(data.pools.rows.length)" />

        <MainCard
          class="border-b-up-400 dark:border-b-up-400/50"
          :icon="TokensIcon"
          icon-class="text-slate-400 *:last:text-green-500 dark:text-gray-200"
          title="tokens"
          :value="formatNumber(data.tokens.rows.length)" />

        <MainCard
          class="border-b-indigo-400 dark:border-b-indigo-400/50"
          :icon="DRepsIcon"
          icon-class="text-slate-400 *:last:text-indigo-400 dark:text-gray-200 dark:*:last:text-indigo-500"
          title="dreps"
          :value="formatNumber(data.dreps.rows.length)" />
      </div>

      <h1 class="mt-10 text-2xl font-medium capitalize">{{ t('watchlist') }}</h1>
      <div class="mt-2.5 text-s text-slate-600 dark:text-gray-400">{{ t('watchlist.desc') }}</div>
    </template>

    <VTabs v-if="tabs.length" :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange" class="mt-15">
      <template #accounts>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.base16"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
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
      </template>

      <template #pools>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.bech32"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
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
      </template>

      <template #tokens>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.fingerprint"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #watchlist="{ row: { fingerprint } }">
            <WatchlistToggle type="token" :data="fingerprint" class="mt-3.5 h-4 w-4" />
          </template>
          <template #token="{ row: { fingerprint, name, ticker, asset_name, asset_name_hex, image } }">
            <DataListToken
              :fingerprint="fingerprint"
              :name="name"
              :ticker="ticker"
              :asset_name="asset_name"
              :asset_name_hex="asset_name_hex"
              :image="image" />
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
      </template>

      <template #dreps>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.bech32"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
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
      </template>
    </VTabs>
    <div v-else-if="route.name == 'watchlist'" class="mt-4 text-s">
      <div class="text-slate-600 dark:text-gray-400">{{ t('watchlist.tip') }}</div>
      <div class="mt-12 flex">
        <BulbIcon class="mt-1 mr-3 size-7 text-yellow-500 dark:text-yellow-600" />
        <div>
          <div class="mb-0.5 font-medium">{{ t('good_to_know') }}</div>
          <div class="text-slate-600 dark:text-gray-400">
            {{ t('privacy_info') }}
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import BulbIcon from '@/assets/icons/bulb.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import DRepsIcon from '@/assets/icons/menu_dreps.svg?component'
import TokensIcon from '@/assets/icons/nfts.svg?component'
import PoolsIcon from '@/assets/icons/pools.svg?component'
import WarningIcon from '@/assets/icons/warning.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatNumber, formatPercent } from '@/utils/formatter'
import { getTabData, getTableCols } from '@/utils/helper'
import { limit } from '@/utils/settings'

import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeUntil from '@/components/DataListTimeUntil.vue'
import DataListToken from '@/components/DataListToken.vue'
import MainCard from '@/components/MainCard.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  accounts: {
    icon: HoldersIcon,
    colList: [
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
    sortKeyMap: {
      balance: 'balance',
      total_reward_amount: 'total_reward_amount',
      token: 'token',
      first_tx: 'first_tx',
      last_tx: 'last_tx',
      tx: 'tx',
    },
  },
  pools: {
    icon: PoolsIcon,
    colList: [
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
    sortKeyMap: {
      active_stake: 'active_stake',
      live_stake: 'live_stake',
      delegator: 'delegator',
      total_block: 'total_block',
      block: 'block',
      margin: 'margin',
      fixed_cost: 'fixed_cost',
      pledge: 'pledge',
      reward_amount: 'reward_amount',
      pool_fee: 'pool_fee',
      leverage: 'leverage',
      apr: 'apr',
    },
  },
  tokens: {
    icon: TokensIcon,
    colList: [
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
    sortKeyMap: {
      holder: 'holder',
      supply: 'supply',
      first_tx: 'first_tx',
      last_tx: 'last_tx',
      tx: 'tx',
    },
  },
  dreps: {
    icon: DRepsIcon,
    colList: [
      { id: 'watchlist' },
      { id: 'drep' },
      { id: 'delegator' },
      { id: 'live_stake' },
      { id: 'active_until' },
      { id: 'reg_time' },
    ],
    sortKeyMap: {
      reg_time: 'reg_time',
      delegator: 'delegator',
      live_stake: 'live_stake',
      active_until: 'active_until',
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
    sortHandler,
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
      name: 'table_cols.' + tabValue,
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

watch(
  data,
  (_data) => {
    if (_data) {
      tabs.value = []
      for (const [id, { icon, name }] of Object.entries(tabData)) {
        if (_data[id].rows.length) {
          tabs.value.push({
            id,
            icon,
            name,
          })
        }
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
</script>
