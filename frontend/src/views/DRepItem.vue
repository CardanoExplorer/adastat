<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1">
        <div class="flex items-center">
          <h1 class="truncate text-2xl font-medium">
            {{ t('drep') }}
          </h1>
          <WatchlistToggle type="drep" :data="data.bech32" class="ml-auto h-9 w-9 p-2" />
        </div>
        <div
          class="line-clamp-2 h-15 text-xl font-medium"
          :style="{ color: `var(${getRatioColor(getRatio(data.live_stake, 75 * 1_000_000 * 1_000_000))})` }">
          {{ data.given_name }}
        </div>
        <ImageReflection v-if="data.image" :src="data.image" class="mt-3" />
      </div>
      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="registration">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.first_tx_hash } }"
              class="text-indigo-700 underline dark:text-indigo-400"
              >{{ formatDateTime(data.first_tx_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow title="activity.last">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.last_tx_hash } }"
              class="text-amber-700 underline dark:text-orange-300"
              >{{ formatDateTime(data.last_tx_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow title="active_until">
            <template v-if="data.base16">
              {{ formatDateTime(getEpochEndTime(data.last_active_epoch)) }}
            </template>
            <template v-else>–</template>
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="stake.delegation" />
          </template>
          <DataGridSectionRow title="delegators">
            {{ formatNumber(data.delegator) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="voting_power">
            <FormattedAmount :value="data.live_stake" />
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="votes" />
          </template>
          <DataGridSectionRow title="yes">
            <div class="text-up-600 dark:text-up-400">{{ formatNumber(data.vote_yes) }}</div>
          </DataGridSectionRow>
          <DataGridSectionRow title="no">
            <div class="text-down-600 dark:text-down-400">{{ formatNumber(data.vote_no) }}</div>
          </DataGridSectionRow>
          <DataGridSectionRow title="abstain">
            <div class="opacity-50">{{ formatNumber(data.vote_abstain) }}</div>
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>
      <VCard v-if="data.qualifications" class="order-3 sm:col-span-2" dark>
        <div class="pb-4 text-lg font-semibold">{{ t('qualifications') }}</div>
        <div v-html="data.qualifications"></div>
      </VCard>
      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('drep.id') }}
          <template #content v-if="data.base16">
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
            :text="data.bech32"
            :head-length="0"
            :tail-length="12"
            class="text-emerald-600 dark:text-emerald-400"
            highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
          <CopyToClipboard
            :text="idHexView ? data.base16 : data.bech32"
            class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #votes>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash + '#' + row.tx_index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          :row-class="(row) => (row.invalidation ? 'opacity-50' : null)"
          @sort="onSort">
          <template #gov_action="{ row: { gtx_hash, gtx_index, title } }">
            <RouterLink
              :to="{
                name: 'gov_action',
                params: { id: gtx_hash + ('0' + parseInt(gtx_index).toString(16)).slice(-2) },
              }"
              class="mb-1 block w-72 max-w-[30vw]">
              <TextTruncate
                :text="title"
                :tail-length="0"
                class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #type="{ row: { type } }"> {{ t('gov_action.type.' + type) }} </template>
          <template #vote="{ row: { vote, json, invalidation } }">
            <VoteLabel :vote="vote" :comment="json?.body?.comment || json?.body?.summary" :invalid="invalidation" />
          </template>
          <template #tx="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
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
      <template #delegators>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.base16"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #account="{ row: { base16, bech32, live_stake } }">
            <DataListHolder :bech32="bech32" :base16="base16" :balance="live_stake" />
          </template>
          <template #stake="{ row: { live_stake } }">
            <TooltipAmount :value="live_stake" />
          </template>
          <template #tx="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #prev_drep="{ row: { prev_bech32, prev_base16, prev_given_name, prev_image } }">
            <DataListDRep :name="prev_given_name" :bech32="prev_bech32" :base16="prev_base16" :image="prev_image" />
          </template>
          <template #last_activity="{ row: { last_tx_hash, last_tx_time } }">
            <DataListActivity :tx-hash="last_tx_hash" :tx-time="last_tx_time" last />
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
      <template #registrations>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash + '#' + row.tx_index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #tx="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #certificate="{ row: { deposit_amount } }">
            <CertDeregistration v-if="deposit_amount < 0" :value="-deposit_amount" icon-hide />
            <CertRegistration v-else-if="deposit_amount > 0" :value="deposit_amount" icon-hide />
            <CertUpdate v-else icon-hide />
          </template>
          <template #name="{ row: { given_name } }">
            <div class="w-72 max-w-[30vw] truncate">
              {{ given_name }}
            </div>
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
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
      <template #details>
        <div
          v-if="data.objectives || data.motivations || data.comment || data.references || data.payment_address"
          class="-mt-4">
          <div v-if="data.objectives">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('objectives') }}
            </div>
            <div
              v-html="data.objectives"
              class="rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.motivations">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('motivations') }}
            </div>
            <div
              v-html="data.motivations"
              class="rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.comment">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('comment') }}
            </div>
            <div
              v-html="data.comment"
              class="rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.references">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('references') }}
            </div>
            <ul
              class="prose prose-sm max-w-none rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:prose-invert dark:hover:bg-gray-700/20">
              <li :key="i" v-for="(reference, i) of data.references" class="flex items-end gap-2">
                <div class="shrink-0 text-s tabular-nums">{{ (i as number) + 1 }}.</div>
                <a
                  v-if="reference.uri"
                  :href="getUrl(reference.uri)"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  :title="reference.label">
                  {{ reference.label || reference.uri }}
                </a>
              </li>
            </ul>
          </div>
          <div v-if="data.payment_address">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('address') }}
            </div>
            <div
              class="rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20">
              <router-link :to="{ name: 'address', params: { id: data.payment_address } }">
                <TextTruncate :text="data.payment_address" class="text-sky-500 *:underline dark:text-cyan-400" />
              </router-link>
            </div>
          </div>
        </div>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`drep.no_details`) }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import HoldersIcon from '@/assets/icons/holders.svg?component'
