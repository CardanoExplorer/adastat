<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1">
        <h1 class="truncate text-2xl font-medium">
          {{ t(`policy.${data.nft ? 'nft' : 'token'}`) }}
        </h1>
      </div>
      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="activity.last">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.last_tx_hash } }"
              class="text-amber-700 underline dark:text-orange-300"
              >{{ formatDateTime(data.last_tx_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow title="activity.first">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.first_tx_hash } }"
              class="text-indigo-700 underline dark:text-indigo-400"
              >{{ formatDateTime(data.first_tx_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow title="tokens">
            {{ formatNumber(data.token) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="holders">
            {{ formatNumber(data.holder) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="transactions">
            {{ formatNumber(data.tx) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="minting_burning">
            <div
              v-if="data.script_type.startsWith('plutus')"
              class="bg-linear-to-r from-indigo-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
              {{ t(`script.type.${data.script_type.replace('plutus', '')}`) }}
            </div>
            <div v-else-if="data.locked" class="text-up-500 dark:text-up-400">{{ t('not_available') }}</div>
            <div v-else class="text-down-500 dark:text-down-400">{{ t('available') }}</div>
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('policy.id') }}
        </DataGridSectionHeader>
        <div class="flex items-center text-sm">
          <TextTruncate
            :text="data.hash"
            class="text-slate-500 dark:text-gray-300"
            highlight="font-medium text-amber-500 dark:text-amber-400" />
          <CopyToClipboard :text="data.hash" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
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
          <template #token="{ row: { fingerprint, name, ticker, asset_name, asset_name_hex, image, genuine } }">
            <DataListToken
              :fingerprint="fingerprint"
              :name="name"
              :ticker="ticker"
              :asset_name="asset_name"
              :asset_name_hex="asset_name_hex"
              :image="image"
              :genuine="genuine" />
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

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`policy.no_tokens`) }}</div>
      </template>

      <template #transactions>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #transaction="{ row: { tx_hash } }">
            <RouterLink
              :to="{ name: 'transaction', params: { id: tx_hash } }"
              class="block w-40 max-w-[30vw] font-sans font-medium">
              <TextTruncate :text="tx_hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #time="{ row: { time } }">
            <DataListTimeAgo :time="time" />
          </template>
          <template #epoch_slot="{ row: { epoch_no, epoch_slot_no } }">
            <RouterLink
              :to="{ name: 'epoch', params: { id: epoch_no } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400">
              {{ formatNumber(epoch_no) }}
            </RouterLink>
            / <span class="text-xs font-normal">{{ formatNumber(epoch_slot_no) }}</span>
          </template>
          <template #block_index="{ row: { block_no, block_hash, block_index } }">
            <RouterLink
              :to="{ name: 'block', params: { id: block_hash } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400"
              >{{ formatNumber(block_no) }}</RouterLink
            >
            / <span class="text-xs font-normal">{{ formatNumber(block_index) }}</span>
          </template>
          <template #num="{ id, row }">
            {{ formatNumber(row[id]) }}
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
      </template>

      <template #holders>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.stake_base16 || row.address"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #holder="{ row: { stake_base16, stake_bech32, balance, address } }">
            <DataListHolder :bech32="stake_bech32 || address" :base16="stake_base16" :balance="balance" />
          </template>
          <template #token="{ row: { token } }">
            {{ formatNumber(token) }}
            <PercentFilled :value="token" :max="data.token" :fraction-digits="2" class="mt-1" />
          </template>
          <template #pool="{ row: { pool_bech32, pool_hash, pool_name, pool_ticker } }">
            <DataListPool :name="pool_name" :bech32="pool_bech32" :hash="pool_hash" :ticker="pool_ticker" />
          </template>
          <template #drep="{ row: { drep_bech32, drep_base16, drep_given_name, drep_image } }">
            <DataListDRep :name="drep_given_name" :bech32="drep_bech32" :base16="drep_base16" :image="drep_image" />
          </template>
          <template #balance="{ row: { balance } }">
            <TooltipAmount :value="balance" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`token.no_holders`) }}</div>
      </template>

      <template #minting>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #transaction="{ row: { tx_hash } }">
            <RouterLink
              :to="{ name: 'transaction', params: { id: tx_hash } }"
              class="block w-40 max-w-[30vw] font-sans font-medium">
              <TextTruncate :text="tx_hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #time="{ row: { time } }">
            <DataListTimeAgo :time="time" />
          </template>
          <template #epoch_slot="{ row: { epoch_no, epoch_slot_no } }">
            <RouterLink
              :to="{ name: 'epoch', params: { id: epoch_no } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400">
              {{ formatNumber(epoch_no) }}
            </RouterLink>
            / <span class="text-xs font-normal">{{ formatNumber(epoch_slot_no) }}</span>
          </template>
          <template #block_index="{ row: { block_no, block_hash, block_index } }">
            <RouterLink
              :to="{ name: 'block', params: { id: block_hash } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400"
              >{{ formatNumber(block_no) }}</RouterLink
            >
            / <span class="text-xs font-normal">{{ formatNumber(block_index) }}</span>
          </template>
          <template #num="{ id, row }">
            {{ formatNumber(row[id]) }}
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
      </template>

      <template #script>
        <div class="mt-5 text-sm">
          <template v-if="data.script_type.startsWith('plutus')">
            <div class="flex items-center gap-2 p-2 sm:gap-4 sm:px-4">
              <div class="flex items-center gap-3 text-slate-500 dark:text-gray-300">
                {{ t(`script.type.${data.script_type.replace('plutus', '')}`) }}
                <div>•</div>
                <div class="text-s">{{ formatBytes(data.script.length / 2, 'byte') }}</div>
              </div>
              <DownloadString :text="data.script" :name="data.hash" ext="plutus" class="text-c5 ml-auto h-4 w-4" />
              <CopyToClipboard :text="data.script" class="text-c5 h-4 w-4" />
            </div>
            <div class="overflow-x-auto rounded-lg bg-sky-100/50 p-2 px-3 py-2 font-mono sm:p-4 dark:bg-gray-800/50">
              <div class="wrap-anywhere" :style="{ width: `${Math.ceil(data.script.length / 16)}ch` }">
                {{ data.script }}
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-2 p-2 sm:gap-4 sm:px-4">
              <div class="flex items-center text-slate-500 dark:text-gray-300">
                {{ t('script.type.v0') }}
                <button
                  class="relative ml-3 grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-s leading-3 text-slate-800 dark:bg-gray-800 dark:text-gray-300">
                  <div
                    class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                    :class="
                      !scriptPretty
                        ? 'translate-x-full bg-gray-400 dark:bg-gray-500'
                        : 'bg-violet-400 dark:bg-violet-500'
                    "></div>
                  <small class="z-1 px-1" @click="scriptPretty = true">Pretty</small>
                  <small class="z-1 px-1" @click="scriptPretty = false">Raw</small>
                </button>
              </div>
              <DownloadString
                :text="JSON.stringify(data.script, null, scriptPretty ? 2 : 0)"
                :name="data.hash"
                class="text-c5 ml-auto h-4 w-4" />
              <CopyToClipboard
                :text="JSON.stringify(data.script, null, scriptPretty ? 2 : 0)"
                class="text-c5 h-4 w-4" />
            </div>
            <div class="rounded-lg bg-sky-100/50 p-2 px-3 py-2 sm:p-4 dark:bg-gray-800/50">
              <component
                :is="scriptPretty ? 'pre' : 'div'"
                :class="scriptPretty ? 'overflow-x-auto font-mono' : 'line-clamp-5'">
                {{ data.script }}
              </component>
            </div>
          </template>
        </div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import CoinsIcon from '@/assets/icons/coins.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import MenuTokensIcon from '@/assets/icons/menu_tokens.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'
import NFTsIcon from '@/assets/icons/nfts.svg?component'
import PlutusIcon from '@/assets/icons/plutus.svg?component'
import ScriptIcon from '@/assets/icons/script.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatBytes, formatDateTime, formatNumber } from '@/utils/formatter'
import { getTabData, getTableCols } from '@/utils/helper'

import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeAgo from '@/components/DataListTimeAgo.vue'
import DataListToken from '@/components/DataListToken.vue'
import DataPagination from '@/components/DataPagination.vue'
import DownloadString from '@/components/DownloadString.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  tokens: {
    icon: NFTsIcon,
    colList: [
      { id: 'token' },
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
  transactions: {
    icon: MenuTransactionsIcon,
    colList: [
      { id: 'transaction' },
      { id: 'time' },
      { id: 'token', slot: 'num' },
      { id: 'epoch_slot' },
      { id: 'slot_no', slot: 'num' },
      { id: 'block_index' },
    ],
    sortKeyMap: {
      transaction: 'time',
      time: 'time',
      epoch_slot: 'time',
      slot_no: 'time',
      block_index: 'time',
    },
  },
  holders: {
    icon: HoldersIcon,
    colList: [{ id: 'holder' }, { id: 'token' }, { id: 'balance' }, { id: 'pool' }, { id: 'drep' }],
    sortKeyMap: {
      token: 'token',
    },
  },
  minting: {
    name: 'minting_burning',
    icon: CoinsIcon,
    colList: [
      { id: 'transaction' },
      { id: 'time' },
      { id: 'token', slot: 'num' },
      { id: 'epoch_slot' },
      { id: 'slot_no', slot: 'num' },
      { id: 'block_index' },
    ],
    sortKeyMap: {
      transaction: 'time',
      time: 'time',
      epoch_slot: 'time',
      slot_no: 'time',
      block_index: 'time',
    },
  },
  script: {
    icon: PlutusIcon,
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
    updateRows,
    pageCount,
    moreHandling,
    moreHandler,
    sortHandler,
    nextPage,
  } = useViewApi(),
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value),
  scriptPretty = ref(true)

const setTabRows = (_rows = rows.value) => {
  tabRows.value = _rows

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows(tabId == 'script' ? () => [] : undefined)

  tab.value = tabId
}

const onTabChange = () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.policy.' + tabValue,
      slot: col.slot || col.id,
      sort: sortKeyMap?.[col.id],
    }))
  )

  setTabRows()
}

const onShowMore = async () => {
  await moreHandler(undefined, setTabRows)
}

const onSort = async (newKey: string) => {
  await sortHandler(newKey, undefined, setTabRows)
}

watch(
  () => data.value?.hash,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      const _data = data.value!

      tabData.tokens.icon = _data.nfts ? NFTsIcon : MenuTokensIcon
      tabData.script.icon = _data.script_type.startsWith('plutus') ? PlutusIcon : ScriptIcon

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
        onTabChange()

        route.meta.api?.restoreScroll?.()
      }
    }
  },
  {
    immediate: true,
  }
)

watch(
  () => data.value?.last_tx_time,
  () => {
    updateRows(setTabRows)
  }
)
</script>
