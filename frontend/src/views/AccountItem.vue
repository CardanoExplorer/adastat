<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1 flex flex-col">
        <div class="flex items-center">
          <h1 class="truncate text-2xl font-medium">
            {{ t('account.stake') }}
          </h1>
          <WatchlistToggle
            type="account"
            :data="data.bech32"
            :legacy-data="data.base16.slice(2)"
            class="ml-auto h-9 w-9 p-2" />
        </div>
        <div v-if="data.adahandle" class="flex items-center text-xl font-medium">
          <AdaHandleIcon class="mr-px h-4 text-green-500" />{{ data.adahandle }}
        </div>
        <div class="mt-auto flex pt-10">
          <div class="mr-1 w-1/2 min-w-max pr-1 text-right text-2xs">
            <div class="opacity-70">{{ t('stake.live') }}</div>
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
          <div class="w-1/2 pl-1.5">{{ t('pool') }}</div>
          <div class="w-1/2 pr-1.5 text-right">{{ t('drep') }}</div>
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

            <DataListPool
              :name="data.pool_name"
              :bech32="data.pool_bech32"
              :hash="data.pool_hash"
              :ticker="data.pool_ticker"
              class="h-11"
              :class="{ 'text-amber-500 dark:text-amber-400': !data.pool_bech32 }">
              {{ t('pool.no') }}
            </DataListPool>
          </div>
          <div class="relative z-1 rounded-md bg-white p-1 pr-1.5 pl-5 text-right dark:bg-gray-800">
            <div class="absolute top-1 left-1 h-2 w-2 rounded-full bg-sky-50 dark:bg-gray-900"></div>
            <DataListDRep
              :name="data.drep_given_name"
              :bech32="data.drep_bech32"
              :base16="data.drep_base16"
              :image="data.drep_image"
              class="h-11 flex-row-reverse"
              :class="{ 'text-amber-500 dark:text-amber-400': !data.pool_bech32 }">
              {{ t('drep.no') }}
            </DataListDRep>
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
          <DataGridSectionRow title="addresses">
            {{ formatNumber(data.address) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="nfts">
            {{ formatNumber(data.nft) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="tokens">
            {{ formatNumber(data.ft) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="rewards.earned">
            <FormattedAmount :value="data.total_reward_amount" />
          </DataGridSectionRow>
          <DataGridSectionRow title="rewards.unspent">
            <FormattedAmount :value="data.reward_balance" />
          </DataGridSectionRow>
          <DataGridSectionRow title="epochs.with_rewards">
            {{ formatNumber(data.total_member + data.total_leader) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <VCard class="order-3 sm:col-span-2" dark>
        <div class="text-lg font-medium">{{ t('staking.timeline') }}</div>
        <div class="overflow-x-auto scrollbar-thin">
          <div class="mx-auto w-max px-4 pt-8">
            <div class="flex gap-10 text-center">
              <div
                class="relative size-36 shrink-0 rounded-lg border border-indigo-600 p-2.5 opacity-70 dark:border-indigo-400">
                <div class="flex h-full flex-col justify-between">
                  <RouterLink
                    v-if="data.previous_pool_hash"
                    :to="{ name: 'pool', params: { id: data.previous_pool_hash } }"
                    class="block">
                    <div class="mx-auto -mt-8 mb-0.5 h-10 w-12 bg-white px-1 dark:bg-gray-900">
                      <img
                        class="size-10 rounded-md"
                        :src="getUrl(`/images/pools/${data.previous_pool_bech32}.webp`)" />
                    </div>
                    <div class="truncate font-light">
                      {{ t('pool') }}
                      <span class="font-medium text-sky-500 underline dark:text-cyan-400">{{
                        data.previous_pool_ticker?.trim() ||
                        data.previous_pool_name?.trim() ||
                        data.previous_pool_bech32
                      }}</span>
                    </div>
                  </RouterLink>
                  <div v-else class="text-amber-500 dark:text-amber-400">
                    <div class="-mt-8 mb-0.5 h-10"></div>
                    {{ t('pool.no') }}
                  </div>
                  <div class="font-medium text-indigo-600 dark:text-indigo-400">{{ t('previous') }}</div>
                  <div class="flex items-center justify-between gap-2">
                    <DoneIcon class="size-7 text-indigo-600 opacity-70 dark:text-indigo-400" />
                    <div class="text-right">
                      <div class="text-3xs opacity-70">{{ t('stake') }}</div>
                      <TooltipAmount :value="data.previous_stake || 0" class="text-sm font-medium" />
                    </div>
                  </div>
                  <div class="text-2xs opacity-70">{{ t('last') }}</div>
                </div>
                <div class="inline-block bg-white px-1 dark:bg-gray-900">
                  <div class="rounded bg-indigo-300 px-1.5 text-2xs font-medium dark:bg-indigo-700">
                    {{ t('epoch') }} {{ apiTip.epoch_no - 1 }}
                  </div>
                </div>
                <div
                  class="absolute bottom-4 -left-4 h-1 w-2 border-b border-fuchsia-600 dark:border-fuchsia-400"></div>
                <div class="absolute bottom-4 left-full h-10 w-8 bg-white dark:bg-gray-900">
                  <div class="mt-6 h-4 rounded-tl border-t border-l border-indigo-600 dark:border-indigo-400"></div>
                  <div
                    class="ml-2 box-content h-6 w-3 rounded-tr border-t border-r border-fuchsia-600 dark:border-fuchsia-400"></div>
                  <div
                    class="mt-px ml-4.5 h-2 w-1.25 bg-fuchsia-600 [clip-path:polygon(50%_100%,100%_0,0_0)] dark:bg-fuchsia-400"></div>
                </div>
              </div>
              <div class="relative size-36 shrink-0 rounded-lg border border-emerald-600 p-2.5 dark:border-emerald-400">
                <div class="flex h-full flex-col justify-between">
                  <RouterLink
                    v-if="data.active_pool_hash"
                    :to="{ name: 'pool', params: { id: data.active_pool_hash } }"
                    class="block">
                    <div class="mx-auto -mt-8 mb-0.5 h-10 w-12 bg-white px-1 dark:bg-gray-900">
                      <img class="size-10 rounded-md" :src="getUrl(`/images/pools/${data.active_pool_bech32}.webp`)" />
                    </div>
                    <div class="truncate font-light">
                      {{ t('pool') }}
                      <span class="font-medium text-sky-500 underline dark:text-cyan-400">{{
                        data.active_pool_ticker?.trim() || data.active_pool_name?.trim() || data.active_pool_bech32
                      }}</span>
                    </div>
                  </RouterLink>
                  <div v-else class="text-amber-500 dark:text-amber-400">
                    <div class="-mt-8 mb-0.5 h-10"></div>
                    {{ t('pool.no') }}
                  </div>
                  <div class="font-medium text-emerald-600 dark:text-emerald-400">{{ t('active') }}</div>
                  <div class="flex items-center justify-between gap-2">
                    <ActivityIcon class="size-7 text-emerald-600 opacity-70 dark:text-emerald-400" />
                    <div class="text-right">
                      <div class="text-3xs opacity-70">{{ t('stake') }}</div>
                      <TooltipAmount :value="data.active_stake || 0" class="text-sm font-medium" />
                    </div>
                  </div>
                  <div class="text-2xs opacity-70">{{ t('current') }}</div>
                </div>
                <div class="inline-block bg-white px-1 dark:bg-gray-900">
                  <div class="rounded bg-emerald-300 px-1.5 text-2xs font-medium dark:bg-emerald-700">
                    {{ t('epoch') }} {{ apiTip.epoch_no }}
                  </div>
                </div>
                <div class="absolute bottom-2 left-full h-16 w-8 bg-white dark:bg-gray-900">
                  <div
                    class="mt-6 h-10 rounded-tl border-t border-l border-dashed border-emerald-600 dark:border-emerald-400"></div>
                  <div
                    class="-mt-6 ml-2 box-content h-10 w-3 rounded-tr border-t border-r border-dashed border-indigo-600 dark:border-indigo-400"></div>
                  <div
                    class="mt-px ml-4.5 h-2 w-1.25 bg-indigo-600 [clip-path:polygon(50%_100%,100%_0,0_0)] dark:bg-indigo-400"></div>
                </div>
              </div>
              <div
                class="relative size-36 shrink-0 rounded-lg border border-dashed border-yellow-600 p-2 py-2.5 dark:border-yellow-400">
                <div class="flex h-full flex-col justify-between">
                  <RouterLink
                    v-if="data.snapshot_pool_hash"
                    :to="{ name: 'pool', params: { id: data.snapshot_pool_hash } }"
                    class="block">
                    <div class="mx-auto -mt-8 mb-0.5 h-10 w-12 bg-white px-1 dark:bg-gray-900">
                      <img
                        class="size-10 rounded-md"
                        :src="getUrl(`/images/pools/${data.snapshot_pool_bech32}.webp`)" />
                    </div>
                    <div class="truncate font-light">
                      {{ t('pool') }}
                      <span class="font-medium text-sky-500 underline dark:text-cyan-400">{{
                        data.snapshot_pool_ticker?.trim() ||
                        data.snapshot_pool_name?.trim() ||
                        data.snapshot_pool_bech32
                      }}</span>
                    </div>
                  </RouterLink>
                  <div v-else class="text-amber-500 dark:text-amber-400">
                    <div class="-mt-8 mb-0.5 h-10"></div>
                    {{ t('pool.no') }}
                  </div>
                  <div class="font-medium text-yellow-600 dark:text-yellow-400">{{ t('snapshot') }}</div>
                  <div class="flex items-center justify-between gap-2">
                    <SnapshotIcon class="size-7 text-yellow-600 opacity-70 dark:text-yellow-400" />
                    <div class="text-right">
                      <div class="text-3xs opacity-70">{{ t('stake') }}</div>
                      <TooltipAmount :value="data.snapshot_stake || 0" class="text-sm font-medium" />
                    </div>
                  </div>
                  <div class="text-2xs opacity-70">{{ t('next') }}</div>
                </div>
                <div class="inline-block bg-white px-1 dark:bg-gray-900">
                  <div class="rounded bg-yellow-300 px-1.5 text-2xs font-medium dark:bg-yellow-700">
                    {{ t('epoch') }} {{ apiTip.epoch_no + 1 }}
                  </div>
                </div>
                <div class="absolute bottom-12 left-full h-10 w-8 bg-white dark:bg-gray-900">
                  <div
                    class="mt-6 h-4 rounded-tl border-t border-l border-dashed border-yellow-600 dark:border-yellow-400"></div>
                  <div
                    class="ml-2 box-content h-14 w-3 rounded-tr border-t border-r border-dashed border-emerald-600 dark:border-emerald-400"></div>
                  <div
                    class="mt-px ml-4.5 h-2 w-1.25 bg-emerald-600 [clip-path:polygon(50%_100%,100%_0,0_0)] dark:bg-emerald-400"></div>
                </div>
              </div>
              <div
                class="relative size-36 shrink-0 rounded-lg border border-dashed border-gray-600 p-2 py-2.5 dark:border-gray-400">
                <div class="flex h-full flex-col justify-between">
                  <RouterLink
                    v-if="data.pool_hash"
                    :to="{ name: 'pool', params: { id: data.pool_hash } }"
                    class="block">
                    <div class="mx-auto -mt-8 mb-0.5 h-10 w-12 bg-white px-1 dark:bg-gray-900">
                      <img class="size-10 rounded-md" :src="getUrl(`/images/pools/${data.pool_bech32}.webp`)" />
                    </div>
                    <div class="truncate font-light">
                      {{ t('pool') }}
                      <span class="font-medium text-sky-500 underline dark:text-cyan-400">{{
                        data.pool_ticker?.trim() || data.pool_name?.trim() || data.pool_bech32
                      }}</span>
                    </div>
                  </RouterLink>
                  <div v-else class="text-gray-500 dark:text-gray-400">
                    <div class="-mt-8 mb-0.5 h-10"></div>
                    {{ t('pool.no') }}
                  </div>
                  <div class="font-medium text-gray-600 dark:text-gray-400">{{ t('estimated') }}</div>
                  <div class="flex items-center justify-between gap-2">
                    <CirculationIcon class="size-7 text-gray-600 opacity-70 dark:text-gray-400" />
                    <div class="text-right">
                      <div class="text-3xs opacity-70">{{ t('stake') }}</div>
                      <TooltipAmount
                        :value="data.pool_hash ? +data.balance + +data.pending_reward_amount : 0"
                        class="text-sm font-medium" />
                    </div>
                  </div>
                  <div class="text-2xs opacity-70">{{ t('upcoming') }}</div>
                </div>
                <div class="inline-block bg-white px-1 dark:bg-gray-900">
                  <div class="rounded bg-gray-300 px-1.5 text-2xs font-medium dark:bg-gray-700">
                    {{ t('epoch') }} {{ apiTip.epoch_no + 2 }}
                  </div>
                </div>
                <div class="absolute bottom-16 left-full h-10 w-4 bg-white dark:bg-gray-900">
                  <div
                    class="mt-6 h-4 rounded-tl border-t border-l border-dashed border-gray-600 dark:border-gray-400"></div>
                  <div
                    class="ml-2 box-content h-18 w-2 border-t border-dashed border-yellow-600 opacity-50 dark:border-yellow-400"></div>
                </div>
              </div>
            </div>
            <div class="relative mt-5 h-8 overflow-hidden">
              <div class="absolute left-1/2 mt-0.5 -translate-x-1/2 transform">
                <div class="grid w-max grid-cols-5 justify-center gap-8">
                  <div class="rounded-lg border border-gray-600 opacity-20 dark:border-gray-400"></div>
                  <div
                    class="flex min-w-36 shrink-0 items-end gap-2 rounded-lg border border-fuchsia-600 p-1 px-2 text-3xs font-light opacity-70 dark:border-fuchsia-400">
                    {{ t('rewards.latest') }}
                    <TooltipAmount :value="data.distributed_reward_amount || 0" class="ml-auto text-sm font-medium" />
                  </div>
                  <div
                    class="flex min-w-36 shrink-0 items-end gap-2 rounded-lg border border-dashed border-indigo-600 p-1 px-2 text-3xs font-light dark:border-indigo-400">
                    {{ t('rewards.pending') }}
                    <TooltipAmount :value="data.pending_reward_amount || 0" class="ml-auto text-sm font-medium" />
                  </div>
                  <div
                    class="flex min-w-36 shrink-0 items-end gap-2 rounded-lg border border-dashed border-emerald-600 p-1 px-2 text-3xs font-light dark:border-emerald-400">
                    {{ t('rewards.earning') }}
                    <TooltipAmount :value="data.estimated_reward_amount || 0" class="ml-auto text-sm font-medium" />
                  </div>
                  <div
                    class="rounded-lg border border-dashed border-yellow-600 opacity-50 dark:border-yellow-400"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </VCard>

      <div class="order-2 flex flex-wrap gap-7 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <div class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
            <div class="mr-1.5 text-sm leading-3.5 opacity-50">₳</div>
            {{ t('address.reward') }}
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

        <div v-if="data.catalyst_id" class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max">
            <CatalystIcon class="mr-1.5 size-3.5 opacity-50" />
            {{ t('catalyst_wallet_id') }}
          </DataGridSectionHeader>

          <div class="flex items-center text-sm">
            <TextTruncate :text="data.catalyst_id" highlight="font-medium text-amber-500 dark:text-amber-400" />
            <CopyToClipboard :text="data.catalyst_id" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
          </div>
        </div>

        <!-- TODO add support for multiple pools -->
        <div v-if="data.pool_reward_address.rows.length" class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max">
            <RewardsIcon class="mr-1.5 size-3.5 opacity-50" />
            {{ t('pool.reward_address') }}
          </DataGridSectionHeader>
          <RowPool
            :name="data.pool_reward_address.rows[0].pool_name"
            :ticker="data.pool_reward_address.rows[0].pool_ticker"
            :bech32="data.pool_reward_address.rows[0].pool_bech32"
            :hash="data.pool_reward_address.rows[0].pool_hash"
            class="text-sm" />
        </div>

        <div v-if="data.pool_owner.rows.length" class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max">
            <KeyIcon class="mr-1.5 size-3.5 opacity-50" />
            {{ t('pool.owner') }}
          </DataGridSectionHeader>
          <RowPool
            :name="data.pool_owner.rows[0].pool_name"
            :ticker="data.pool_owner.rows[0].pool_ticker"
            :bech32="data.pool_owner.rows[0].pool_bech32"
            :hash="data.pool_owner.rows[0].pool_hash"
            class="text-sm" />
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #activity>
        <template v-if="tabRows?.length">
          <div :key="rowData.date" v-for="rowData of tabRows">
            <div
              v-if="rowData.date"
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ rowData.date }}
            </div>
            <!-- <TransitionGroup enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300" move-class="" leave-active-class="hidden"> -->
            <div class="pb-3 text-sm" :key="row.tx_hash" v-for="row of rowData.rows">
              <div
                class="rounded-lg bg-white/60 p-2 hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20">
                <div class="flex gap-2 sm:gap-4">
                  <component
                    :key="row._type"
                    :is="getTxTypeDataIcon(row._type)"
                    class="mt-1 h-9 w-9 stroke-[0.5] opacity-80"
                    :class="getTxTypeDataClass(row._type)" />
                  <div>
                    <div class="flex flex-wrap items-center gap-1">
                      {{ t('summary.' + row._type) }}
                      <template v-if="row.certs">
                        <template :key="i" v-for="i of Math.min(3, row.certs.length)">
                          <div
                            v-if="i < 3 || row.certs.length == 3"
                            class="rounded-sx bg-sky-500/50 px-1 text-2xs whitespace-nowrap">
                            <small>{{ row.certs[i - 1] }}</small>
                          </div>
                        </template>
                        <div v-if="row.certs.length > 3" class="text-2xs opacity-70">
                          … {{ row.certs.length - 2 }} more
                        </div>
                      </template>
                    </div>
                    <FormattedAmount
                      :value="row.amount"
                      sign
                      class="mt-1 h-5 font-alt opacity-90"
                      :class="row.amount < 0 ? 'text-down-600 dark:text-down-400' : 'text-up-600 dark:text-up-400'" />
                  </div>
                  <div class="ml-auto text-right text-2xs leading-3">
                    <template v-if="row.tx_hash">
                      <div
                        class="mb-2 inline-block rounded-sx bg-up-500/50 p-2 py-1 text-3xs capitalize dark:bg-up-700">
                        high
                      </div>
                      <RouterLink
                        :to="{ name: 'transaction', params: { id: row.tx_hash } }"
                        class="mt-px block text-center text-sky-500 underline opacity-80 dark:text-cyan-400">
                        {{ formatTime(row.time) }}
                      </RouterLink>
                    </template>
                    <template v-else>
                      <div class="mb-2 inline-block capitalize">{{ t('epoch') }} {{ formatNumber(row.epoch_no) }}</div>
                      <div class="mt-px text-amber-700 opacity-80 dark:text-orange-300">{{ formatTime(row.time) }}</div>
                    </template>
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
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ `There is no history for this account yet` }}
        </div>
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
          <template #token="{ row: { fingerprint, name, ticker, asset_name, asset_name_hex, image } }">
            <DataListToken
              :fingerprint="fingerprint"
              :name="name"
              :ticker="ticker"
              :asset_name="asset_name"
              :asset_name_hex="asset_name_hex"
              :image="image" />
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
      </template>

      <template #staking>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.earned_epoch_no"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #epoch="{ row: { earned_epoch_no } }">
            {{ formatNumber(earned_epoch_no) }}
          </template>
          <template #stake="{ row: { stake } }">
            <FormattedAmount :value="stake" />
          </template>
          <template #amount="{ row: { amount, time } }">
            <FormattedAmount :value="amount" :class="{ 'font-light italic opacity-70': !time && amount > 0 }" />
            <div v-if="!time && amount > 0" class="mt-1 text-xs leading-5 font-light italic opacity-70">
              {{ t('pending') }}
            </div>
          </template>
          <template #apr="{ row: { type, stake, amount, time } }">
            <div :class="{ 'font-light italic opacity-70': !time && amount > 0 }">
              {{
                type
                  ? type == 'member'
                    ? formatPercent(stake ? Math.pow(amount / stake + 1, 365 / 5) - 1 : 0, 2)
                    : '–'
                  : '–'
              }}
            </div>
          </template>
          <template #pool="{ row: { pool_bech32, pool_hash, pool_name, pool_ticker } }">
            <DataListPool
              v-if="pool_hash"
              :name="pool_name"
              :bech32="pool_bech32"
              :hash="pool_hash"
              :ticker="pool_ticker" />
          </template>
          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ `There is no staking history for this account yet` }}
        </div>
      </template>

      <template #stakekey>
        <template v-if="tabRows?.length">
          <div :key="rowData.date" v-for="rowData of tabRows">
            <div
              v-if="rowData.date"
              class="sticky top-8 z-1 bg-sky-50 p-2 pt-4 text-sm font-light opacity-95 sm:top-13 sm:px-4 md:top-18 dark:bg-gray-900">
              {{ rowData.date }}
            </div>

            <div class="overflow-x-auto pb-3 text-sm scrollbar-thin" :key="row.time" v-for="row of rowData.rows">
              <div
                class="rounded-lg bg-white/60 p-2 hover:bg-fuchsia-100/30 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20">
                <div class="flex gap-2 sm:gap-4">
                  <PoolDelegation
                    v-if="row.type == 'pool_delegation'"
                    :name="row.to_name"
                    :bech32="row.to_bech32"
                    :hash="row.to_hash"
                    :ticker="row.to_ticker"
                    :prev_name="row.from_name"
                    :prev_bech32="row.from_bech32"
                    :prev_hash="row.from_hash"
                    :prev_ticker="row.from_ticker"
                    :value="row.amount" />
                  <DRepDelegation
                    v-else-if="row.type == 'drep_delegation'"
                    :name="row.drep_given_name"
                    :bech32="row.drep_bech32"
                    :base16="row.drep_base16"
                    :image="row.drep_image"
                    :prev_name="row.prev_given_name"
                    :prev_bech32="row.prev_bech32"
                    :prev_base16="row.prev_base16"
                    :prev_image="row.prev_image" />
                  <CertRegistration v-else-if="row.type == 'registration'" :value="row.amount" />
                  <CertDeregistration v-else-if="row.type == 'deregistration'" :value="row.amount" />
                  <div class="ml-auto text-right text-2xs leading-3">
                    <div class="mb-2 inline-block capitalize">{{ t('epoch') }} {{ formatNumber(row.epoch_no) }}</div>
                    <RouterLink
                      :to="{ name: 'transaction', params: { id: row.tx_hash } }"
                      class="mt-px block text-sky-500 underline opacity-80 dark:text-cyan-400">
                      {{ formatTime(row.time) }}
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DataPagination
            class="mt-3 md:mt-9"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </template>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ `There is no history for this stake key yet` }}
        </div>
      </template>

      <template #addresses>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.address"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #address="{ row: { address, balance } }">
            <DataListHolder :bech32="address" :balance="balance" />
          </template>
          <template #num="{ id, row }">
            {{ row[id] == null ? '–' : formatNumber(row[id]) }}
          </template>
          <template #balance="{ id, row }">
            <TooltipAmount :value="row[id]" />
          </template>
          <template #act="{ id, row }">
            <DataListActivity :tx-hash="row[`${id}_hash`]" :tx-time="row[`${id}_time`]" :last="id == 'last_tx'" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">
          {{ `There are no addresses for this account yet` }}
        </div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { h, nextTick, ref, watch } from 'vue'

