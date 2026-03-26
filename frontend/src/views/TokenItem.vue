<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1">
        <div class="flex items-center">
          <h1 class="truncate text-2xl font-medium">
            {{ t(data.nft ? 'nft' : 'token') }}
            <span v-if="data.ticker">{{ data.ticker }}</span>
          </h1>
          <WatchlistToggle type="token" :data="data.fingerprint" class="ml-auto h-9 w-9 p-2" />
        </div>
        <div class="line-clamp-2 h-15 text-xl font-medium text-sky-500 dark:text-sky-400">
          <a v-if="data.url" class="underline" :href="data.url" target="_blank" rel="noopener noreferrer nofollow">
            {{ data.name }}
          </a>
          <template v-else>
            {{ data.name }}
          </template>
        </div>
        <ImageReflection v-if="data.image" :src="data.image" class="mt-3" />
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
          <DataGridSectionRow title="supply">
            <FormattedAmount :value="data.supply" :fraction-digits="data.decimals" currency="" />
          </DataGridSectionRow>
          <DataGridSectionRow title="decimals">
            {{ formatNumber(data.decimals) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="holders">
            {{ formatNumber(data.holder) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="transactions">
            {{ formatNumber(data.tx) }}
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="policy.info" />
          </template>
          <DataGridSectionRow title="policy">
            <RouterLink :to="{ name: 'policy', params: { id: data.policy } }" class="max-w-30 min-w-0">
              <TextTruncate :text="data.policy" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </DataGridSectionRow>
          <DataGridSectionRow title="tokens">
            {{ formatNumber(data.policy_token) }}
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
      <VCard v-if="data.description" class="order-3 sm:col-span-2" dark>
        <div class="pb-4 text-lg font-semibold">{{ t('description') }}</div>
        <div v-html="data.description"></div>
      </VCard>

      <div class="order-2 flex flex-wrap gap-7 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <div class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
            <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
            {{ t('token.id') }}
            <template #content>
              <button
                class="relative grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-2xs leading-3 dark:bg-gray-800">
                <div
                  class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                  :class="
                    idHexView ? 'translate-x-full bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'
                  "></div>
                <small class="z-1 px-1" @click="idHexView = false">Bech32</small>
                <small class="z-1 px-1" @click="idHexView = true">HEX</small>
              </button>
            </template>
          </DataGridSectionHeader>
          <div class="flex items-center text-sm">
            <TextTruncate
              v-if="idHexView"
              :text="data.base16"
              class="text-slate-500 dark:text-gray-300"
              highlight="font-medium text-amber-500 dark:text-amber-400" />
            <TextTruncate
              v-else
              :text="data.fingerprint"
              :head-length="0"
              :tail-length="12"
              class="text-emerald-600 dark:text-emerald-400"
              highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
            <CopyToClipboard
              :text="idHexView ? data.base16 : data.fingerprint"
              class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
          </div>
        </div>

        <div v-if="data.asset_name_hex" class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
            <div class="mr-1.5 text-sm leading-3.5 opacity-50">₳</div>
            {{ t('asset_name') }}
            <template #content>
              <button
                v-if="data.asset_name"
                class="relative grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-2xs leading-3 dark:bg-gray-800">
                <div
                  class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                  :class="
                    nameHexView
                      ? 'translate-x-full bg-amber-500 dark:bg-amber-400'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  "></div>
                <small class="z-1 px-1" @click="nameHexView = false">UTF-8</small>
                <small class="z-1 px-1" @click="nameHexView = true">HEX</small>
              </button>
            </template>
          </DataGridSectionHeader>
          <div class="flex items-center text-sm">
            <TextTruncate
              v-if="nameHexView"
              :text="data.asset_name_hex"
              class="text-slate-500 dark:text-gray-300"
              highlight="font-medium text-amber-500 dark:text-amber-400" />
            <TextTruncate
              v-else
              :text="data.asset_name"
              :head-length="0"
              :tail-length="12"
              class="text-emerald-600 dark:text-emerald-400"
              highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
            <CopyToClipboard
              :text="nameHexView ? data.asset_name_hex : data.asset_name"
              class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
          </div>
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
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
          <template #amount="{ row: { quantity } }">
            <TooltipAmount :value="quantity" :fraction-digits="data.decimals" currency="" />
          </template>
          <template #slot_no="{ row: { slot_no } }">
            {{ formatNumber(slot_no) }}
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
          <template #amount="{ row: { quantity } }">
            <TooltipAmount :value="quantity" :fraction-digits="data.decimals" currency="" />
            <PercentFilled :value="quantity" :max="data.supply" :fraction-digits="2" class="mt-1" />
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
          <template #amount="{ row: { quantity } }">
            <TooltipAmount
              :value="quantity"
              :fraction-digits="data.decimals"
              currency=""
              sign
              :class="quantity < 0 ? 'text-down-500 dark:text-down-400' : 'text-up-500 dark:text-up-400'" />
          </template>
          <template #slot_no="{ row: { slot_no } }">
            {{ formatNumber(slot_no) }}
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

      <template #metadata>
        <template v-if="data.metadata || data.registry">
          <div v-if="data.metadata" class="mt-5 text-sm">
            <div class="flex items-center gap-2 p-2 sm:gap-4 sm:px-4">
              <div class="flex items-center text-slate-500 dark:text-gray-300">
                {{ t('metadata.onchain') }}
                <button
                  class="relative ml-3 grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-s leading-3 text-slate-800 dark:bg-gray-800 dark:text-gray-300">
                  <div
                    class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                    :class="
                      !metaPretty ? 'translate-x-full bg-gray-400 dark:bg-gray-500' : 'bg-violet-400 dark:bg-violet-500'
                    "></div>
                  <small class="z-1 px-1" @click="metaPretty = true">Pretty</small>
                  <small class="z-1 px-1" @click="metaPretty = false">Raw</small>
                </button>
              </div>
              <DownloadString
                :text="JSON.stringify(data.metadata, null, metaPretty ? 2 : 0)"
                :name="`${data.fingerprint}.meta.json`"
                class="text-c5 ml-auto h-4 w-4" />
              <CopyToClipboard
                :text="JSON.stringify(data.metadata, null, metaPretty ? 2 : 0)"
                class="text-c5 h-4 w-4" />
            </div>
            <div class="rounded-lg bg-sky-100/50 p-2 px-3 py-2 sm:p-4 dark:bg-gray-800/50">
              <component :is="metaPretty ? 'pre' : 'div'" :class="metaPretty ? 'overflow-auto' : 'line-clamp-5'">
                {{ data.metadata }}
              </component>
            </div>
          </div>
          <div v-if="data.registry" class="mt-5 text-sm">
            <div class="flex items-center gap-2 p-2 sm:gap-4 sm:px-4">
              <div class="flex text-slate-500 dark:text-gray-300">
                {{ t('metadata.offchain') }}
              </div>
            </div>
            <div class="rounded-lg bg-sky-100/50 p-2 px-3 py-2 sm:p-4 dark:bg-gray-800/50">
              <a
                class="mb-1 block w-72 max-w-[30vw] truncate font-medium text-sky-500 underline dark:text-cyan-400"
                :href="
                  'https://github.com/cardano-foundation/cardano-token-registry/raw/master/mappings/' +
                  data.policy +
                  data.asset_name_hex +
                  '.json'
                "
                target="_blank"
                rel="noopener noreferrer nofollow">
                https://github.com/cardano-foundation/cardano-token-registry/raw/master/mappings/{{
                  data.policy + data.asset_name_hex
                }}.json
              </a>
            </div>
          </div>
        </template>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`token.no_meta`) }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { h, nextTick, ref, watch } from 'vue'

