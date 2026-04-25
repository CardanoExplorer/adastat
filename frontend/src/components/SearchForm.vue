<template>
  <Transition
    enter-from-class="scale-120 opacity-0"
    enter-active-class="duration-300 ease-out"
    leave-active-class="duration-300 ease-out"
    leave-to-class="scale-120 opacity-0"
    @after-enter="onOpen">
    <section
      v-if="visible"
      class="fixed inset-0 z-80 mx-auto flex flex-col overflow-auto overscroll-none bg-sky-50/90 text-sm shadow-blur-xs shadow-slate-400 backdrop-blur-xs sm:bottom-auto sm:max-h-4/5 sm:w-300 sm:max-w-[80vw] sm:overflow-visible sm:rounded-b-3xl sm:backdrop-brightness-200 dark:bg-gray-900/90 dark:shadow-sky-800"
      role="search">
      <div class="flex flex-1 flex-col sm:min-h-0">
        <div
          class="sticky top-0 z-2 bg-sky-50 pt-6 pb-4 shadow-blur shadow-sky-50 sm:mx-auto sm:w-4/5 sm:pt-10 sm:pb-0 dark:bg-gray-900 dark:shadow-gray-900">
          <div
            class="absolute top-0 left-0 h-11 w-full bg-linear-to-b from-fuchsia-100/80 to-sky-50 sm:hidden dark:from-sky-950/80 dark:to-gray-900"></div>
          <div class="relative mb-6 flex h-10 items-center sm:hidden">
            <div class="mx-auto text-lg">{{ t('search') }}</div>
            <button
              class="absolute left-6 size-10 rotate-180 rounded-md bg-sky-100 p-3 text-slate-700 dark:bg-gray-800/50 dark:text-gray-300"
              @click="emit('close')">
              <ChevronIcon />
            </button>
          </div>
          <div
            class="group mx-2 flex items-center rounded-xl bg-white/70 focus-within:bg-white sm:m-0 dark:bg-gray-800/30 dark:focus-within:bg-gray-800/60">
            <SearchIcon class="m-1 size-10 p-3 text-slate-700 dark:text-gray-300" stroke-width="1.5" />
            <textarea
              ref="searchInput"
              rows="1"
              :placeholder="`${t('search.placeholder')}…`"
              :value="input"
              @input="onInput"
              @blur="onBlur"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              aria-autocomplete="none"
              data-lpignore="true"
              data-gramm="false"
              class="flex-1 resize-none overflow-hidden leading-7 whitespace-nowrap outline-none selection:bg-fuchsia-50 placeholder:text-slate-400 placeholder:italic dark:selection:bg-sky-950 dark:placeholder:text-gray-600"
              @keydown.prevent.enter
              @keyup.enter="inputRef?.blur()"></textarea>
            <div class="flex size-10 shrink-0 items-center justify-center">
              <SpinnerIcon v-if="fetchProgress" class="size-3 animate-spin stroke-2" />
              <button
                v-else-if="input"
                class="size-8 rounded-md p-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-100"
                @click="
                  () => {
                    error = false
                    data = null
                    input = ''
                    inputRef!.focus()
                  }
                ">
                <CloseIcon />
              </button>
            </div>
          </div>
          <div class="mt-8 overflow-x-auto sm:mx-3">
            <div v-if="data && !exactMatch && !error" class="mx-3 flex w-max items-center gap-2 text-s sm:m-0">
              <button
                class="rounded-full border border-sky-100 p-1 px-3 whitespace-nowrap dark:border-gray-800"
                :class="{ 'bg-sky-100 dark:bg-gray-800': itemType === '' }"
                @click="showAll()">
                {{ t('search.all_results') }}
              </button>
              <button
                :key="type"
                v-for="type of dataTypes"
                class="rounded-full border border-sky-100 p-1 px-3 whitespace-nowrap dark:border-gray-800"
                :class="{ 'bg-sky-100 dark:bg-gray-800': itemType === type }"
                @click="itemType = type">
                {{ t(type) }} ({{ data[type].items.length > 99 ? '99+' : data[type].items.length }})
              </button>
            </div>
          </div>
        </div>
        <div
          class="pointer-events-none absolute bottom-0 left-0 hidden h-20 w-full bg-radial-[farthest-side_at_50%_100%] from-fuchsia-100 sm:block dark:from-sky-950"></div>

        <div
          class="mt-2 flex min-h-0 flex-1 flex-col scrollbar-track-fuchsia-100 sm:my-4 sm:-mr-6 sm:overflow-auto sm:overscroll-none sm:mask-[linear-gradient(to_bottom,transparent_0.5rem,black_1.5rem,black_calc(100%-1.5rem),transparent_calc(100%-0.5rem))] sm:pt-2 sm:pb-4 dark:scrollbar-track-sky-900">
          <div class="mx-2 flex flex-1 flex-col sm:ml-[calc(min(60rem,64vw)/8)] sm:w-[min(60rem,64vw)]">
            <template v-if="error">
              <div class="mx-2 flex h-10 items-center font-medium">
                {{ t('search.not_found') }}
              </div>
              <div class="h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
              <div class="mx-4 mt-12 flex text-s">
                <BulbIcon class="mt-1 mr-3 size-7 text-yellow-500 dark:text-yellow-600" />
                <div>
                  <div class="mb-0.5 font-medium">{{ t('need_help') }}</div>
                  <div class="text-slate-600 dark:text-gray-400">
                    {{ t('search.tip') }}
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="data">
              <template v-if="exactMatch">
                <div class="mx-2 flex h-10 items-center font-medium">
                  <div>
                    <I18nT keypath="search.exact_match">
                      <template #item>
                        <span class="capitalize"> {{ t(exactMatch) }} </span>
                      </template>
                    </I18nT>
                  </div>
                </div>
                <div class="mb-4 h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
              </template>
              <template v-else-if="itemType === ''">
                <div class="mx-4 mt-4 flex h-10 items-center text-s text-slate-600 dark:text-gray-400">
                  {{ t('search.best_matches') }} 🔥
                </div>
                <div class="-mb-4 h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
              </template>
              <template :key="r" v-for="r of moreCategoryQty && itemType === '' ? 2 : 1">
                <div class="mx-2 mt-8 text-s">
                  <template :key="type" v-for="type of dataTypes">
                    <template v-if="r == 2 && data[type].items.length > 1">
                      <div class="mx-2 mt-2 flex h-10 items-center text-slate-600 dark:text-gray-400">
                        {{ t(type) }}
                      </div>
                      <div class="mb-4 h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
                    </template>
                    <div
                      v-if="r == 1 ? itemType === '' || itemType === type : data[type].items.length > 1"
                      :class="{ 'mb-12': r == 2 }">
                      <div
                        :key="i"
                        v-for="(item, i) of r == 1
                          ? itemType === ''
                            ? data[type].items.slice(0, 1)
                            : data[type].items
                          : data[type].items.slice(1, data[type].expanded ? data[type].items.length : showMoreFrom)"
                        class="mb-4 flex gap-2">
                        <DataListHolder
                          v-if="type == 'accounts' || type == 'addresses'"
                          :bech32="item.bech32 || item.address"
                          :base16="item.base16"
                          :balance="item.balance" />
                        <DataListPool
                          v-else-if="type == 'pools'"
                          :bech32="item.bech32"
                          :hash="item.hash"
                          :name="item.name"
                          :ticker="item.ticker" />
                        <DataListDRep
                          v-else-if="type == 'dreps'"
                          :bech32="item.bech32"
                          :base16="item.base16"
                          :name="item.given_name"
                          :image="item.image" />
                        <DataListToken
                          v-else-if="type == 'tokens'"
                          :fingerprint="item.fingerprint"
                          :asset_name_hex="item.asset_name_hex"
                          :asset_name="item.asset_name"
                          :name="item.name"
                          :ticker="item.ticker"
                          :image="item.image"
                          :genuine="item.genuine" />
                        <RouterLink
                          v-else-if="type == 'blocks'"
                          :to="{ name: 'block', params: { id: item.epoch_no == null ? 'genesis' : item.no } }"
                          class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
                          <BlockIcon class="mt-0.5 h-10 w-10" stroke-width="0.5" />
                          <div class="min-w-0">
                            <TextTruncate :text="item.hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
                            <div class="font-normal">
                              {{ item.epoch_no == null ? t('block.genesis') : formatNumber(item.no) }}
                            </div>
                          </div>
                        </RouterLink>
                        <RouterLink
                          v-else-if="type == 'transactions'"
                          :to="{ name: 'transaction', params: { id: item.hash } }"
                          class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
                          <TransactionIcon class="mt-0.5 h-10 w-10" stroke-width="0.5" />
                          <div class="min-w-0">
                            <TextTruncate :text="item.hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
                          </div>
                        </RouterLink>
                        <RouterLink
                          v-else-if="type == 'epochs'"
                          :to="{ name: 'epoch', params: { id: item.no } }"
                          class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
                          <div class="mt-0.5 h-10 w-10 overflow-hidden rounded-md">
                            <img
                              :src="getEpochImage(item.no)"
                              :alt="t(`epoch.phase.${getEpochName(item.no)}`)"
                              class="h-12 w-12" />
                          </div>
                          <div class="min-w-0">
                            <div class="mb-1.5 font-medium text-sky-500 underline dark:text-cyan-400">
                              {{ formatNumber(item.no) }}
                            </div>
                            <div class="text-xs font-light">
                              {{ t(`epoch.phase.${getEpochName(item.no)}`) }}
                            </div>
                          </div>
                        </RouterLink>
                        <RouterLink
                          v-else-if="type == 'policies'"
                          :to="{ name: 'policy', params: { id: item.hash } }"
                          class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
                          <PolicyIcon class="mt-0.5 h-10 w-10" stroke-width="0.5" />
                          <div class="min-w-0">
                            <TextTruncate :text="item.hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
                          </div>
                        </RouterLink>
                        <RouterLink
                          v-else-if="type == 'gov_actions'"
                          :to="{ name: 'gov_action', params: { id: item.bech32 } }"
                          class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
                          <GovActionIcon class="mt-0.5 h-10 w-10" stroke-width="0.5" />
                          <div class="min-w-0">
                            <TextTruncate :text="item.title" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
                          </div>
                        </RouterLink>

                        <div
                          v-if="r == 1 && itemType === ''"
                          class="flex h-4.5 items-center rounded bg-sky-100 px-1.5 text-3xs dark:bg-gray-800">
                          {{ t(itemTypes[type].name) }}
                        </div>
                      </div>
                      <div v-if="r == 2 && !data[type].expanded">
                        <button
                          class="ml-13 text-xs font-light text-slate-600 underline decoration-dashed dark:text-gray-400"
                          @click="data[type].expanded = true">
                          {{ t('show.more') }}
                        </button>
                      </div>
                    </div>
                  </template>
                </div>

                <div v-if="moreCategoryQty && r == 1 && itemType === ''" class="mx-8 mt-8 mb-2 flex text-s">
                  <BulbIcon class="mt-1 mr-3 size-7 text-yellow-500 dark:text-yellow-600" />
                  <div>
                    <div class="mb-0.5 font-medium">{{ t('search.need_more') }}</div>
                    <div class="text-slate-600 dark:text-gray-400">
                      {{ t('search.need_more.tip') }}
                    </div>
                  </div>
                </div>
              </template>
            </template>
            <template v-else>
              <div class="mx-2 flex h-10 items-center font-medium">
                {{ t('activity.recent') }}
                <button
                  v-if="activityItems.length"
                  class="ml-auto size-10 p-3 opacity-70 hover:opacity-100"
                  :title="t('clear')"
                  @click="confirmAndRemove()">
                  <TrashIcon stroke-width="1.5" />
                </button>
              </div>
              <div class="mb-3 h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
              <template v-if="activityItems.length">
                <div :key="item.text" v-for="item of activityItems" class="mt-2 ml-2 flex items-center gap-1">
                  <button
                    class="size-7 shrink-0 rounded-md stroke-2 p-2 text-red-600 hover:p-1.5 dark:text-red-400"
                    @click="confirmAndRemove(item)">
                    <CloseIcon />
                  </button>
                  <RouterLink
                    v-if="(item as ActivityItemLink).id"
                    :to="{ name: (item as ActivityItemLink).name, params: { id: (item as ActivityItemLink).id } }"
                    class="flex max-w-40 truncate">
                    <TextTruncate
                      :text="item.text"
                      :tail-length="0"
                      class="rounded-md p-1 px-2 hover:bg-sky-100 dark:hover:bg-gray-800" />
                  </RouterLink>
                  <button
                    v-else
                    class="flex max-w-40 truncate"
                    @click="
                      () => {
                        input = item.text
                        addActivityItem({ text: input })
                      }
                    ">
                    <TextTruncate
                      :text="item.text"
                      :tail-length="0"
                      class="rounded-md p-1 px-2 hover:bg-sky-100 dark:hover:bg-gray-800" />
                  </button>
                </div>
              </template>
              <div v-else class="mx-4 text-s">
                <div class="text-slate-600 dark:text-gray-400">{{ t('search.no_activity') }}</div>
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

            <div class="h-12 sm:h-16 lg:h-20"></div>

            <div class="mt-auto h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
            <div class="z-1 mx-2 mt-4 flex flex-wrap-reverse gap-x-2 text-s sm:mt-6">
              <div class="text-slate-700 dark:text-gray-300">
                <I18nT keypath="promo.love" tag="div">
                  <template #love>
                    <svg viewBox="0 0 30 30" fill="none" class="mx-0.5 inline-block size-5">
                      <path d="M9.5602 2.63745L2.9668 3.95613L7.91185 8.90119L9.5602 2.63745Z" fill="#FB2C36" />
                      <path
                        d="M7.2521 0.65926L2.63672 3.62629L9.5598 2.30761L11.2081 0.32959L7.2521 0.65926Z"
                        fill="#E7000B" />
                      <path
                        d="M14.8357 7.91201L9.89062 2.30761L11.539 0.32959L15.1653 4.94497L20.1104 1.97794L14.8357 7.91201Z"
                        fill="#C10007" />
                      <path d="M24.0654 0L20.1094 1.97802L26.7028 3.95604L28.6808 2.63736L24.0654 0Z" fill="#E7000B" />
                      <path d="M28.6816 2.96704L27.0332 4.28572L30.0002 11.8681L28.6816 2.96704Z" fill="#C10007" />
                      <path d="M15.1641 8.24168L20.1091 2.30762L22.0871 9.23069L15.1641 8.24168Z" fill="#FB2C36" />
                      <path d="M26.3735 4.28564L20.4395 2.30762L22.4175 8.90102L26.3735 4.28564Z" fill="#FFC9C9" />
                      <path d="M30.0004 12.5276L22.418 9.23086L26.7037 4.61548L30.0004 12.5276Z" fill="#FFA2A2" />
                      <path d="M0 12.5275L2.63736 3.95605L7.58242 9.23078L0 12.5275Z" fill="#FF6467" />
                      <path d="M14.5059 8.24185L8.24219 8.90119L9.89054 2.63745L14.5059 8.24185Z" fill="#E7000B" />
                      <path d="M11.8689 15.4946L0.660156 12.5276L7.58323 9.56055L11.8689 15.4946Z" fill="#FFA2A2" />
                      <path d="M14.5055 8.57153L7.91211 9.23087L12.1978 15.1649L14.5055 8.57153Z" fill="#FF6467" />
                      <path d="M17.4724 15.4945H12.5273L14.835 8.90112L17.4724 15.4945Z" fill="#FFC9C9" />
                      <path
                        d="M15.1641 8.57153C16.0981 10.8792 17.6696 14.9012 17.8014 15.1649L22.0871 9.56054L15.1641 8.57153Z"
                        fill="#E7000B" />
                      <path d="M18.1328 15.4946L22.4185 9.56055L29.3416 12.5276L18.1328 15.4946Z" fill="#FB2C36" />
                      <path d="M8.24176 21.0989L0 12.8572L11.8681 15.8242L8.24176 21.0989Z" fill="#FB2C36" />
                      <path d="M21.4295 21.0989L18.1328 15.8242L30.0009 12.8572L21.4295 21.0989Z" fill="#C10007" />
                      <path d="M14.5063 27.6923L8.57227 21.4285L12.1986 16.1538L14.5063 27.6923Z" fill="#FF6467" />
                      <path d="M17.8014 16.1538L15.1641 27.6923L21.0981 21.4285L17.8014 16.1538Z" fill="#FB2C36" />
                      <path d="M12.5273 15.8242L14.835 27.6924L17.4724 15.8242H12.5273Z" fill="#FFA2A2" />
                    </svg>
                  </template>
                </I18nT>
                <I18nT keypath="promo.pool" tag="div">
                  <template #pool>
                    <RouterLink
                      v-if="networkId === 'mainnet'"
                      :to="{ name: 'pool', params: { id: '77b0a93c26ac65be36e9a9f220f9a43cbc57d705fc5d8f1de5fdeea1' } }"
                      class="font-medium text-blue-500 underline dark:text-sky-400"
                      >STAT</RouterLink
                    >
                    <a
                      v-else
                      href="https://adastat.net/pools/77b0a93c26ac65be36e9a9f220f9a43cbc57d705fc5d8f1de5fdeea1"
                      class="font-medium text-blue-500 underline dark:text-sky-400"
                      target="_blank"
                      >STAT</a
                    >
                  </template>
                </I18nT>
              </div>
              <div class="ml-auto flex gap-2">
                <template v-for="(link, id) of socialLinks">
                  <a
                    v-if="link"
                    :key="id"
                    :href="link"
                    :title="t(`social.${id}`)"
                    class="w-10 p-2 opacity-80 transition-transform hover:scale-110 hover:opacity-100"
                    target="_blank"
                    rel="noopener noreferrer nofollow">
                    <component :is="socialIcons[id]" />
                  </a>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div
          class="pointer-events-none sticky bottom-0 z-1 mt-6 shadow-blur shadow-sky-50 sm:hidden dark:shadow-gray-900"></div>
      </div>

      <button
        ref="closeButton"
        class="absolute top-0 right-0 hidden size-10 rounded-md bg-fuchsia-50 py-3 text-slate-700 hover:bg-fuchsia-100 sm:top-3 sm:-right-14 sm:block dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-sky-950"
        @click="emit('close')">
        <CloseIcon class="mx-auto size-4 rotate-180 stroke-2 pointer-fine:hidden" />
        <div class="hidden text-center text-s leading-4 pointer-fine:block">Esc</div>
      </button>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'

