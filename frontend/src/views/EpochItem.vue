<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1 flex flex-col sm:pb-2 xl:pb-3">
        <div class="flex items-center">
          <h1 class="text-2xl font-medium">
            {{ t('epoch') }}
            <span class="text-sky-500 dark:text-sky-400">{{ formatNumber(data.no) }}</span>
          </h1>
        </div>
        <div class="mx-auto my-4 w-75 text-center">
          <img
            :src="getEpochImage(data.no)"
            :alt="t(`epoch.phase.${getEpochName(data.epoch_no)}`)"
            class="mx-auto -mb-5 h-20 w-20 rounded-md" />
          <span class="rounded bg-gray-800/50 p-0.5 px-1.5 text-2xs leading-4 font-medium text-gray-200">
            {{ t(`epoch.phase.${getEpochName(data.no)}`) }}
          </span>
        </div>
        <div class="relative mx-auto w-75">
          <div class="flex h-32">
            <div class="flex flex-col">
              <div class="mt-6 opacity-70">{{ t('epoch.start') }}</div>
              <div class="absolute top-11 z-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                {{ formatDateTime(getEpochStartTime(data.no)) }}
              </div>
            </div>
            <div class="relative flex-1">
              <svg
                viewBox="0 0 165 128"
                fill="none"
                stroke="currentColor"
                class="h-32 w-full"
                preserveAspectRatio="none">
                <path
                  pathLength="100"
                  stroke-dasharray="0.5 0.5"
                  d="M12 26c7-6 24 7 41 0C75 17 42-5 74 3c24 7 20 22 9 23-32 7 49 45-48 48-49 3-45 54 14 32 48-12 29 9 57 2 37-11 29 1 48 3"
                  class="animate-dash opacity-50" />
                <path
                  pathLength="100"
                  :stroke-dasharray="`${epochProgress} 200`"
                  d="M12 26c7-6 24 7 41 0C75 17 42-5 74 3c24 7 20 22 9 23-32 7 49 45-48 48-49 3-45 54 14 32 48-12 29 9 57 2 37-11 29 1 48 3"
                  class="stroke-2 text-emerald-500 dark:text-emerald-400" />
                <path
                  d="M9 26a3 3 0 10.1 0"
                  fill="currentColor"
                  stroke="none"
                  class="text-emerald-700 dark:text-emerald-400" />
                <path
                  v-if="epochProgress < 100"
                  d="M157 110a3 3 0 10.1 0"
                  pathLength="8"
                  stroke-dasharray="1 1"
                  class="opacity-50" />
                <path
                  v-else
                  d="M157 110a3 3 0 10.1 0"
                  fill="currentColor"
                  stroke="currentColor"
                  class="text-emerald-700 dark:text-emerald-400" />
              </svg>
              <FinishIcon
                v-if="epochProgress > 99"
                class="absolute right-0 bottom-6 size-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div class="place-content-end" :class="{ 'opacity-70': epochProgress < 100 }">
              <ActionStatus
                v-if="epochProgress > 99"
                type="infoaction"
                :dropped_epoch="data.no"
                :expired_epoch="data.no" />
              <template v-else>{{ t('epoch.end') }}</template>
            </div>
          </div>
          <div class="mt-1 flex text-xs">
            <div v-if="epochProgress > 99" class="ml-auto opacity-70">
              {{ formatDateTime(getEpochEndTime(data.no)) }}
            </div>
            <div v-else class="-mt-1 ml-auto text-amber-700 dark:text-orange-300">
              {{ formatDateTime(getEpochEndTime(data.no)) }}
            </div>
          </div>
          <div
            v-if="data.no == data.current_epoch_no"
            class="absolute top-5 right-3 perspective-normal perspective-origin-bottom-left">
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
      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="transactions">
            {{ formatNumber(data.tx) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="output.sum">
            <TooltipAmount :value="data.tx_out_sum" />
          </DataGridSectionRow>
          <DataGridSectionRow title="amount">
            <TooltipAmount :value="data.tx_amount" />
          </DataGridSectionRow>
          <DataGridSectionRow title="fees">
            <TooltipAmount :value="data.tx_fee" />
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="block.info" />
          </template>

          <DataGridSectionRow title="blocks">
            {{ formatNumber(data.block) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="blocks.with_tx">
            {{ formatNumber(data.block_with_tx) }}
          </DataGridSectionRow>
          <!-- <DataGridSectionRow title="blocks.empty">
            <PercentFilled :value="data.block - data.block_with_tx" :max="data.block" class="my-0.5" />
          </DataGridSectionRow> -->
          <DataGridSectionRow title="block.size">
            {{ formatBytes(data.block_size) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="block.utilization">
            <PercentFilled :value="data.block_size" :max="data.block * maxBlockSize" class="my-0.5" />
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>
      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="market_cap">
            <TooltipAmount
              :value="data.circulating_supply * data.exchange_rate"
              :currency="currencies[currency]?.sign" />
          </DataGridSectionRow>
          <DataGridSectionRow title="ada_price">
            {{ formatCurrency(formatPrice(data.exchange_rate)) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="supply.circulating">
            <TooltipAmount :value="data.circulating_supply" />
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="token.info" />
          </template>

          <DataGridSectionRow title="tokens">
            {{ formatNumber(data.token) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="policies">
            {{ formatNumber(data.token_policy) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="holders">
            {{ formatNumber(data.token_holder) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="transactions">
            {{ formatNumber(data.token_tx) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>
      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="holders.ada">
            {{ formatNumber(data.account_with_amount + data.byron_with_amount) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="stake.active">
            <TooltipAmount :value="data.stake" />
          </DataGridSectionRow>
          <DataGridSectionRow title="holders.stake">
            {{ formatNumber(data.delegator_with_stake) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="holders.with_reward">
            <div
              :class="{
                'font-light italic opacity-50': data.account_with_reward == null || data.no > data.current_epoch_no - 2,
              }">
              {{ data.account_with_reward == null ? t('pending') : formatNumber(data.account_with_reward) }}
            </div>
          </DataGridSectionRow>
          <DataGridSectionRow title="rewards">
            <div v-if="data.reward_amount == null" class="font-light italic opacity-50">{{ t('pending') }}</div>
            <TooltipAmount
              v-else
              :value="data.reward_amount"
              :class="{ 'font-light italic opacity-50': data.no > data.current_epoch_no - 2 }" />
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="pool.info" />
          </template>

          <DataGridSectionRow title="pools.with_stake">
            {{ formatNumber(data.pool_with_stake) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="slot.leaders">
            {{ formatNumber(data.pool_with_block) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="pool.reg_ret">
            <template #title>{{ t('registered') }} / {{ t('retired') }}</template>
            {{ formatNumber(data.pool_register) }} / {{ formatNumber(data.pool_retire) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="pool.fees">
            <div v-if="data.pool_fee == null" class="font-light italic opacity-50">{{ t('pending') }}</div>
            <TooltipAmount
              v-else
              :value="data.pool_fee"
              :class="{ 'font-light italic opacity-50': data.no > data.current_epoch_no - 2 }" />
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <div v-if="data.nonce" class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('epoch.nonce') }}
        </DataGridSectionHeader>
        <div class="flex items-center text-sm">
          <TextTruncate
            :text="data.nonce"
            class="text-slate-500 dark:text-gray-300"
            highlight="font-medium text-amber-500 dark:text-amber-400" />
          <CopyToClipboard :text="data.nonce" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #blocks>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #block="{ row: { epoch_no, hash, no } }">
            <RouterLink
              :to="{ name: 'block', params: { id: hash } }"
              class="block w-40 max-w-[30vw] font-sans font-medium">
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

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`drep.no_votes`) }}</div>
      </template>
      <template #transactions>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
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

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`drep.no_delegators`) }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// import { RouterLink } from 'vue-router'
import FinishIcon from '@/assets/icons/finish.svg?component'
import MenuBlocksIcon from '@/assets/icons/menu_blocks.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'

import { currencies, currency, t } from '@/i18n'
import { useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatBytes, formatCurrency, formatDateTime, formatNumber, formatPrice } from '@/utils/formatter'
import {
  getEpochEndTime,
  getEpochImage,
  getEpochName,
  getEpochStartTime,
  getTabData,
  getTableCols,
  getTimeLeft,
} from '@/utils/helper'

import ActionStatus from '@/components/ActionStatus.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeAgo from '@/components/DataListTimeAgo.vue'
import DataPagination from '@/components/DataPagination.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'

type TabId = keyof typeof tabData

const epochLength = import.meta.env.VITE_EPOCH_LENGTH,
  maxBlockSize = 90112,
  maxTxSize = 16384

const tabData = getTabData({
  blocks: {
    icon: MenuBlocksIcon,
    colList: [
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
    ],
    sortKeyMap: {
      block: 'no',
      time: 'no',
      tx: 'tx',
      size: 'size',
      slot_no: 'no',
      epoch_slot: 'no',
      tx_amount: 'tx_amount',
      tx_out_sum: 'tx_out_sum',
      tx_fee: 'tx_fee',
    },
  },
  transactions: {
    icon: MenuTransactionsIcon,
    colList: [
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
    sortKeyMap: {
      transaction: 'time',
      time: 'time',
      amount: 'amount',
      out_sum: 'out_sum',
      fee: 'fee',
      deposit: 'deposit',
      token: 'token',
      size: 'size',
      script_size: 'script_size',
      block_index: 'time',
      slot_no: 'time',
      epoch_slot: 'time',
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
    updateRows,
    pageCount,
    moreHandling,
    moreHandler,
    sortHandler,
    nextPage,
    socketDataHandler,
  } = useViewApi(),
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value)

const setTabRows = (_rows = rows.value) => {
  tabRows.value = _rows

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows()

  tab.value = tabId
}

const onTabChange = () => {
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
}

const onShowMore = async () => {
  await moreHandler(undefined, setTabRows)
}

const onSort = async (newKey: string) => {
  await sortHandler(newKey, undefined, setTabRows)
}

const epochProgress = computed(() => {
  const _data = data.value!

  return _data.no < _data.current_epoch_no ? 100 : Math.floor((_data.current_epoch_slot_no / epochLength) * 100)
})

const timeLeft = computed(() =>
  getTimeLeft((epochLength - data.value!.current_epoch_slot_no) * import.meta.env.VITE_SLOT_LENGTH)
)

watch(
  () => data.value?.no,
  (newValue, oldValue) => {
    if (newValue >= 0 && newValue != oldValue) {
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

      socketDataHandler[newValue < data.value!.current_epoch_no ? 'pause' : 'resume']()
    }
  },
  {
    immediate: true,
  }
)

watch(
  () => data.value?.block,
  () => {
    if (tab.value == 'blocks') {
      updateRows(setTabRows)
    }
  }
)

watch(
  () => data.value?.tx,
  () => {
    if (tab.value == 'transactions') {
      updateRows(setTabRows)
    }
  }
)
</script>
