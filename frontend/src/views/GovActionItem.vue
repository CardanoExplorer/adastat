<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1 flex flex-col sm:pb-2 xl:pb-3">
        <h1 class="text-2xl font-medium">
          {{ t('gov_action.type.' + data.type) }}
        </h1>
        <div class="mb-10 text-xl font-medium" :class="statusColors[status!]">
          {{ data.title }}
        </div>
        <div class="mb-4">
          <FormattedAmount
            v-if="data.withdrawal_amount"
            :value="data.withdrawal_amount"
            class="mx-auto w-max rounded-md bg-sky-100 box-decoration-clone p-1 px-3 text-sm leading-6 font-medium text-slate-800 dark:bg-gray-800 dark:text-gray-300" />
        </div>
        <div class="relative mx-auto w-75">
          <div class="flex h-32">
            <div class="flex flex-col">
              <div class="mt-6 opacity-70">{{ t('voting.start') }}</div>
              <RouterLink
                :to="{ name: 'transaction', params: { id: data.tx_hash } }"
                class="absolute top-11 z-1 text-xs font-medium text-indigo-700 underline dark:text-indigo-400">
                {{ formatDateTime(data.submission_time) }}
              </RouterLink>
              <div v-if="actionEpoch" class="mt-auto opacity-30">
                {{
                  data.ratified_epoch || data.expired_epoch
                    ? t(getGovActionStatus(data.type, undefined, data.ratified_epoch, undefined, data.expired_epoch))
                    : ''
                }}
              </div>
              <ActionStatus
                v-else-if="status != 'active'"
                class="mt-auto"
                :type="data.type"
                :ratified_epoch="data.ratified_epoch"
                :expired_epoch="data.expired_epoch" />
            </div>
            <div class="relative flex-1">
              <svg
                viewBox="0 0 165 128"
                fill="none"
                stroke="currentColor"
                class="h-32 w-full"
                preserveAspectRatio="none">
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
                <path
                  d="M9 26a3 3 0 10.1 0"
                  fill="currentColor"
                  stroke="none"
                  class="text-emerald-700 dark:text-emerald-400" />
                <path
                  v-if="finalEpoch"
                  d="M5 103a3 3 0 10.1 0"
                  fill="currentColor"
                  stroke="currentColor"
                  class="text-emerald-700 dark:text-emerald-400" />
                <path
                  v-if="votingProgress < 100"
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
              <div class="-mt-12 text-center text-2xs opacity-70">
                {{ finalEpoch ? t('epoch') + ' ' + formatNumber(finalEpoch) : '' }}
              </div>
              <FinishIcon
                v-if="status != 'active'"
                class="absolute bottom-6 size-4 text-emerald-700 dark:text-emerald-400"
                :class="actionEpoch ? 'right-0' : 'left-3'" />
            </div>
            <div
              class="place-content-end"
              :class="actionEpoch ? null : status == 'active' ? 'opacity-70' : 'opacity-30'">
              <ActionStatus
                v-if="actionEpoch"
                :type="data.type"
                :enacted_epoch="data.enacted_epoch"
                :ratified_epoch="data.ratified_epoch"
                :dropped_epoch="data.dropped_epoch"
                :expired_epoch="data.expired_epoch" />
              <template v-else>
                {{
                  t(
                    finalEpoch
                      ? getGovActionStatus(
                          data.type,
                          data.ratified_epoch,
                          data.ratified_epoch,
                          data.expired_epoch,
                          data.expired_epoch
                        )
                      : 'deadline'
                  )
                }}
              </template>
            </div>
          </div>
          <div class="mt-1 flex text-xs">
            <template v-if="status != 'active'">
              <div v-if="status != 'invalidated'" :class="actionEpoch ? 'opacity-30' : 'opacity-70'">
                {{ formatDateTime(getEpochStartTime(finalEpoch)) }}
              </div>
              <div class="ml-auto" :class="actionEpoch ? 'opacity-70' : 'opacity-30'">
                {{ formatDateTime(getEpochStartTime(actionEpoch || finalEpoch + 1)) }}
              </div>
            </template>
            <div v-else class="-mt-1 ml-auto text-amber-700 dark:text-orange-300">{{ formatDateTime(expiryTime) }}</div>
          </div>
          <div
            v-if="!finalEpoch && !actionEpoch"
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
        <div class="flex pb-1 text-lg font-semibold">
          {{ t('constitutionality') }}
          <div v-if="ccThreshold >= 0" class="mt-0.5 ml-auto flex w-max">
            <template v-if="ccThreshold > 1">
              <!-- <svg
                viewBox="0 0 16 20"
                fill="none"
                stroke="currentColor"
                class="h-5 w-4"
                :class="data.cc_yes >= i ? 'text-up-500 dark:text-up-400' : 'opacity-30'"
                :key="i"
                v-for="i of ccThreshold - 1">
                <path d="M14 3A8 8 0 1014 17 10 10 0 0114 3" />
              </svg> -->
              <svg
                viewBox="0 0 12 20"
                fill="none"
                stroke="currentColor"
                class="-mr-0.5 h-5 w-3"
                :class="
                  data.cc_yes >= i
                    ? 'text-up-500 dark:text-up-400'
                    : 'fill-current text-sky-300 opacity-10 dark:text-gray-400'
                "
                :key="i"
                v-for="i of ccThreshold - 1">
                <path d="M5 2C-1 4-1 16 5 18h5C4 16 4 4 10 2Z" />
              </svg>
            </template>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              stroke="currentColor"
              class="size-5"
              :class="
                data.cc_yes >= ccThreshold || !ccThreshold
                  ? 'text-up-500 opacity-85 dark:text-up-400'
                  : 'text-sky-300 opacity-10 dark:text-gray-400'
              ">
              <path d="M10 1a9 9 0 10.1 0" />
              <path
                v-if="data.cc_yes >= ccThreshold || !ccThreshold"
                d="M6 11l3.5 3L14 6"
                class="fill-none stroke-2 text-white dark:text-gray-900"></path>
            </svg>
            <!-- <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5"
              :class="data.cc_yes >= ccThreshold || !ccThreshold ? 'text-up-500 opacity-85 dark:text-up-400' : 'opacity-30'">
              <path d="M5 2C0 4 0 16 5 18h5C4 16 4 4 10 2Z" />
              <path d="M13 2c-7 2-7 14 0 16h1c7-2 7-14 0-16Z" fill="currentColor" stroke-linejoin="round" stroke-linecap="round" />
              <path d="M11 11 13.5 14l2.5-8" class="fill-none stroke-2 text-white dark:text-gray-900"></path>
            </svg> -->
          </div>
        </div>
        <template v-if="data.cc_quorum_denominator">
          <I18nT tag="div" keypath="constitutionality.requires" class="pb-5 text-xs text-slate-600 dark:text-gray-400">
            <template #num>
              <span class="font-medium text-up-500 dark:text-up-400">
                {{ ccThreshold }}
              </span>
            </template>
            <template #yes>
              <span class="font-medium text-up-500 dark:text-up-400"> '{{ t('yes') }}' </span>
            </template>
            <template #votes>
              {{ t('vote.n', ccThreshold) }}
            </template>
          </I18nT>

          <!-- <div class="pb-5 text-xs font-light">
            Requires <span class="font-medium text-up-500 dark:text-up-400">{{ ccThreshold }} 'Yes'</span> votes to pass
          </div> -->
          <!-- <div class="pb-4 text-right text-2xs">
            Target <span class="font-semibold text-up-500 dark:text-up-400">{{ ccThreshold }} 'Yes'</span>
          </div> -->
          <DataGridSection>
            <!-- <template #header>
              <DataGridSectionHeader class="mb-3" header="cc.votes" />
            </template> -->
            <DataGridSectionRow
              :key="hash"
              v-for="(cc, hash) of data.cc_members"
              hide-dots
              class="mt-1"
              :class="{ 'opacity-50': cc.vote == 'abstain' }">
              <template #title>
                <div class="flex items-center gap-1 text-xs">
                  <VImg :src="cc.image ? cc.image + '?v=4&s=20' : undefined" class="size-5 rounded" />
                  {{ cc.name }}
                </div>
              </template>
              <div
                class="relative h-5 w-21 truncate p-0.5 pr-1.5 pl-7 text-2xs font-light"
                :class="{ 'opacity-50': cc.vote == 'abstain' }">
                <svg
                  viewBox="0 0 84 20"
                  fill="none"
                  stroke="currentColor"
                  class="absolute inset-0"
                  :class="
                    cc.vote == 'yes'
                      ? 'text-up-500 dark:text-up-400'
                      : cc.vote == 'no'
                        ? 'text-down-500 dark:text-down-400'
                        : !cc.vote
                          ? 'fill-current text-sky-300 opacity-10 dark:text-gray-400'
                          : ''
                  ">
                  <path
                    d="M10 1a9 9 0 10.1 0"
                    :class="{
                      'fill-current opacity-85':
                        (cc.vote == 'yes' && data.cc_yes >= ccThreshold) ||
                        (cc.vote == 'no' && data.cc_no > data.cc_total - data.cc_abstain - ccThreshold),
                    }" />
                  <path
                    v-if="cc.vote"
                    :d="cc.vote == 'yes' ? 'M6 11l3.5 3L14 6' : cc.vote == 'no' ? 'M6.5 6.5l7 7m-7 0 7-7' : 'M6.5 10h7'"
                    :class="
                      (cc.vote == 'yes' && data.cc_yes >= ccThreshold) ||
                      (cc.vote == 'no' && data.cc_no > data.cc_total - data.cc_abstain - ccThreshold)
                        ? 'stroke-2 text-white dark:text-gray-900'
                        : null
                    " />
                  <path d="M20 1.5c5 5 5 12 0 17H77c8 0 8-17 0-17Z" />
                </svg>
                {{ t(cc.vote || 'not_voted') }}
              </div>
            </DataGridSectionRow>
          </DataGridSection>
        </template>
        <I18nT v-else tag="div" keypath="voting.n_a.cc" class="mt-3 text-s text-slate-600 dark:text-gray-400">
          <template #type>
            <span class="capitalize">
              {{ t('gov_action.type.' + data.type) }}
            </span>
          </template>
        </I18nT>
        <!-- <DataGridSection>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="deposit" />
          </template>
          <DataGridSectionRow title="amount">
            <FormattedAmount :value="data.deposit" />
          </DataGridSectionRow>
          <DataGridSectionRow title="account.stake">
            <RouterLink :to="{ name: 'account', params: { id: data.stake_bech32 } }" class="max-w-30 min-w-0">
              <TextTruncate :text="data.stake_bech32" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </DataGridSectionRow>
        </DataGridSection> -->
      </VCard>
      <VCard class="order-3" dark>
        <div class="pb-1 text-lg font-semibold">
          {{ t(`voting.drep${status == 'active' || !data.drep_threshold ? '' : '_res'}`) }}
        </div>
        <VotingData
          :pos="drepData.pos"
          :neg="drepData.neg"
          :exc="drepData.exc"
          :threshold="drepData.threshold"
          :live-stake="drepData.liveStake"
          :pos-stake="drepData.posStake"
          :neg-stake="drepData.negStake"
          :excluded-stake="drepData.excludedStake"
          :pos-ratio="drepData.posRatio"
          :total-stake="data.drep_total_stake"
          v-if="data.drep_threshold" />
        <I18nT v-else tag="div" keypath="voting.n_a.drep" class="mt-3 text-s text-slate-600 dark:text-gray-400">
          <template #type>
            <span class="capitalize">
              {{ t('gov_action.type.' + data.type) }}
            </span>
          </template>
        </I18nT>
      </VCard>
      <VCard class="order-3" dark>
        <div class="flex pb-1 text-lg font-semibold">
          {{ t(`voting.pool${status == 'active' || !data.pool_threshold ? '' : '_res'}`) }}
        </div>
        <VotingData
          :pos="poolData.pos"
          :neg="poolData.neg"
          :exc="poolData.exc"
          :threshold="poolData.threshold"
          :live-stake="poolData.liveStake"
          :pos-stake="drepData.posStake"
          :neg-stake="drepData.negStake"
          :excluded-stake="poolData.excludedStake"
          :pos-ratio="poolData.posRatio"
          :total-stake="data.pool_total_stake"
          v-if="data.pool_threshold" />
        <I18nT v-else tag="div" keypath="voting.n_a.pool" class="mt-3 text-s text-slate-600 dark:text-gray-400">
          <template #type>
            <span class="capitalize">
              {{ t('gov_action.type.' + data.type) }}
            </span>
          </template>
        </I18nT>
      </VCard>
      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('gov_action.id') }}
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
        <div class="flex items-center text-sm text-slate-500 dark:text-gray-300">
          <template v-if="idHexView">
            <TextTruncate :text="data.tx_hash" highlight="font-medium text-amber-500 dark:text-amber-400" /><span
              class="font-light opacity-80"
              >#</span
            >{{ data.index }}
          </template>
          <TextTruncate
            v-else
            :text="data.bech32"
            :head-length="0"
            :tail-length="12"
            class="text-emerald-600 dark:text-emerald-400"
            highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
          <CopyToClipboard
            :text="idHexView ? `${data.tx_hash}#${data.index}` : data.bech32"
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
          <template #role="{ row: { voter_role } }">
            {{ t(voter_role == 'spo' ? 'pool' : voter_role == 'drep' ? 'drep' : 'cc_member') }}
          </template>
          <template #vote="{ row: { vote, json, invalidation } }">
            <VoteLabel :vote="vote" :comment="json?.body?.comment || json?.body?.summary" :invalid="invalidation" />
          </template>
          <template
            #voter="{ row: { voter, given_name, pool_name, bech32, image, voter_role, pool_ticker, has_script } }">
            <DataListPool
              v-if="voter_role == 'spo'"
              :name="pool_name"
              :bech32="bech32"
              :hash="voter"
              :ticker="pool_ticker" />
            <DataListDRep
              v-else-if="voter_role == 'drep'"
              :name="given_name"
              :bech32="bech32"
              :base16="22 + has_script + voter"
              :image="image" />
            <div v-else class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
              <VImg class="h-10 w-10" :src="image" imgClass="rounded-md" fallback-class="stroke-[0.5]" />
              <div class="min-w-0 font-medium">
                <TextTruncate
                  :text="given_name?.trim() || bech32"
                  :tail-length="given_name?.trim() ? 0 : 6"
                  class="mb-1.5" />
              </div>
            </div>
          </template>
          <template #tx="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #voting_power="{ row: { voting_power } }">
            <TooltipAmount v-if="voting_power >= 0" :value="voting_power" />
            <template v-else>–</template>
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
        <div v-else class="font-300 mt-7 px-2 text-sm opacity-70 sm:px-4">{{ t(`transaction.no_votes`) }}</div>
      </template>
      <template #details>
        <div v-if="data.abstract || data.motivation || data.rationale || data.references" class="-mt-4 wrap-anywhere">
          <div v-if="data.abstract">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('abstract') }}
            </div>
            <div
              v-html="data.abstract"
              class="prose prose-sm max-w-full rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:prose-invert dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.motivation">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('motivation') }}
            </div>
            <div
              v-html="data.motivation"
              class="prose prose-sm max-w-full rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:prose-invert dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.rationale">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('rationale') }}
            </div>
            <div
              v-html="data.rationale"
              class="prose prose-sm max-w-full rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:prose-invert dark:hover:bg-gray-700/20"></div>
          </div>
          <div v-if="data.references?.length">
            <div
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ t('references') }}
            </div>
            <ul
              class="prose prose-sm max-w-full rounded-lg bg-white/60 p-2 text-sm hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:prose-invert dark:hover:bg-gray-700/20">
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
        </div>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`gov_action.no_details`) }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import 'katex/dist/katex.css'