import ActivityIcon from '@/assets/icons/activity.svg?component'
import AdaHandleIcon from '@/assets/icons/adahandle.svg?component'
import ArrowIcon from '@/assets/icons/arrow.svg?component'
import CirculationIcon from '@/assets/icons/circulation.svg?component'
import CloseIcon from '@/assets/icons/close.svg?component'
import DelegationIcon from '@/assets/icons/delegation.svg?component'
import DoneIcon from '@/assets/icons/done.svg?component'
import KeyIcon from '@/assets/icons/key.svg?component'
import TokensIcon from '@/assets/icons/menu_tokens.svg?component'
import NFTsIcon from '@/assets/icons/nfts.svg?component'
import RewardsIcon from '@/assets/icons/rewards.svg?component'
import SearchIcon from '@/assets/icons/search.svg?component'
import SnapshotIcon from '@/assets/icons/snapshot.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'
import CatalystIcon from '@/assets/images/catalyst.svg?component'

import { t } from '@/i18n'
import { apiTip, useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatDate, formatDateTime, formatNumber, formatPercent, formatTime } from '@/utils/formatter'
import {
  type AnyObject,
  type BooleanObject,
  getTabData,
  getTableCols,
  getTxTypeDataClass,
  getTxTypeDataIcon,
  getUrl,
} from '@/utils/helper'
import { getHolderIcon } from '@/utils/holderIcons'

