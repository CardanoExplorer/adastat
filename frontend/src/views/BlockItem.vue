<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1">
        <h1 class="text-2xl font-medium">
          {{ t('block') }}
          <span :style="{ color: `var(${getRatioColor(ship.utilization)})` }">{{ data.epoch_no == null ? t('block.genesis') : formatNumber(data.no) }}</span>
        </h1>

        <div class="relative h-64 overflow-hidden">
          <div class="light:bg-sky/30 absolute bottom-6 left-0 h-18 w-full bg-blue-100 mask-ocean dark:bg-sky-950"></div>

          <Transition
            enter-active-class="duration-500 ease-out"
            enter-from-class="-translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="duration-300 ease-in"
            leave-to-class="translate-x-full"
            mode="out-in">
            <div class="h-full" :key="data.hash">
              <BlockShip
                class="absolute bottom-18 left-1/2 animate-ship"
                :style="{
                  width: ship.width + 'px',
                  marginBottom: ship.draft + 'px',
                  marginLeft: Math.ceil(-ship.width / 2) + 'px',
                  animationDuration: ship.pitching + 's',
                }"
                :no="data.epoch_no == null ? null : data.no"
                :utilization="ship.utilization"
                :size="data.size"
                :title="data.pool_ticker"
                :pool="data.pool_hash"
                :winner="data.battles.rows.length > 0" />
            </div>
          </Transition>

          <div
            class="absolute bottom-0 left-0 mb-4 h-20 w-2/1 animate-ocean bg-linear-to-b from-blue-200 to-sky-100 mask-ocean dark:from-sky-900 dark:to-gray-900">
            <div class="-ml-1 h-4 bg-cyan-500 mask-wave dark:bg-sky-400"></div>
          </div>

          <div class="pointer-events-none absolute bottom-0 h-24 w-full bg-linear-to-b to-sky-50 dark:to-gray-900">
            <I18nT tag="div" class="mt-8 text-center font-alt font-light text-slate-500 dark:text-gray-400" keypath="time.ago">
              <template #time>
                <span class="text-indigo-800 dark:text-indigo-300">{{ formatTimeAgo(lastSyncTime - data.time) }}</span>
              </template>
            </I18nT>
          </div>
          <div class="pointer-events-none absolute bottom-0 left-0 h-64 w-24 bg-linear-to-l to-sky-50 dark:to-gray-900"></div>
          <div class="pointer-events-none absolute right-0 bottom-0 h-64 w-24 bg-linear-to-r to-sky-50 dark:to-gray-900"></div>
        </div>
      </div>

      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="time">
            <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(data.time) }}</div>
          </DataGridSectionRow>
          <DataGridSectionRow title="assurance_level">
            <div
              class="text-sans rounded-xs px-1 text-3xs leading-5 tracking-wider"
              :class="
                data.confirmation > 8
                  ? 'bg-up-500/50 dark:bg-up-700'
                  : data.confirmation > 2
                    ? 'bg-yellow-500/50 dark:bg-yellow-700'
                    : 'bg-down-500/50 dark:bg-down-700'
              ">
              {{ t(data.confirmation > 8 ? 'high' : data.confirmation > 2 ? 'medium' : 'low') }}
            </div>
          </DataGridSectionRow>
          <DataGridSectionRow title="slot">
            {{ data.slot_no == null ? '–' : formatNumber(data.slot_no) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="epoch">
            <template v-if="data.epoch_no == null">–</template>
            <RouterLink v-else :to="{ name: 'epoch', params: { id: data.epoch_no } }" class="text-sky-500 underline dark:text-cyan-400">
              {{ formatNumber(data.epoch_no) }}
            </RouterLink>
          </DataGridSectionRow>
          <DataGridSectionRow title="slot.epoch">
            {{ data.epoch_slot_no == null ? '–' : formatNumber(data.epoch_slot_no) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="size">
            {{ data.epoch_slot_no == null ? '–' : data.epoch_slot_no == null ? '–' : formatBytes(data.size) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="utilization">
            <template v-if="data.epoch_no == null">–</template>
            <PercentFilled v-else :value="data.size" :max="maxBlockSize" class="my-0.5" />
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSectionHeader class="my-5"> {{ t('slot.leader') }} </DataGridSectionHeader>
        <DataGridPool :name="data.pool_name" :bech32="data.pool_bech32" :hash="data.pool_hash" :ticker="data.pool_ticker" />
      </VCard>

      <VCard class="order-3 sm:col-span-2" dark>
        <div class="flex h-full flex-col gap-6 sm:flex-row sm:gap-7 xl:gap-12">
          <div class="flex-1">
            <DataGridSection>
              <template #header>
                <div class="mb-3 text-lg font-medium">
                  {{ t('transaction.data') }}
                </div>
              </template>
              <DataGridSectionRow title="transactions">
                {{ formatNumber(data.tx) }}
              </DataGridSectionRow>
              <DataGridSectionRow title="output.sum">
                <TooltipAmount :value="data.tx_out_sum" />
              </DataGridSectionRow>
              <DataGridSectionRow title="amount">
                <TooltipAmount :value="data.tx_amount" />
              </DataGridSectionRow>
              <DataGridSectionRow title="fee">
                <TooltipAmount :value="data.tx_fee" />
              </DataGridSectionRow>
            </DataGridSection>
          </div>
          <div class="flex min-h-60 flex-1 flex-col gap-px sm:h-full">
            <div class="relative flex-1 text-xs text-slate-950" ref="txsTreeMapRef">
              <!-- <ChartJS :style="txsChartStyle" :config="txsChartConfig" /> -->
              <RouterLink
                :to="{ name: 'transaction', params: { id: row.hash } }"
                :key="row.hash"
                v-for="row of goldenTreemap"
                :style="{
                  width: `${row.width}px`,
                  height: `${row.height}px`,
                  top: `${row.top}px`,
                  left: `${row.left}px`,
                  background: `var(${row.color})`,
                }"
                class="absolute flex items-center truncate rounded border border-white opacity-90 hover:opacity-100 dark:border-gray-900">
                <VTooltip class="mx-1 truncate">{{ row.hash }}</VTooltip>
              </RouterLink>
            </div>
            <div class="h-5 rounded-t border bg-sky-200 opacity-20 dark:bg-gray-700"></div>
            <div class="flex h-4 justify-between opacity-20">
              <div class="w-10 rounded-b border border-t-0 bg-sky-200 dark:bg-gray-700" :key="i" v-for="i of 3"></div>
            </div>
          </div>
        </div>
      </VCard>

      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('block.hash') }}
        </DataGridSectionHeader>
        <div class="flex items-center text-sm">
          <TextTruncate :text="data.hash" class="text-slate-500 dark:text-gray-300" highlight="font-medium text-amber-500 dark:text-amber-400" />
          <CopyToClipboard :text="data.hash" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
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
            <RouterLink :to="{ name: 'transaction', params: { id: hash } }" class="block w-40 max-w-[30vw] font-medium">
              <TextTruncate :text="hash" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #num="{ id, row }">
            {{ row[id] == null ? '–' : formatNumber(row[id]) }}
          </template>
          <template #ada="{ id, row }">
            <TooltipAmount :value="row[id]" />
          </template>
          <template #size="{ row: { size } }">
            {{ formatBytes(size) }}
            <PercentFilled :value="size" :max="maxTxSize" class="mt-1" />
          </template>
          <template #script_size="{ row: { script_size } }">
            {{ formatBytes(script_size) }}
          </template>

          <DataPagination class="mt-8 md:mt-12" :page-count="pageCount" :total="data.tx" :more-handling="moreHandling" more-only @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ `There are no transactions in this block` }}</div>
      </template>
      <template #battles>
        <div class="mt-3">Here is battle list</div>
      </template>
    </VTabs>

    <hr class="mt-14 mb-12 h-px border-none bg-linear-to-r from-10% via-gray-500 via-50% to-90%" />

    <div class="flex items-center justify-between text-sm">
      <div>
        <template v-if="data.previous">
          <RouterLink :to="{ name: 'block', params: { id: data.previous.hash } }" class="flex items-center opacity-90 hover:opacity-100">
            <div class="w-5 text-xl opacity-60">⟨</div>
            <div>
              {{ t('block.previous') }}
              <div class="text-sky-500 underline dark:text-cyan-400">{{ data.previous.no == null ? t('block.genesis') : formatNumber(data.previous.no) }}</div>
            </div>
          </RouterLink>
        </template>
      </div>
      <div class="text-right">
        <template v-if="data.next">
          <RouterLink :to="{ name: 'block', params: { id: data.next.hash } }" class="flex items-center opacity-90 hover:opacity-100">
            <div>
              {{ t('block.next') }}
              <div class="text-sky-500 underline dark:text-cyan-400">{{ formatNumber(data.next.no) }}</div>
            </div>
            <div class="w-5 text-xl opacity-60">⟩</div>
          </RouterLink>
        </template>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { treemapSquarify } from 'd3-hierarchy'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import BattleIcon from '@/assets/icons/battle.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'

import { t } from '@/i18n'
import { lastSyncTime, useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatBytes, formatDateTime, formatNumber, formatTimeAgo } from '@/utils/formatter'
import { getRatio, getRatioColor, getTabData, getTableCols } from '@/utils/helper'
import { darkMode, limit } from '@/utils/settings'

import BlockShip from '@/components/BlockShip.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridPool from '@/components/DataGridPool.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataPagination from '@/components/DataPagination.vue'
// import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  transactions: {
    icon: MenuTransactionsIcon,
    colList: [
      { id: 'transaction' },
      { id: 'block_index', slot: 'num' },
      { id: 'amount', slot: 'ada' },
      { id: 'out_sum', slot: 'ada' },
      { id: 'fee', slot: 'ada' },
      { id: 'deposit', slot: 'ada' },
      { id: 'token', slot: 'num' },
      { id: 'size' },
      { id: 'script_size' },
    ],
    sortKeyMap: {
      transaction: 'block_index',
      block_index: 'block_index',
      amount: 'amount',
      out_sum: 'out_sum',
      fee: 'fee',
      deposit: 'deposit',
      token: 'token',
      size: 'size',
      script_size: 'script_size',
    },
  },
  battles: {
    icon: BattleIcon,
    colList: [],
    sortKeyMap: {},
  },
})