import { computed, ref, watch } from 'vue'

import FinishIcon from '@/assets/icons/finish.svg?component'
import InfoIcon from '@/assets/icons/info.svg?component'
import VotesIcon from '@/assets/icons/votes.svg?component'

import { t } from '@/i18n'
import { lastSyncTime, useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatDateTime, formatNumber } from '@/utils/formatter'
import {
  getEpochEndTime,
  getEpochStartTime,
  getGovActionStatus,
  getTabData,
  getTableCols,
  getTimeLeft,
  getUrl,
} from '@/utils/helper'

import ActionStatus from '@/components/ActionStatus.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListMeta from '@/components/DataListMeta.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataPagination from '@/components/DataPagination.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VImg from '@/components/VImg.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VoteLabel from '@/components/VoteLabel.vue'
import VotingData from '@/components/VotingData.vue'

type TabId = keyof typeof tabData

const statusColors = {
  ratified: 'text-teal-500 dark:text-teal-400',
  enacted: 'text-up-500 dark:text-up-400',
  expired: 'text-yellow-500 dark:text-yellow-400',
  failed: 'text-down-500 dark:text-down-400',
  closed: 'text-violet-500 dark:text-violet-400',
  completed: 'text-indigo-500 dark:text-indigo-400',
  active: 'text-sky-500 dark:text-sky-400',
  invalidated: 'text-yellow-600 dark:text-orange-300',
}

