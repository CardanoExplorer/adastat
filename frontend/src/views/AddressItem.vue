<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1 flex flex-col">
        <div class="flex items-center">
          <h1 class="truncate text-2xl font-medium">
            {{ t(data.type_int == 8 ? 'address.legacy' : 'address') }}
          </h1>
          <!-- <WatchlistToggle type="address" :data="data.address" class="ml-auto h-9 w-9 p-2" /> -->
        </div>
        <div v-if="data.adahandle" class="flex items-center text-xl font-medium">
          <AdaHandleIcon fill="#0cd15b" class="mr-px h-4" />{{ data.adahandle }}
        </div>
        <div class="mt-auto flex pt-10">
          <div class="mr-1 w-1/2 min-w-max pr-1 text-right text-2xs">
            <div class="opacity-70">{{ t('balance') }}</div>
            <FormattedAmount
              :value="data.balance"
              class="mt-1 ml-auto h-5 w-max bg-linear-to-r from-lime-600 to-teal-600 bg-clip-text text-lg leading-5 font-semibold text-transparent dark:from-lime-400 dark:to-teal-400" />
          </div>
          <component
            :is="data._holderIcon ??= getHolderIcon(data.balance)"
            class="h-10 w-9 text-blue-500 dark:text-sky-400" />
        </div>
        <div class="-mb-5 w-1/2">
          <div class="ml-auto h-20 w-32">
            <svg
              viewBox="0 0 64 80"
              fill="none"
              stroke="currentColor"
              class="ml-12 h-20 w-20 opacity-50"
              preserveAspectRatio="none">
              <path
                d="M8 1C-4 15 2 42 10 44c15-3 2-15 0 0-1 7 7 19 34 16 10 0 23 2 18 19"
                stroke-dasharray="0 2 0 0 3 0"
                vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
        <div class="mb-px flex text-2xs opacity-70">
          <div class="w-1/2 pl-1.5">{{ t('account.payment') }}</div>
          <div class="w-1/2 pr-1.5 text-right">{{ t('account.stake') }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm font-medium">
          <div class="relative z-2 rounded-md bg-white p-1 pr-5 pl-1.5 dark:bg-gray-800">
            <div class="absolute top-1 right-1 h-2 w-2 rounded-full bg-sky-50 dark:bg-gray-900"></div>
            <svg viewBox="0 0 40 52" fill="none" stroke="currentColor" class="absolute -top-2 -right-6 w-10 opacity-50">
              <path
                d="M20 39c-4-6-7-14 2-19m8-4c5-2 5-7 1-9C23 3 15 1 8 5c-9 5-7 17 2 9"
                stroke-dasharray="0 2 0 0 3 0"
                vector-effect="non-scaling-stroke" />
              <path
                d="M13 44a1 1 0 004 5m6-2a1 1 0 01-6 2l3-10m1 1a.5.5 0 00-2-2 .5.5 0 002 2m-4 2 4 1"
                vector-effect="non-scaling-stroke" />
            </svg>

            <template v-if="paymentAccount">
              <div class="max-w-40">
                <TextTruncate :text="paymentAccount" class="text-sky-500 dark:text-cyan-400" />
              </div>
              <TooltipAmount
                :value="data.balance"
                class="mt-1 truncate bg-linear-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-yellow-400" />
            </template>
            <template v-else>
              <div class="truncate text-amber-500 dark:text-amber-400">
                {{ t('not_available') }}
              </div>
              <div class="mt-1 truncate text-xs leading-5 font-light opacity-70">for Legacy address</div>
            </template>
          </div>
          <div class="relative z-1 rounded-md bg-white p-1 pr-1.5 pl-5 text-right dark:bg-gray-800">
            <div class="absolute top-1 left-1 h-2 w-2 rounded-full bg-sky-50 dark:bg-gray-900"></div>
            <template v-if="data.stake_bech32">
              <RouterLink :to="{ name: 'account', params: { id: data.stake_bech32 } }" class="ml-auto block max-w-40">
                <TextTruncate :text="data.stake_base16" class="text-sky-500 *:underline dark:text-cyan-400" />
              </RouterLink>
              <TooltipAmount
                :value="data.account_balance"
                class="mt-1 ml-auto truncate bg-linear-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-yellow-400" />
            </template>
            <template v-else>
              <div class="truncate text-amber-500 dark:text-amber-400">
                {{ t('not_available') }}
              </div>
              <div class="mt-1 truncate text-xs leading-5 font-light opacity-70">
                for {{ data.type_int == 8 ? 'Legacy' : 'Enterprise' }} address
              </div>
            </template>
          </div>
        </div>
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
          <DataGridSectionRow title="transactions">
            {{ formatNumber(data.tx) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="utxos">
            {{ formatNumber(data.utxo) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="nfts">
            {{ formatNumber(data.nft) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="tokens">
            {{ formatNumber(data.ft) }}
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection v-if="stakeAccount">
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="stake.delegation" />
          </template>
          <DataGridSectionRow title="pool">
            <RowPool
              :name="data.pool_name"
              :ticker="data.pool_ticker"
              :bech32="data.pool_bech32"
              :hash="data.pool_hash"
              class="max-w-3/5 min-w-0" />
          </DataGridSectionRow>
          <DataGridSectionRow title="drep">
            <RowDRep
              :name="data.drep_given_name"
              :bech32="data.drep_bech32"
              :base16="data.drep_base16"
              class="max-w-3/5 min-w-0" />
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">₳</div>
          {{ t('address.id') }}
          <template #content>
            <button
              class="relative grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-2xs leading-3 dark:bg-gray-800">
              <div
                class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                :class="
                  idHexView ? 'translate-x-full bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'
                "></div>
              <small class="z-1 px-1" @click="idHexView = false">{{ data.type_int == 8 ? 'Base58' : 'Bech32' }}</small>
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
            :text="data.address"
            :head-length="0"
            :tail-length="12"
            class="text-emerald-600 dark:text-emerald-400"
            highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
          <CopyToClipboard
            :text="idHexView ? data.base16 : data.address"
            class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #activity>
        <div :key="rowData.date" v-for="rowData of tabRows">
          <div
            v-if="rowData.date"
            class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
            {{ rowData.date }}
          </div>
          <!-- <TransitionGroup enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300" move-class="" leave-active-class="hidden"> -->
          <div class="pb-3" :key="row.tx_hash" v-for="row of rowData.rows">
            <div
              class="rounded-lg bg-white/60 p-2 hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20">
              <div class="flex gap-2 sm:gap-4">
                <component
                  :key="row._type"
                  :is="getTxTypeDataIcon(row._type)"
                  class="mt-1 h-9 w-9 stroke-[0.5] opacity-80"
                  :class="getTxTypeDataClass(row._type)" />
                <div class="flex-1 text-sm">
                  {{ t('summary.' + row._type) }}
                  <FormattedAmount
                    :value="row.amount"
                    sign
                    class="mt-1 h-5 font-alt opacity-90"
                    :class="row.amount < 0 ? 'text-down-600 dark:text-down-400' : 'text-up-600 dark:text-up-400'" />
                </div>
                <div class="ml-auto text-right text-2xs leading-3">
                  <div class="mb-2 inline-block rounded-sx bg-up-500/50 p-2 py-1 text-3xs capitalize dark:bg-up-700">
                    high
                  </div>
                  <RouterLink
                    :to="{ name: 'transaction', params: { id: row.tx_hash } }"
                    class="mt-px block text-center text-sky-500 underline opacity-80 dark:text-cyan-400">
                    {{ formatTime(row.time) }}
                  </RouterLink>
                </div>
              </div>
              <div v-if="row.token > 0" class="mt-1 ml-11 flex flex-wrap gap-1 text-3xs leading-4 sm:ml-13">
                <template
                  :key="i"
                  v-for="(n, i) of tabInteraction[row.tx_hash]
                    ? row.tokens.rows.length
                    : Math.min(3, row.tokens.rows.length)">
                  <VTooltip
                    v-if="n < 3 || row.tokens.rows.length == 3 || tabInteraction[row.tx_hash]"
                    class="h-4 max-w-28 truncate rounded-xs px-1"
                    :class="
                      row.tokens.rows[i].quantity < 0
                        ? 'bg-down-400/50 dark:bg-down-400/50'
                        : 'bg-up-400/50 dark:bg-up-400/50'
                    "
                    truncate>
                    <FormattedAmount
                      class="inline"
                      :value="row.tokens.rows[i].quantity"
                      :fraction-digits="row.tokens.rows[i].decimals"
                      currency=""
                      sign />
                    {{ row.tokens.rows[i].name }}
                  </VTooltip>
                </template>
                <button
                  v-if="row.token > 3"
                  class="underline decoration-dashed underline-offset-2 opacity-90"
                  @click="showMoreToken(row.tx_hash)">
                  {{ t(tabInteraction[row.tx_hash] ? 'show.less' : 'more.n', { n: row.token - 2 }) }}
                </button>
              </div>
              <div v-if="row.desc" class="mt-1 ml-11 text-2xs opacity-80 sm:ml-13">
                {{ row.desc }}
              </div>
            </div>
          </div>
          <!-- </TransitionGroup> -->
        </div>

        <DataPagination
          class="mt-3 md:mt-9"
          :page-count="pageCount"
          :total="nextPage ? Infinity : 0"
          :more-handling="moreHandling"
          more-only
          @more="onShowMore" />
      </template>

      <template #nfts>
        <!-- <div class="flex items-center rounded-lg bg-white/60 text-sm dark:bg-gray-800/30">
          <SearchIcon class="m-5 size-4" />
          <input type="search" readonly class="h-10 w-full" placeholder="Search by Name, Fingerprint or Policy Hash" />
          <button class="m-3 rounded-md bg-white p-2 dark:bg-gray-800">
            <CloseIcon class="size-5" />
          </button>
        </div>
        <div class="mx-5 mt-2 text-xs font-light opacity-70">
          {{ t('n.nft_found', { n: data.nft, across: t('n.accross_collection', data.nft_collection) }) }}
        </div> -->
        <template v-if="tabRows?.length">
          <div :key="rowData.policy" v-for="(rowData, i) of tabRows" class="pt-10 text-s">
            <!-- <hr class="mb-10 h-px border-none bg-linear-to-r via-blue-300 dark:via-gray-700" /> -->
            <div class="mb-3">
              <div class="pb-2 text-sm font-medium sm:px-2">
                <span class="mr-2 font-light opacity-80">#{{ i + 1 }}</span>
                <RouterLink
                  :to="{ name: 'policy', params: { id: rowData.policy } }"
                  class="text-sky-500 underline dark:text-cyan-400"
                  >{{ formatNumber(rowData.total_token_count) }} NFTs Collection</RouterLink
                >
                ({{ t('n.nft_found', { n: rowData.token_count, across: '' }) }})
              </div>
              <div class="flex max-w-max items-center rounded bg-white sm:p-1 sm:px-2 dark:bg-gray-800/50">
                <TextTruncate
                  :text="rowData.policy"
                  class="text-slate-500 dark:text-gray-300"
                  highlight="font-medium text-amber-500 dark:text-amber-400" />
                <CopyToClipboard :text="rowData.policy" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
              </div>
            </div>
            <div class="mb-1 -ml-2 flex overflow-x-auto scrollbar-thin sm:-ml-2.5 md:-ml-3">
              <div
                :key="token.asset_name_hex"
                v-for="token of rowData.tokens.rows"
                class="z-7 w-60 shrink-0 rounded-2xl p-2 text-center hover:bg-white sm:p-2.5 md:p-3 hover:dark:bg-gray-800">
                <VImg
                  :src="token.image"
                  :alt="token.name || token.asset_name || token.fingerprint"
                  class="aspect-square rounded-xl bg-white/60 dark:bg-gray-800/30"
                  fallback-class="stroke-[0.5]" />
                <div class="mt-2 line-clamp-1 wrap-break-word opacity-70 md:line-clamp-2">
                  {{ token.name || token.asset_name || token.fingerprint }}
                </div>
              </div>
              <div v-if="rowData.tokens.cursor?.next" class="z-7 w-60 shrink-0 p-2 sm:p-2.5 md:p-3">
                <div class="grid aspect-square place-items-center rounded-xl bg-white/60 dark:bg-gray-800/30">
                  <button
                    class="grid size-16 place-items-center rounded-full bg-white opacity-70 hover:opacity-100 dark:bg-gray-800"
                    @click="nftShowMore(rowData)">
                    <SpinnerIcon v-if="rowData.showMoreLoading" class="size-5 animate-spin stroke-2" />
                    <ArrowIcon v-else class="size-6 rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </template>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ t('n.nft_found', { n: 0, across: '' }) }}
        </div>
      </template>

      <template #fts>
        <!-- <div class="flex items-center rounded-lg bg-white/60 text-sm dark:bg-gray-800/30">
          <SearchIcon class="m-5 size-4" />
          <input type="search" readonly class="h-10 w-full" placeholder="Search by Name, Fingerprint or Policy Hash" />
          <button class="m-3 rounded-md bg-white p-2 dark:bg-gray-800">
            <CloseIcon class="size-5" />
          </button>
        </div>
        <div class="mx-5 mt-2 text-xs font-light opacity-70">
          {{ t('n.ft_found', data.ft) }}
        </div>
        <hr class="my-10 h-px border-none bg-linear-to-r via-blue-300 dark:via-gray-700" /> -->
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
          <template #balance="{ row: { quantity, decimals } }">
            <FormattedAmount :value="quantity" :fraction-digits="decimals" currency="" />
          </template>
          <template #policy="{ row: { policy } }">
            <RouterLink :to="{ name: 'policy', params: { id: policy } }" class="block w-40 max-w-[30vw]">
              <TextTruncate :text="policy" class="font-medium text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #fingerprint="{ row: { fingerprint } }">
            <RouterLink :to="{ name: 'token', params: { id: fingerprint } }" class="block w-40 max-w-[30vw]">
              <TextTruncate :text="fingerprint" class="font-medium text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="data.ft"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ t('n.ft_found', 0) }}
        </div>
      </template>

      <template #utxos>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash + '#' + row.tx_index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #transaction="{ row: { tx_hash } }">
            <RouterLink
              :to="{ name: 'transaction', params: { id: tx_hash } }"
              class="mb-5 block w-40 max-w-[30vw] font-medium">
              <TextTruncate :text="tx_hash" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #index="{ row: { tx_index } }">
            {{ formatNumber(tx_index) }}
          </template>
          <template #balance="{ row: { amount } }">
            <FormattedAmount :value="amount" />
          </template>
          <template #tokens="{ row: { token, tokens, index } }">
            <template v-if="token > 0">
              <div class="my-1 flex max-w-max gap-1 text-3xs leading-4" :class="{ 'flex-wrap': tabInteraction[index] }">
                <template :key="i" v-for="(n, i) of tabInteraction[index] ? token : Math.min(3, token)">
                  <VTooltip
                    v-if="n < 3 || token == 3 || tabInteraction[index]"
                    class="h-4 max-w-28 truncate rounded-sx bg-teal-500/50 px-1 dark:bg-teal-400/50"
                    truncate>
                    <FormattedAmount
                      class="inline"
                      :value="tokens.rows[i].quantity"
                      :fraction-digits="tokens.rows[i].decimals"
                      currency="" />
                    {{ getTokenName(tokens.rows[i]) }}
                  </VTooltip>
                </template>
              </div>
              <button
                v-if="token > 3"
                class="text-3xs underline decoration-dashed underline-offset-2 opacity-90"
                @click="showMoreToken(index, ($event.target as HTMLElement).parentElement!)">
                {{ t(tabInteraction[index] ? 'show.less' : 'more.n', { n: token - 2 }) }}
              </button>
            </template>
            <template v-else>–</template>
          </template>
          <template #datum="{ row: { data_hash } }">
            <div v-if="data_hash" class="w-40 max-w-[30vw]">
              <TextTruncate :text="data_hash" />
            </div>
            <template v-else>–</template>
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
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { h, ref, watch } from 'vue'

import ActivityIcon from '@/assets/icons/activity.svg?component'
import AdaHandleIcon from '@/assets/icons/adahandle.svg?component'
import ArrowIcon from '@/assets/icons/arrow.svg?component'
// import CloseIcon from '@/assets/icons/close.svg?component'
import TokensIcon from '@/assets/icons/menu_tokens.svg?component'
import NFTsIcon from '@/assets/icons/nfts.svg?component'
// import SearchIcon from '@/assets/icons/search.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatDate, formatDateTime, formatNumber, formatTime } from '@/utils/formatter'
import {
  type AnyObject,
  type BooleanObject,
  getTabData,
  getTableCols,
  getTokenName,
  getTxTypeDataClass,
  getTxTypeDataIcon,
} from '@/utils/helper'
import { getHolderIcon } from '@/utils/holderIcons'

import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
// import { RouterLink } from 'vue-router'
import DataListToken from '@/components/DataListToken.vue'
import DataPagination from '@/components/DataPagination.vue'
// import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import RowDRep from '@/components/RowDRep.vue'
import RowPool from '@/components/RowPool.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VImg from '@/components/VImg.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'

// import WatchlistToggle from '@/components/WatchlistToggle.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  activity: {
    icon: ActivityIcon,
    contentClass: '-mt-4',
  },
  nfts: {
    icon: NFTsIcon,
  },
  fts: {
    icon: TokensIcon,
    name: 'tokens',
    colList: [
      { id: 'token' },
      { id: 'balance' },
      // { id: 'price' },
      { id: 'policy' },
      { id: 'fingerprint' },
    ],
    sortKeyMap: {
      balance: 'balance',
    },
  },
  utxos: {
    icon: () => h('div', { class: 'text-xl leading-5 text-center aspect-square font-light' }, '#'),
    colList: [{ id: 'transaction' }, { id: 'index' }, { id: 'balance' }, { id: 'tokens' }, { id: 'datum' }],
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
  paymentAccount = ref(),
  paymentScript = ref(),
  stakeAccount = ref(),
  stakeScript = ref(),
  tabInteraction = ref<BooleanObject>({})

const setTabRows = (_rows = rows.value, _newRows?: typeof rows.value) => {
  if (tab.value == 'activity') {
    if (_newRows && _newRows.length < _rows.length) {
      // Show more
      _rows = _newRows
    } else {
      tabRows.value = []
    }

    for (const row of _rows) {
      if (!row._type) {
        // TODO add desc on the backend
        // if (row.tx_hash == 'e2382258dc4fe650c5f6f828745dd9a9c4d85e84565599e0e5519b6f93b4cfc2') {
        //   row.desc = 'Description: Fund12 Voter rewards'
        // }
        // if (row.tx_hash == '4f761118cda13d54924d34389b5d19a9085a4e7fcc96ed9daac67d0752745cb2') {
        //   row.certs = ['DRep vote']
        // }
        // if (row.tx_hash == 'd446a662cf4a9037be425646c472c73ceab321c5cbaa9682d25f5ab7aa45ecba') {
        //   row.certs = ['DRep update']
        // }
        // if (row.tx_hash == '5c433145addae9555c8948cb6e041e05fe4a3379debd0c948d352aebb9e99b2f') {
        //   row.certs = ['DRep reg', 'DRep deleg']
        // }

        if ((row.amount == -row.tx_deposit - row.tx_fee || row.amount == 0) && row.token == 0) {
          row._type = 'intra'
        } else {
          let pos = row.amount > 0,
            neg = row.amount < 0

          for (const token of row.tokens?.rows ?? []) {
            if (token.quantity > 0) {
              pos = true
            } else {
              neg = true
            }
            if (pos && neg) {
              break
            }
          }

          if (pos && neg) {
            row._type = 'swap'
          } else if (pos) {
            row._type = 'in'
          } else {
            row._type = 'out'
          }
        }
      }

      const rowDate = formatDate(row.time),
        tabRowsLength = tabRows.value!.length,
        prevData = tabRows.value![tabRowsLength - 2]!

      if (prevData?.date == rowDate) {
        const lastData = tabRows.value![tabRowsLength - 1]!

        prevData.rows.push(lastData.rows[0])
        lastData.rows = [row]
      } else {
        tabRows.value!.push(
          {
            date: rowDate,
            rows: [],
          },
          {
            rows: [row],
          }
        )
      }
    }
  } else {
    tabRows.value = _rows
  }

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value
}

const nftShowMore = async (rowData: AnyObject) => {
  if (!rowData.showMoreLoading) {
    rowData.showMoreLoading = true

    await setApiRows(
      undefined,
      (_, newRows) => {
        const tokens = newRows?.length == 1 && newRows[0]!.tokens
        if (tokens) {
          for (const row of tokens.rows) {
            rowData.tokens.rows.push(row)
          }
          rowData.tokens.cursor = tokens.cursor
        }
      },
      {
        policy: rowData.policy,
        after: rowData.tokens.cursor.after,
      }
    )

    delete rowData.showMoreLoading
  }
}

const showMoreToken = (uniqueKey: string, el?: HTMLElement) => {
  tabInteraction.value[uniqueKey] = !tabInteraction.value[uniqueKey]

  if (el) {
    el.style.width = tabInteraction.value[uniqueKey] ? el.offsetWidth + 'px' : ''
  }
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
      name: 'table_cols.address.' + tabValue,
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
  () => data.value?.address,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      const _data = data.value!,
        addressBase16 = _data.base16,
        typeInt = _data.type_int,
        _paymentScript = Boolean(typeInt % 2),
        _stakeScript = typeInt == 2 || typeInt == 3

      let _paymentAccount = '',
        _stakeAccount = ''

      if (addressBase16 && typeInt < 8) {
        const networkTag = addressBase16.slice(1, 2),
          paymentCred = addressBase16.slice(2, 58),
          stakeCred = addressBase16.slice(58)

        if (paymentCred.length == 56) {
          _paymentAccount = (_paymentScript ? '7' : '6') + networkTag + paymentCred
        }

        if (stakeCred.length == 56) {
          _stakeAccount = (_stakeScript ? 'f' : 'e') + networkTag + stakeCred
        }
      }

      paymentAccount.value = _paymentAccount
      stakeAccount.value = _stakeAccount
      paymentScript.value = _paymentScript
      stakeScript.value = _stakeScript

      tabs.value = []
      for (const [id, { icon, name, contentClass }] of Object.entries(tabData)) {
        tabs.value.push({
          id,
          icon,
          name,
          contentClass,
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