import InfoIcon from '@/assets/icons/info.svg?component'
import KeyIcon from '@/assets/icons/key.svg?component'
import VotesIcon from '@/assets/icons/votes.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
import { formatDateTime, formatNumber } from '@/utils/formatter'
import { getEpochEndTime, getRatio, getRatioColor, getTabData, getTableCols, getUrl } from '@/utils/helper'

import CertDeregistration from '@/components/CertDeregistration.vue'
import CertRegistration from '@/components/CertRegistration.vue'
import CertUpdate from '@/components/CertUpdate.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListMeta from '@/components/DataListMeta.vue'
import DataPagination from '@/components/DataPagination.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import ImageReflection from '@/components/ImageReflection.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VoteLabel from '@/components/VoteLabel.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  votes: {
    icon: VotesIcon,
    colList: [{ id: 'gov_action' }, { id: 'type' }, { id: 'vote' }, { id: 'tx' }, { id: 'meta' }],
    sortKeyMap: {
      tx: 'tx_time',
    },
  },
  delegators: {
    icon: HoldersIcon,
    colList: [{ id: 'account' }, { id: 'stake' }, { id: 'tx' }, { id: 'prev_drep' }, { id: 'last_activity' }],
    sortKeyMap: {
      stake: 'live_stake',
      tx: 'tx_time',
    },
  },
  registrations: {
    icon: KeyIcon,
    name: 'key_history',
    colList: [{ id: 'tx' }, { id: 'certificate' }, { id: 'name' }, { id: 'meta' }],
    sortKeyMap: {
      tx: 'tx_time',
    },
  },
  details: {
    icon: InfoIcon,
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
  idHexView = ref(false)

const setTabRows = (_rows = rows.value) => {
  tabRows.value = _rows

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows(tabId == 'details' ? () => [] : undefined)

  tab.value = tabId
}

const onTabChange = () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.drep.' + tabValue,
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
  () => data.value?.bech32,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      tabs.value = []
      for (const [id, { icon, name }] of Object.entries(tabData)) {
        if (data.value!.base16 || id == 'delegators') {
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