import CoinsIcon from '@/assets/icons/coins.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatDateTime, formatNumber } from '@/utils/formatter'
import { getTabData, getTableCols } from '@/utils/helper'

import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeAgo from '@/components/DataListTimeAgo.vue'
import DataPagination from '@/components/DataPagination.vue'
import DownloadString from '@/components/DownloadString.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import ImageReflection from '@/components/ImageReflection.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  transactions: {
    icon: MenuTransactionsIcon,
    colList: [
      { id: 'transaction' },
      { id: 'time' },
      { id: 'amount' },
      { id: 'epoch_slot' },
      { id: 'slot_no' },
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
    colList: [{ id: 'holder' }, { id: 'amount' }, { id: 'balance' }, { id: 'pool' }, { id: 'drep' }],
    sortKeyMap: {
      amount: 'amount',
    },
  },
  minting: {
    name: 'minting_burning',
    icon: CoinsIcon,
    colList: [
      { id: 'transaction' },
      { id: 'time' },
      { id: 'amount' },
      { id: 'epoch_slot' },
      { id: 'slot_no' },
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
  metadata: {
    icon: () => h('div', { class: 'text-lg leading-5 text-center aspect-square' }, '{ }'),
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
  idHexView = ref(false),
  nameHexView = ref(false),
  metaPretty = ref(true)

const setTabRows = (_rows = rows.value) => {
  tabRows.value = _rows

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows(tabId == 'metadata' ? () => [] : undefined)

  tab.value = tabId
}

const onTabChange = async () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.token.' + tabValue,
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

const onShowMore = async () => {
  await moreHandler(undefined, setTabRows)
}

const onSort = async (newKey: string) => {
  await sortHandler(newKey, undefined, setTabRows)
}

watch(
  () => data.value?.fingerprint,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      const _data = data.value!

      nameHexView.value = !Boolean(_data.asset_name)

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