// import { limit } from '@/utils/settings'
// import { darkMode } from '@/utils/settings'
// import { RouterLink } from 'vue-router'

import CertDeregistration from '@/components/CertDeregistration.vue'
import CertRegistration from '@/components/CertRegistration.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DRepDelegation from '@/components/DRepDelegation.vue'
// import DataGridPool from '@/components/DataGridPool.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListToken from '@/components/DataListToken.vue'
import DataPagination from '@/components/DataPagination.vue'
// import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
// import MatterTx from '@/components/MatterTx.vue'
// import PercentFilled from '@/components/PercentFilled.vue'
import PoolDelegation from '@/components/PoolDelegation.vue'
import RowPool from '@/components/RowPool.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VImg from '@/components/VImg.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

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
  staking: {
    icon: DelegationIcon,
    colList: [{ id: 'epoch' }, { id: 'stake' }, { id: 'amount' }, { id: 'apr' }, { id: 'pool' }],
    sortKeyMap: { epoch: 'epoch', stake: 'stake', amount: 'rewards' },
  },
  stakekey: {
    icon: KeyIcon,
    name: 'key_history',
  },
  addresses: {
    icon: () => h('div', { class: 'text-xl leading-5 text-center aspect-square font-light' }, '₳'),
    colList: [
      { id: 'address' },
      { id: 'balance' },
      { id: 'token', slot: 'num' },
      { id: 'first_tx', slot: 'act' },
      { id: 'last_tx', slot: 'act' },
      { id: 'tx', slot: 'num' },
    ],
    sortKeyMap: { balance: 'balance', token: 'token', first_tx: 'first_tx', last_tx: 'last_tx', tx: 'tx' },
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
    // socketDataHandler,
    nextPage,
  } = useViewApi(),
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value),
  idHexView = ref(false),
  // paymentAccount = ref(),
  // paymentScript = ref(),
  // stakeAccount = ref(),
  // stakeScript = ref(),
  tabInteraction = ref<BooleanObject>({})

const setTabRows = (_rows = rows.value, _newRows?: typeof rows.value) => {
  if (tab.value == 'activity' || tab.value == 'stakekey') {
    if (_newRows && _newRows.length < _rows.length) {
      // Show more
      _rows = _newRows
    } else {
      tabRows.value = []
    }

    for (const row of _rows) {
      if (!row._type && tab.value == 'activity') {
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

        if (row.tx_hash) {
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
        } else {
          row._type = 'reward'
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

const onTabChange = async () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.account.' + tabValue,
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
  () => data.value?.base16,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
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