import BlockIcon from '@/assets/icons/blocks.svg?component'
import BulbIcon from '@/assets/icons/bulb.svg?component'
import ChevronIcon from '@/assets/icons/chevron.svg?component'
import CloseIcon from '@/assets/icons/close.svg?component'
import GithubIcon from '@/assets/icons/github.svg?component'
import GovActionIcon from '@/assets/icons/menu_actions.svg?component'
import PolicyIcon from '@/assets/icons/script.svg?component'
import SearchIcon from '@/assets/icons/search.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'
import TelegramIcon from '@/assets/icons/telegram.svg?component'
import TrashIcon from '@/assets/icons/trash.svg?component'
import TransactionIcon from '@/assets/icons/wallet_swap.svg?component'
import XIcon from '@/assets/icons/x.svg?component'
import YoutubeIcon from '@/assets/icons/youtube.svg?component'

import { currency } from '@/i18n'
import { t } from '@/i18n'
import type { ApiResponse, ApiResponseSuccess } from '@/utils/api'
import { useDebounce } from '@/utils/composable'
import { formatNumber } from '@/utils/formatter'
import { type AnyObject, getEpochImage, getEpochName } from '@/utils/helper'
import { keyDownSymbol } from '@/utils/injectionSymbols'

import DataListDRep from './DataListDRep.vue'
import DataListHolder from './DataListHolder.vue'
import DataListPool from './DataListPool.vue'
import DataListToken from './DataListToken.vue'
import TextTruncate from './TextTruncate.vue'