const tabData = getTabData({
  votes: {
    icon: VotesIcon,
    colList: [{ id: 'voter' }, { id: 'role' }, { id: 'vote' }, { id: 'voting_power' }, { id: 'tx' }, { id: 'meta' }],
    sortKeyMap: {
      tx: 'tx_time',
    },
  },
  details: {
    // icon: () => h('div', { class: 'text-xl leading-5 text-center aspect-square' }, 'ⓘ'),
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
      name: 'table_cols.gov_action.' + tabValue,
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

// watchEffect(() => {
//   const _data = data.value
//   if (_data) {

//   }
// })
// console.log(data.value!.expiry_epoch, getEpochEndTime(data.value!.expiry_epoch - 1), lastSyncTime.value)

const finalEpoch = computed(() => {
  const _data = data.value!

  return _data.ratified_epoch || _data.expired_epoch
})

const actionEpoch = computed(() => {
  const _data = data.value!

  return _data.enacted_epoch || _data.dropped_epoch
})

const expiryTime = computed(() => getEpochEndTime(data.value!.expiry_epoch - 1))

const status = computed<keyof typeof statusColors>(() => {
  const _data = data.value!

  return getGovActionStatus(
    _data.type,
    _data.enacted_epoch,
    _data.ratified_epoch,
    _data.dropped_epoch,
    _data.expired_epoch
  )
})

const votingProgress = computed(() => {
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
    const timing = lastSyncTime.value - _data.submission_time,
      duration = expiryTime.value - _data.submission_time

    val = Math.floor((timing / duration) * 100)
  }

  return val
})

const timeLeft = computed(() => getTimeLeft(expiryTime.value - lastSyncTime.value))

const ccThreshold = computed(() => {
  const _data = data.value!

  return Math.ceil(((_data.cc_total - _data.cc_abstain) * _data.cc_quorum_numerator) / _data.cc_quorum_denominator)
})

type VotingData = {
  id: string
  stake: number
}

const drepData = computed(() => {
  const _data = data.value!

  const pos: VotingData[] = [
      {
        id: 'yes',
        stake: +_data.drep_yes_stake,
      },
    ],
    neg: VotingData[] = [
      {
        id: 'no',
        stake: +_data.drep_no_stake,
      },
    ],
    exc: VotingData[] = [
      {
        id: 'abstain',
        stake: +_data.drep_abstain_stake,
      },
      {
        id: 'always_abstain',
        stake: +_data.drep_always_abstain_stake,
      },
      {
        id: 'dreps.inactive',
        stake: +_data.drep_inactive_stake,
      },
    ],
    noConfidenceData: VotingData = {
      id: 'gov_action.type.noconfidence',
      stake: +_data.drep_always_no_confidence_stake,
    }

  if (_data.type == 'noconfidence') {
    pos.push(noConfidenceData)
  } else {
    neg.push(noConfidenceData)
  }

  const excludedStake = exc.reduce((acc, vd) => acc + vd.stake, 0),
    liveStake = _data.drep_total_stake - excludedStake,
    posStake = pos.reduce((acc, vd) => acc + vd.stake, 0),
    posRatio = Math.round((posStake / liveStake) * 10_000) / 10_000,
    negStake = neg.reduce((acc, vd) => acc + vd.stake, 0)

  neg.push({
    id: 'not_voted',
    stake: liveStake - posStake - negStake,
  })

  return {
    pos,
    neg,
    exc,
    liveStake,
    posStake,
    negStake,
    excludedStake,
    posRatio,
    threshold: _data.drep_threshold == 1 ? 0.51 : _data.drep_threshold,
  }
})

const poolData = computed(() => {
  const _data = data.value!

  const pos: VotingData[] = [
      {
        id: 'yes',
        stake: +_data.pool_yes_stake,
      },
    ],
    neg: VotingData[] = [
      {
        id: 'no',
        stake: +_data.pool_no_stake,
      },
    ],
    exc: VotingData[] = [
      {
        id: 'abstain',
        stake: +_data.pool_abstain_stake,
      },
    ],
    noConfidenceData: VotingData = {
      id: 'gov_action.type.noconfidence',
      stake: +_data.pool_always_no_confidence_stake,
    },
    alwaysAbstainData: VotingData = {
      id: 'always_abstain',
      stake: +_data.pool_always_abstain_stake,
    },
    notVotedData: VotingData = {
      id: 'not_voted',
      stake: _data.pool_total_stake - _data.pool_yes_stake - _data.pool_no_stake - _data.pool_abstain_stake,
    }

  if (!_data.bootstrap_period) {
    notVotedData.stake -= noConfidenceData.stake + alwaysAbstainData.stake

    if (_data.type == 'NoConfidence') {
      pos.push(noConfidenceData)
    } else {
      neg.push(noConfidenceData)
    }

    if (_data.type == 'HardForkInitiation') {
      pos.push(alwaysAbstainData)
    } else {
      exc.push(alwaysAbstainData)
    }
  }

  const negStake = neg.reduce((acc, vd) => acc + vd.stake, 0)

  if (_data.bootstrap_period && _data.type != 'HardForkInitiation') {
    exc.push(notVotedData)
  } else {
    neg.push(notVotedData)
  }

  const excludedStake = exc.reduce((acc, vd) => acc + vd.stake, 0),
    liveStake = _data.pool_total_stake - excludedStake,
    posStake = pos.reduce((acc, vd) => acc + vd.stake, 0),
    posRatio = Math.round((posStake / liveStake) * 10_000) / 10_000

  return {
    pos,
    neg,
    exc,
    liveStake,
    posStake,
    negStake,
    excludedStake,
    posRatio,
    threshold: _data.pool_threshold == 1 ? 0.51 : _data.pool_threshold,
  }
})

watch(
  () => data.value?.bech32,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
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
  [
    () => data.value?.cc_yes,
    () => data.value?.cc_no,
    () => data.value?.cc_abstain,
    () => data.value?.drep_yes,
    () => data.value?.drep_no,
    () => data.value?.drep_abstain,
    () => data.value?.pool_yes,
    () => data.value?.pool_no,
    () => data.value?.pool_abstain,
    () => data.value?.ratified_epoch,
    () => data.value?.enacted_epoch,
    () => data.value?.dropped_epoch,
    () => data.value?.expired_epoch,
  ],
  () => {
    updateRows(setTabRows)
  }
)
</script>