const maxBlockSize = 90112,
  maxTxSize = 16384,
  {
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
  ship = ref(),
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value),
  txsTreeMapRef = useTemplateRef('txsTreeMapRef'),
  // txsChartConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  goldenTreemap = ref<
    {
      hash: string
      color: string
      top: number
      left: number
      width: number
      height: number
    }[]
  >()

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
      name: 'table_cols.block.' + tabValue,
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

const initChartData = () => {
  const _data = data.value,
    wrapper = txsTreeMapRef.value

  if (_data && wrapper) {
    const phi = (1 + Math.sqrt(5)) / 2,
      utilization = ship.value?.utilization ?? 1,
      wrapperWidth = wrapper.offsetWidth,
      wrapperHeight = wrapper.offsetHeight,
      area = wrapperWidth * wrapperHeight * utilization,
      tree: {
        value: number
        hash: string
      }[] = [],
      _goldenTreemap: typeof goldenTreemap.value = [],
      k = Math.ceil(_data.tx / 2_000) // there's no point to show more than 2K txs, since they would become too small to be readable anyway

    let width: number, height: number

    if (wrapperWidth / phi > wrapperHeight) {
      height = Math.min(wrapperHeight, Math.sqrt(area / phi))
      width = height < wrapperHeight ? height * phi : wrapperWidth * utilization
    } else {
      width = Math.min(wrapperWidth, Math.sqrt(area * phi))
      height = width < wrapperWidth ? width / phi : wrapperHeight * utilization
    }

    const offsetLeft = Math.floor((wrapperWidth - width) / 2)

    let totalSize = 0

    for (let i = 0; i < _data.tx; i += k) {
      const row = _data.transactions.rows[i],
        size = row.size || 1

      tree.push({
        value: size,
        hash: row.hash,
      })

      totalSize += size
    }

    tree.sort((a, b) => b.value - a.value)

    treemapSquarify(
      {
        value: totalSize,
        children: tree,
      } as any,
      0,
      0,
      width,
      height
    )

    for (const row of tree as any) {
      _goldenTreemap.push({
        hash: row.hash,
        color: getRatioColor(getRatio(row.value, maxTxSize)),
        top: wrapperHeight - row.y1,
        left: offsetLeft + row.x0,
        width: row.x1 - row.x0,
        height: row.y1 - row.y0,
      })
    }

    goldenTreemap.value = _goldenTreemap
  }
}

let resizeTimerId: number
const resizeHandler = () => {
  clearTimeout(resizeTimerId)
  resizeTimerId = setTimeout(initChartData, 100)
}

watch(
  () => data.value?.hash,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      const _data = data.value!,
        utilization = _data.epoch_no == null ? 1 : getRatio(_data.size, maxBlockSize)

      ship.value = {
        utilization: utilization,
        draft: 4 - Math.round(utilization * 12),
        width: 75 + Math.round(utilization * 50),
        pitching: 6 + Math.round(utilization * 6),
      }

      initChartData()

      tabs.value = []
      for (const [id, { icon, name }] of Object.entries(tabData)) {
        if (id != 'battles') {
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

watch(
  () => data.value?.confirmation,
  (confirmation) => socketDataHandler[confirmation > 8 ? 'pause' : 'resume'](),
  {
    immediate: true,
  }
)

onMounted(() => {
  watch(darkMode, initChartData, { immediate: true })
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  clearTimeout(resizeTimerId)
  window.removeEventListener('resize', resizeHandler)
})
</script>