type ActivityItemLink = {
  text: string
  name: string
  id: string
}

type ActivityItemSearch = { text: string }

type ActivityItem = ActivityItemLink | ActivityItemSearch

const { visible = false } = defineProps<{
  visible?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const networkId = import.meta.env.VITE_NETWORK_ID

const isTouch = 'ontouchstart' in window || window.navigator.maxTouchPoints > 0

const itemTypes = {
  epochs: { name: 'epoch', id: 'no' },
  blocks: { name: 'block', id: 'no' },
  transactions: { name: 'transaction', id: 'hash' },
  accounts: { name: 'account', id: 'bech32' },
  addresses: { name: 'address', id: 'address' },
  tokens: { name: 'token', id: 'fingerprint' },
  policies: { name: 'policy.token', id: 'hash' },
  pools: { name: 'pool', id: 'bech32' },
  dreps: { name: 'drep', id: 'bech32' },
  gov_actions: { name: 'gov_action', id: 'bech32' },
}

const socialIcons = {
  github: GithubIcon,
  x: XIcon,
  telegram: TelegramIcon,
  youtube: YoutubeIcon,
}

const socialLinks = {
  github: 'https://github.com/CardanoExplorer',
  x: 'https://x.com/ada_stat',
  telegram: 'https://t.me/CardanoExplorer',
  youtube: 'https://www.youtube.com/@CardanoExplorer',
}

const showMoreFrom = 4

const keyDown = inject(keyDownSymbol)!

const inputRef = useTemplateRef('searchInput'),
  animationEnd = ref<boolean>(),
  fetchProgress = ref<boolean>(),
  exactMatch = ref(''),
  resultQty = ref(0),
  moreCategoryQty = ref(0),
  itemType = ref<keyof typeof itemTypes | ''>(''),
  error = ref<boolean>(),
  data = ref<Record<keyof typeof itemTypes, AnyObject> | null>(),
  input = ref(''),
  activityItems = ref<ActivityItem[]>([])

const dataTypes = computed(() => {
  const _data = data.value

  if (_data) {
    const _dataTypes = Object.keys(_data) as (keyof typeof _data)[]

    _dataTypes.sort((a, b) => _data[a].items.length - _data[b].items.length)

    return _dataTypes
  }

  return []
})

const activityKey = 'search_activity'

const _activity = localStorage.getItem(activityKey)

if (_activity) {
  try {
    const _activityItems = JSON.parse(_activity)

    for (const item of _activityItems) {
      activityItems.value.push(
        item.id
          ? {
              text: item.text,
              name: item.name,
              id: item.id,
            }
          : { text: item.text }
      )
    }
  } catch {}
}

const addActivityItem = (newItem: ActivityItem) => {
  const _activityItems = activityItems.value

  if (newItem.text.length >= 3 && newItem.text.length <= 200 && newItem.text != _activityItems[0]?.text) {
    const newActivityItems = [newItem]

    for (let i = 0; i < _activityItems.length; i++) {
      const item = _activityItems[i] as ActivityItemLink

      if (
        // (i || item.id) &&
        newActivityItems.length < 5 &&
        (item.text != newItem.text ||
          item.name != (newItem as ActivityItemLink).name ||
          item.id != (newItem as ActivityItemLink).id)
      ) {
        newActivityItems.push(item)
      }
    }

    localStorage.setItem(activityKey, JSON.stringify(newActivityItems))

    activityItems.value = newActivityItems
  }
}

const removeActivityItem = (oldItem: ActivityItem) => {
  const _activityItems = activityItems.value

  for (let i = 0; i < _activityItems.length; i++) {
    const item = _activityItems[i]!

    if (
      item.text == oldItem.text &&
      (item as ActivityItemLink).name == (oldItem as ActivityItemLink).name &&
      (item as ActivityItemLink).id == (oldItem as ActivityItemLink).id
    ) {
      _activityItems.splice(i, 1)

      break
    }
  }

  localStorage.setItem(activityKey, JSON.stringify(_activityItems))
}

const clearActivity = () => {
  activityItems.value = []

  localStorage.removeItem(activityKey)
}

const confirmAndRemove = (oldItem?: ActivityItem) => {
  if (window.confirm('Are you sure?')) {
    if (oldItem) {
      removeActivityItem(oldItem)
    } else {
      clearActivity()
    }
  }
}

let abortController: AbortController | null

const fetchApiData = async () => {
  abortController?.abort()

  const query = input.value.trim()

  let _resultQty = 0,
    _moreCategoryQty = 0

  if (query.length > 2) {
    const uri =
      import.meta.env.VITE_API_PATH +
      '/search.json?' +
      new URLSearchParams({
        query: query,
        currency: currency.value,
      })

    let json!: ApiResponse

    try {
      abortController = new AbortController()

      json = await (
        await fetch(uri, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            Accept: 'application/json',
          },
          signal: abortController.signal,
        })
      ).json()
    } catch {}

    if (json?.code == 200 || json?.code == 203) {
      const jsonData = (json as ApiResponseSuccess).data

      const _data = {} as NonNullable<typeof data.value>

      for (const type of Object.keys(itemTypes) as (keyof typeof itemTypes)[]) {
        const qty = jsonData[type]?.length
        if (qty) {
          _data[type] = {
            items: jsonData[type],
            expanded: qty <= showMoreFrom + 1,
          }

          _resultQty += qty

          if (qty > 1) {
            _moreCategoryQty++
          }
        }
      }

      error.value = !_resultQty
      data.value = _data
    } else {
      error.value = true
      data.value = null

      removeActivityItem({
        text: input.value,
      })
    }
  } else {
    error.value = false
    data.value = null
  }

  exactMatch.value = _resultQty == 1 ? itemTypes[Object.keys(data.value!)[0] as keyof typeof itemTypes].name : ''
  resultQty.value = _resultQty
  moreCategoryQty.value = _moreCategoryQty
  itemType.value = ''

  fetchProgress.value = false
}

const { debounce: search } = useDebounce(fetchApiData, 500)

const showAll = () => {
  itemType.value = ''

  for (const type of dataTypes.value) {
    const dataType = data.value![type]
    dataType.expanded = dataType.items.length <= showMoreFrom + 1
  }
}

const onOpen = () => {
  if (!isTouch) {
    inputRef.value?.focus()
  }

  requestAnimationFrame(() => {
    if (!isTouch) {
      inputRef.value?.select()
    }

    animationEnd.value = true
  })
}

const onInput = (event: Event) => {
  input.value = (event.target as HTMLTextAreaElement)?.value.trim().replace(/(?:\r\n|\r|\n)/g, '')
}

const onBlur = () => {
  addActivityItem({
    text: input.value,
  })
}

const keyDownHandler = watch(keyDown, (val) => {
  if (val.key == 'Escape') {
    emit('close')
  }
})

watch(input, (_input) => {
  if (_input) {
    fetchProgress.value = true
  }

  search()
})

watch(
  () => visible,
  (val) => {
    if (val) {
      keyDownHandler.resume()
    } else {
      keyDownHandler.pause()
    }
  },
  {
    immediate: true,
  }
)
</script>
