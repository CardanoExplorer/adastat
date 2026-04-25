<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="order-1">
        <div class="flex items-center gap-2">
          <h1 v-if="data.retiring_epoch" class="truncate text-2xl font-medium text-amber-500 dark:text-orange-300">
            {{ t(data.retired ? 'pool.retired' : 'pool.retiring') }}
            <span
              v-if="data.ticker"
              class="text-slate-600 dark:text-gray-400"
              :style="data.retired ? null : { color: liveSaturationColorVar }"
              >{{ data.ticker }}</span
            >
          </h1>
          <h1 v-else class="truncate text-2xl font-medium">
            {{ t('pool') }}
            <span v-if="data.ticker" :style="{ color: liveSaturationColorVar }">{{ data.ticker }}</span>
          </h1>
          <VTooltip v-if="data.mithril" :title="t('mithril.signer')" bg="bg-orange-200 dark:bg-yellow-600" cursor-help>
            <Mithrilcon class="size-4 text-amber-500 dark:text-orange-300" />
          </VTooltip>
          <VTooltip v-if="data.itn" :title="t('itn.member')" cursor-help>
            <ITNIcon class="size-4 text-sky-500 dark:text-sky-400" />
          </VTooltip>
          <WatchlistToggle type="pool" :data="data.bech32" :legacy-data="data.hash" class="ml-auto h-9 w-9 p-2" />
        </div>
        <div class="relative mx-auto mt-8 mb-4 flex h-16 w-16 overflow-hidden rounded-2xl">
            <img class="h-full w-full" :src="getUrl(`/images/pools/${data.bech32}.webp`)" />
          </div>
        <div class="mt-2 text-center text-lg font-medium">
          <TextTruncate :text="data.name" :tail-length="0" />
        </div>
        <div class="mt-1 text-center wrap-anywhere text-slate-600 sm:scrollbar sm:max-h-20 dark:text-gray-400">
          <div class="sticky top-0 mb-1.5 shadow-sky-50 sm:shadow-blur dark:shadow-gray-900"></div>
          {{ data.description }}
          <div class="sticky bottom-0 mt-1.5 shadow-sky-50 sm:shadow-blur dark:shadow-gray-900"></div>
        </div>

        <div class="mt-4 flex items-center justify-center gap-2">
          <template v-for="(link, id) of socialLinks">
            <VTooltip
              v-if="link"
              :key="id"
              tag="a"
              :href="link"
              :title="t(`social.${id}`)"
              class="w-8 rounded-md bg-sky-100 p-1.5 hover:*:scale-110 dark:bg-gray-800/50"
              target="_blank"
              rel="noopener noreferrer nofollow">
              <component :is="socialIcons[id]" class="h-full w-full opacity-80 transition-transform" />
            </VTooltip>
          </template>
        </div>
      </div>

      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="registration">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.reg_tx_hash } }"
              class="text-indigo-700 underline dark:text-indigo-400"
              >{{ formatDateTime(data.reg_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow v-if="data.retiring_epoch" title="retire.announced">
            <RouterLink
              :to="{ name: 'transaction', params: { id: data.retire_announced_tx_hash } }"
              class="text-amber-700 underline dark:text-orange-300"
              >{{ formatDateTime(data.retire_announced_time) }}</RouterLink
            >
          </DataGridSectionRow>
          <DataGridSectionRow title="epochs.active">
            {{ formatNumber(data.active_epoch) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="epochs.with_blocks">
            {{ formatNumber(data.epoch_with_block) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="blocks.lifetime">
            {{ formatNumber(data.total_block) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="luck.lifetime">
            {{ formatPercent(data.luck[0], 2) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="pool.fees">
            <FormattedAmount :value="data.pool_fee" />
          </DataGridSectionRow>
          <DataGridSectionRow title="rewards.total">
            <FormattedAmount :value="data.reward_amount" />
          </DataGridSectionRow>
          <DataGridSectionRow title="apr.lifetime">
            {{ formatPercent(data.apr[0], 2) }}
          </DataGridSectionRow>
        </DataGridSection>

        <DataGridSection v-if="data.retired">
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="retire" />
          </template>
          <DataGridSectionRow title="epoch">
            {{ formatNumber(data.retiring_epoch) }}
          </DataGridSectionRow>
        </DataGridSection>
        <DataGridSection v-else>
          <template #header>
            <DataGridSectionHeader class="mt-4.5 mb-3" header="blocks.live" />
          </template>
          <DataGridSectionRow title="estimated">
            {{
              formatNumber(
                (data.stake_snapshot.pool_stake_set / data.stake_snapshot.active_stake_set) * blocksPerEpoch,
                0
              )
            }}
          </DataGridSectionRow>
          <DataGridSectionRow title="actual">
            {{ formatNumber(data.block) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="margin">
            {{ formatPercent(data.margin, 2) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="fixed_costs">
            <FormattedAmount :value="data.fixed_cost" />
          </DataGridSectionRow>
          <DataGridSectionRow title="address.reward">
            <RouterLink
              :to="{ name: 'account', params: { id: data.reward_address_bech32 } }"
              class="ml-auto block max-w-40">
              <TextTruncate :text="data.reward_address_bech32" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </DataGridSectionRow>
          <DataGridSectionRow title="pledge">
            <VTooltip
              v-if="data.owner_live_stake - data.pledge < 0 && !data.retired"
              class="m-0.5 size-4 cursor-help text-orange-500 dark:text-orange-400"
              bg="bg-orange-200 dark:bg-yellow-700">
              <WarningIcon stroke-width="1.5" />
              <template #tooltip>
                {{ t('pledge.not_met') }}
              </template>
            </VTooltip>
            <FormattedAmount :value="data.pledge" />
          </DataGridSectionRow>
          <DataGridSectionRow title="owners">
            {{ formatNumber(data.owners.length) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="relays">
            {{ formatNumber(data.relays.length) }}
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
            {{ formatNumber(data.vote_abstain) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="not_voted">
            {{ formatNumber(data.not_voted) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <VCard class="order-3 flex flex-col" dark>
        <DataGridSection class="-mt-1 mb-3">
          <DataGridSectionRow title="delegators">
            {{ formatNumber(activeDataView ? data.active_delegator : data.delegator) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="stake">
            <FormattedAmount :value="activeDataView ? data.active_stake : data.live_stake" />
          </DataGridSectionRow>
          <DataGridSectionRow v-if="!data.retired" title="leverage">
            {{ formatNumber(activeDataView ? data.active_leverage : data.live_leverage) }}
          </DataGridSectionRow>
        </DataGridSection>

        <div
          v-if="data.retired"
          class="m-auto flex h-6 items-center rounded-md bg-orange-200 p-2 py-0.5 text-center text-2xs text-slate-700 dark:bg-orange-300 dark:text-gray-900">
          {{ t('orphaned.delegations') }}
        </div>
        <div v-else class="my-auto flex">
          <button
            class="relative mx-auto grid grid-cols-2 items-center rounded bg-sky-100 py-0.5 text-center dark:bg-gray-800">
            <div
              class="absolute h-6 w-1/2 transform rounded-md bg-current opacity-60 transition-transform"
              :class="{ 'translate-x-full': activeDataView }"
              :style="{ color: activeDataView ? activeSaturationColorVar : liveSaturationColorVar }"></div>
            <small class="z-1 px-2" @click="activeDataView = false">{{ t('data.live') }}</small>
            <small class="z-1 px-2" @click="activeDataView = true">{{ t('data.active') }}</small>
          </button>
        </div>

        <div class="flex gap-3">
          <div class="relative flex-1 overflow-hidden">
            <div
              class="h-5 text-slate-100 dark:text-gray-800"
              :class="i == 6 ? 'border-y' : 'border-b'"
              :key="'' + i"
              v-for="i of 6"></div>
            <div
              v-if="data.retired"
              class="absolute bottom-1 left-0 w-full bg-linear-to-b from-current/50 text-amber-500 dark:text-orange-300"
              :style="{
                height: `${6.25 * Math.min(1, data.live_saturation) + 0.5}rem`,
              }">
              <div class="h-px bg-current text-amber-500 dark:text-orange-300"></div>
            </div>
            <div
              v-else-if="activeDataView"
              class="absolute bottom-1 left-0 w-full bg-linear-to-b from-current/50"
              :style="{
                color: activeSaturationColorVar,
                height: `${6.25 * Math.min(1, data.active_saturation) + 0.5}rem`,
              }">
              <div class="h-px bg-current" :style="{ color: activeSaturationColorVar }"></div>
            </div>
            <template v-else>
              <div
                class="absolute bottom-1 left-0 w-2/1 animate-ocean bg-linear-to-b from-current/50 mask-ocean transition-all"
                :style="{
                  color: liveSaturationColorVar,
                  height: `${6.25 * Math.min(1, data.live_saturation) + 1}rem`,
                  animationDuration: '60s',
                }">
                <div class="-ml-1 h-4 bg-current mask-wave" :style="{ color: liveSaturationColorVar }"></div>
              </div>
              <div class="pointer-events-none absolute top-6 bottom-3 w-full text-slate-300 dark:text-gray-600">
                <div
                  :key="bubble.id"
                  v-for="bubble of bubbles"
                  class="absolute bottom-0 size-4 origin-right animate-bubble-infinite rounded-full border opacity-0"
                  :style="{
                    left: bubble.left + '%',
                    animationDelay: bubble.delay + 'ms',
                    '--translate-x': `${bubble.to}rem`,
                    '--translate-y': `-${4 * Math.min(1, data.live_saturation)}rem`,
                    '--scale': bubble.scale,
                  }"></div>
              </div>
            </template>
          </div>
          <div class="mt-2.5 text-xs font-light opacity-80">
            <div class="flex h-5 items-center gap-2" :key="'' + i" v-for="(i, j) of 6">
              <div
                class="size-1 rounded-full bg-orange-200 dark:bg-orange-300"
                :style="data.retired ? null : { background: `var(${getRatioColor(1 - j / 5)})` }"></div>
              <div>{{ formatPercent(1 - j / 5) }}</div>
            </div>
          </div>
        </div>
        <div class="text-center font-light">
          {{ t('saturation') }}
          <span
            class="font-normal text-amber-500 dark:text-orange-300"
            :style="data.retired ? null : { color: activeDataView ? activeSaturationColorVar : liveSaturationColorVar }"
            >{{ formatPercent(activeDataView ? data.active_saturation : data.live_saturation) }}</span
          >
        </div>
      </VCard>

      <div class="order-2 flex flex-wrap gap-7 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <div class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
            <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
            {{ t('pool.id') }}
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
              :text="data.hash"
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
              :text="idHexView ? data.hash : data.bech32"
              class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
          </div>
        </div>

        <div v-if="data.calidus" class="min-w-0">
          <DataGridSectionHeader class="mb-2 max-w-max items-center gap-3">
            <KeyIcon class="mr-1.5 size-3.5 opacity-50" />
            {{ t('calidus_key') }}
            <template #content>
              <button
                class="relative grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-2xs leading-3 dark:bg-gray-800">
                <div
                  class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                  :class="
                    calidusHexView
                      ? 'translate-x-full bg-amber-500 dark:bg-amber-400'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  "></div>
                <small class="z-1 px-1" @click="calidusHexView = false">Bech32</small>
                <small class="z-1 px-1" @click="calidusHexView = true">HEX</small>
              </button>
            </template>
          </DataGridSectionHeader>

          <div class="flex items-center text-sm">
            <TextTruncate
              v-if="calidusHexView"
              :text="data.calidus.hash"
              class="text-slate-500 dark:text-gray-300"
              highlight="font-medium text-amber-500 dark:text-amber-400" />
            <TextTruncate
              v-else
              :text="data.calidus.bech32"
              :head-length="0"
              :tail-length="12"
              class="text-emerald-600 dark:text-emerald-400"
              highlight="font-medium bg-linear-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-lime-400" />
            <CopyToClipboard
              :text="calidusHexView ? data.calidus.hash : data.calidus.bech32"
              class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
          </div>
        </div>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #epochs>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.no"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #epoch="{ row: { no } }">
            <RouterLink
              :to="{ name: 'epoch', params: { id: no } }"
              class="mb-1.5 font-medium text-sky-500 *:underline dark:text-cyan-400">
              {{ formatNumber(no) }}
            </RouterLink>
          </template>
          <template #apr="{ id, row }">
            {{ formatPercent(row[id], 2, true) }}
          </template>
          <template #luck="{ row: { estimated_block, block } }">
            {{ formatPercent(estimated_block > 0 ? block / estimated_block : 0, 2, true) }}
          </template>
          <template #pool_fee="{ row: { no, pool_fee, margin, fixed_cost } }">
            <TooltipAmount :value="pool_fee" :class="{ 'font-light italic opacity-50': no == apiTip.epoch_no - 1 }" />
            <div class="mt-1 text-s opacity-50">
              <TooltipAmount :value="fixed_cost" class="inline-block" />
              <template v-if="margin > 0">{{ `+ ${formatPercent(Number(margin), 2)} ` }}</template>
            </div>
          </template>
          <template #num="{ id, row }">
            {{ formatNumber(row[id]) }}
          </template>
          <template #ada="{ id, row }">
            <TooltipAmount
              :value="row[id]"
              :class="{ 'font-light italic opacity-50': id == 'reward_amount' && row.no == apiTip.epoch_no - 1 }" />
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
          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
      </template>

      <template #blocks>
        <VCard class="mb-7 border-none" dark>
          <div class="mb-3 flex items-center text-xs font-normal">
            <div class="mr-2 ml-auto h-3 w-3 rounded-full bg-blue-400 dark:bg-sky-500"></div>
            <div>{{ t('exactly') }}</div>
            <div class="mr-2 ml-5 h-3 w-3 rounded-full bg-amber-500 dark:bg-yellow-600"></div>
            <div>{{ t('at_least') }}</div>
          </div>
          <ChartJS class="h-40 w-full" :config="chartBlocksConfig" />
          <div class="mt-3 text-center text-xs font-medium capitalize">
            <div class="mx-auto w-max rounded-lg p-1.5 px-3 dark:bg-gray-800">
              {{ t('epoch.current.block_probability') }}
            </div>
          </div>
        </VCard>

        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.hash"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          :row-class="(row) => (row.orphan_hash ? 'opacity-50' : null)"
          @sort="onSort">
          <template #block="{ row: { hash, no, orphan_hash, orphan_no } }">
            <div v-if="orphan_hash" class="block w-40 max-w-[30vw] font-sans font-medium">
              <TextTruncate :text="orphan_hash" class="mb-1" />
              <div class="font-normal">{{ formatNumber(orphan_no) }}</div>
            </div>
            <RouterLink
              v-else
              :to="{ name: 'block', params: { id: hash } }"
              class="block w-40 max-w-[30vw] font-sans font-medium">
              <TextTruncate :text="hash" class="mb-1 text-sky-500 *:underline dark:text-cyan-400" />
              <div class="font-normal">{{ formatNumber(no) }}</div>
            </RouterLink>
          </template>
          <template #time="{ row: { orphan_time, time } }">
            <DataListTimeAgo :time="orphan_time || time" />
          </template>
          <template #size="{ row: { size, orphan_size } }">
            {{ formatBytes(orphan_size || size) }}
          </template>
          <template #epoch_slot="{ row: { epoch_no, epoch_slot_no, orphan_epoch_no, orphan_epoch_slot_no } }">
            <RouterLink
              :to="{ name: 'epoch', params: { id: orphan_epoch_no || epoch_no } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400">
              {{ formatNumber(orphan_epoch_no || epoch_no) }}
            </RouterLink>
            / <span class="text-xs font-normal">{{ formatNumber(orphan_epoch_slot_no || epoch_slot_no) }}</span>
          </template>
          <template #num="{ id, row }">
            {{ formatNumber(row[`orphan_${id}`] ?? row[id]) }}
          </template>
          <template #ada="{ id, row }">
            <template v-if="row.orphan_hash">–</template>
            <TooltipAmount v-else :value="row[id]" />
          </template>
          <template #proto_ver="{ row: { proto_major, proto_minor } }"> {{ proto_major }}.{{ proto_minor }} </template>
          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="nextPage ? Infinity : 0"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
      </template>

      <template #delegators>
        <HolderIcons :data="delegatorTypes" class="mb-8" />

        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.base16"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #account="{ row: { base16, bech32, balance } }">
            <DataListHolder :bech32="bech32" :base16="base16" :balance="balance" />
          </template>
          <template #ada="{ id, row }">
            <TooltipAmount :value="row[id]" />
          </template>
          <template #delegated="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #last_activity="{ row: { last_tx_hash, last_tx_time } }">
            <DataListActivity :tx-hash="last_tx_hash" :tx-time="last_tx_time" last />
          </template>
          <template #prev_pool="{ row: { prev_pool_bech32, prev_pool_hash, prev_pool_name, prev_pool_ticker } }">
            <DataListPool
              :name="prev_pool_name"
              :bech32="prev_pool_bech32"
              :hash="prev_pool_hash"
              :ticker="prev_pool_ticker" />
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

      <template #delegations>
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
                  <div class="flex">
                    <RouterLink
                      :to="{ name: row.stake_base16 ? 'account' : 'address', params: { id: row.stake_bech32 } }"
                      class="group flex w-max gap-2.5">
                      <component
                        :is="getHolderIcon(Math.abs(row.stake))"
                        class="my-auto h-9 w-9 transition-transform group-hover:scale-115"
                        :class="row._delegator ? 'text-up-500 dark:text-up-400' : 'text-down-500 dark:text-down-400'" />
                      <div class="w-40 max-w-[30vw] font-sans">
                        <TextTruncate
                          :text="row.stake_bech32"
                          class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
                        <div>
                          <TextTruncate :text="row.stake_base16" class="text-xs font-light" />
                        </div>
                      </div>
                    </RouterLink>

                    <div class="mx-1">
                      <div class="mx-auto -mb-5 w-max px-8 text-s">
                        {{ t(row._delegator ? 'incoming' : 'outgoing') }}
                      </div>
                      <div class="flex px-1">
                        <svg
                          viewBox="0 0 60 44"
                          fill="none"
                          stroke="currentColor"
                          class="h-11 flex-1"
                          preserveAspectRatio="none">
                          <path
                            d="M0 20c15 2 24-1 30 7 11 15-11 9 0 0 7-5 24-3 30 4"
                            stroke-dasharray="0 2 0 0 3 0"
                            vector-effect="non-scaling-stroke"
                            class="opacity-50" />
                          <path
                            v-if="row._delegator"
                            d="M0 20l6-1-1 4Z"
                            fill="currentColor"
                            class="text-up-500 opacity-70 dark:text-up-400"
                            vector-effect="non-scaling-stroke" />
                        </svg>
                        <TooltipAmount
                          :value="row.stake"
                          sign
                          :bg="row._delegator ? 'bg-up-200 dark:bg-up-700' : 'bg-down-200 dark:bg-down-600'"
                          class="mx-1 mt-auto font-alt"
                          :class="
                            row._delegator ? 'text-up-600 dark:text-up-400' : 'text-down-600 dark:text-down-400'
                          " />
                        <svg viewBox="0 0 70 44" fill="none" stroke="currentColor" class="h-11 w-15">
                          <template v-if="row.pool_hash">
                            <path
                              d="M0 35c22 0 14-4 29-6 23-2 17 10 14 9-8-1-9-23 27-21"
                              stroke-dasharray="3 2"
                              vector-effect="non-scaling-stroke"
                              class="opacity-50" />
                            <path
                              v-if="!row._delegator"
                              d="M64 15v4l6-2Z"
                              fill="currentColor"
                              vector-effect="non-scaling-stroke"
                              class="text-down-500 opacity-70 dark:text-down-400" />
                          </template>
                          <template v-else>
                            <path
                              d="M54 25c17 30-22 13-16 3 4-6 14 16-9 12-15-2-7-6-29-8"
                              stroke-dasharray="3 2"
                              vector-effect="non-scaling-stroke"
                              class="opacity-50" />
                            <template v-if="row._delegator">
                              <path
                                d="M49 20a4 1.6 0 106 0"
                                stroke-dasharray="2 2"
                                vector-effect="non-scaling-stroke"
                                class="opacity-50" />
                              <path
                                d="M52 18C75-5 29-5 52 18M52 5a2 2 0 10.1 0"
                                vector-effect="non-scaling-stroke"
                                class="text-up-500 opacity-70 dark:text-up-400" />
                            </template>
                            <template v-else>
                              <path
                                d="M49 20a4 1.6 0 106 0M52 20V1h7q3 0 3 3 0 2 2 2h5l-4 4 4 4h-8q-3 0-3-3 0-2-2-2h-4"
                                vector-effect="non-scaling-stroke"
                                class="text-down-500 opacity-70 dark:text-down-400" />
                              <path
                                d="M55 31 54 25 58 29Z"
                                fill="currentColor"
                                vector-effect="non-scaling-stroke"
                                class="text-down-500 opacity-70 dark:text-down-400" />
                            </template>
                          </template>
                        </svg>
                      </div>
                    </div>

                    <DataListPool
                      :class="{ 'origin-left scale-90 transform opacity-50': row._delegator }"
                      v-if="row.pool_hash"
                      :name="row.pool_name"
                      :bech32="row.pool_bech32"
                      :hash="row.pool_hash"
                      :ticker="row.pool_ticker" />
                  </div>

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

      <template #votes>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash + row.cert_index"
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
      </template>

      <template #updates>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.tx_hash + row.cert_index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #transaction="{ row: { tx_hash, tx_time } }">
            <DataListActivity :tx-hash="tx_hash" :tx-time="tx_time" />
          </template>
          <template #certificate="{ row: { deposit_amount, retiring_time } }">
            <CertDeregistration v-if="retiring_time" :value="deposit_amount" icon-hide />
            <CertRegistration v-else-if="deposit_amount > 0" :value="deposit_amount" icon-hide />
            <CertUpdate v-else icon-hide />
          </template>
          <template #epoch_slot="{ row: { epoch_no, epoch_slot_no } }">
            <RouterLink
              :to="{ name: 'epoch', params: { id: epoch_no } }"
              class="font-medium text-sky-500 underline dark:text-cyan-400">
              {{ formatNumber(epoch_no) }}
            </RouterLink>
            / <span class="text-xs font-normal">{{ formatNumber(epoch_slot_no) }}</span>
          </template>
          <template #effective_date="{ row: { retiring_epoch_no, retiring_time, active_epoch_no, active_time } }">
            <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(active_time || retiring_time) }}</div>
            <div class="mt-1 text-xs leading-5 font-light">
              {{ t('epoch') }} {{ active_epoch_no || retiring_epoch_no }}
            </div>
          </template>
          <template #fees="{ row: { margin, fixed_cost } }">
            <template v-if="fixed_cost">
              <TooltipAmount :value="fixed_cost" class="inline-block" />
              <template v-if="margin > 0"> + {{ formatPercent(Number(margin), 2) }} </template>
            </template>
            <template v-else>–</template>
          </template>
          <template #reward_address="{ row: { reward_address_base16, reward_address_bech32 } }">
            <DataListHolder :bech32="reward_address_bech32" :base16="reward_address_base16" />
          </template>
          <template #pledge="{ row: { pledge, owners, tx_hash, cert_index } }">
            <template v-if="pledge">
              <div class="mb-1 flex w-40 max-w-[30vw] justify-between gap-2">
                <TooltipAmount :value="pledge" />
                <button
                  v-if="tabInteraction[tx_hash + cert_index]"
                  class="h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                  @click="tabInteraction[tx_hash + cert_index] = false">
                  {{ t('show.less') }}
                </button>
              </div>
              <div v-if="owners?.length" class="w-40 max-w-[30vw]">
                <button
                  v-if="!tabInteraction[tx_hash + cert_index]"
                  class="h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                  @click="tabInteraction[tx_hash + cert_index] = true">
                  {{ t('n.owner', owners.length) }}
                </button>
                <template v-if="tabInteraction[tx_hash + cert_index]">
                  <DataListHolder
                    :bech32="bech32"
                    :base16="base16"
                    :key="bech32"
                    class="mt-3"
                    v-for="{ bech32, base16 } of owners" />
                </template>
              </div>
            </template>
            <template v-else>–</template>
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>
          <template #relays="{ row: { relays, tx_hash, cert_index } }">
            <template v-if="relays?.length">
              <div
                :key="i"
                v-for="(n, i) of tabInteraction['relay' + tx_hash + cert_index]
                  ? relays.length
                  : relays.length == 2
                    ? 2
                    : 1"
                :class="{ 'mt-1': (i as number) > 0 }">
                {{ relays[i].relay
                }}<span v-if="relays[i].port" class="font-light opacity-70">:{{ relays[i].port }}</span>
              </div>
              <button
                v-if="relays.length > 2"
                class="mt-1 h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                @click="
                  tabInteraction['relay' + tx_hash + cert_index] = !tabInteraction['relay' + tx_hash + cert_index]
                ">
                {{
                  t(tabInteraction['relay' + tx_hash + cert_index] ? 'show.less' : 'more.n', { n: relays.length - 1 })
                }}
              </button>
            </template>
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

      <template #relays>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.ip + row.host + row.port"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #relay="{ row: { host, ip } }">
            {{ ip || host }}
            <div v-if="ip && host" class="mt-1 text-s opacity-70">
              {{ host }}
            </div>
          </template>
          <template #port="{ row: { port } }">
            {{ port }}
          </template>
          <template #status="{ row: { status } }">
            <SpinnerIcon v-if="status == 'checking'" class="size-4 animate-spin stroke-2" />
            <div
              v-else
              class="w-max rounded-sx p-0.5 px-2.5 text-2xs font-medium whitespace-nowrap text-slate-700 dark:text-gray-900"
              :class="
                status == 'offline'
                  ? 'bg-down-300 dark:bg-down-400'
                  : status == 'online'
                    ? 'bg-up-300 dark:bg-up-400'
                    : 'bg-slate-300 dark:bg-gray-400'
              ">
              {{ t(status) }}
            </div>
          </template>
          <template #country="{ row: { country } }">
            <div class="flex">
              {{ t(`country.list.${String(country)}`) }}
              <div class="ml-2 font-sans text-lg leading-5">{{ flags[country as keyof typeof flags] }}</div>
            </div>
          </template>
          <template #asn="{ row: { asn } }">
            {{ asn }}
          </template>
        </DataList>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BlocksIcon from '@/assets/icons/blocks.svg?component'
import DelegationIcon from '@/assets/icons/delegation.svg?component'
import DiscordIcon from '@/assets/icons/discord.svg?component'
import EarthIcon from '@/assets/icons/earth.svg?component'
import EmailIcon from '@/assets/icons/email.svg?component'
import FacebookIcon from '@/assets/icons/facebook.svg?component'
import GithubIcon from '@/assets/icons/github.svg?component'
import HoldersIcon from '@/assets/icons/holders.svg?component'
import HomeIcon from '@/assets/icons/home.svg?component'
import ITNIcon from '@/assets/icons/itn.svg?component'
import KeyIcon from '@/assets/icons/key.svg?component'
import MenuEpochsIcon from '@/assets/icons/menu_epochs.svg?component'
import Mithrilcon from '@/assets/icons/mithril.svg?component'
import SettingsIcon from '@/assets/icons/settings.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'
import TelegramIcon from '@/assets/icons/telegram.svg?component'
import TwitchIcon from '@/assets/icons/twitch.svg?component'
import VotesIcon from '@/assets/icons/votes.svg?component'
import WarningIcon from '@/assets/icons/warning.svg?component'
import XIcon from '@/assets/icons/x.svg?component'
import YoutubeIcon from '@/assets/icons/youtube.svg?component'

import { flags, t } from '@/i18n'
import { apiTip, useViewApi } from '@/utils/api'
import { getColorValue, horizontalGradiend } from '@/utils/chartjs'
import { formatBytes, formatDate, formatDateTime, formatNumber, formatPercent, formatTime } from '@/utils/formatter'
import { type BooleanObject, getRatioColor, getTabData, getTableCols, getUrl } from '@/utils/helper'
import { getHolderIcon } from '@/utils/holderIcons'
import { darkMode, trendColors } from '@/utils/settings'

import CertDeregistration from '@/components/CertDeregistration.vue'
import CertRegistration from '@/components/CertRegistration.vue'
import CertUpdate from '@/components/CertUpdate.vue'
import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListActivity from '@/components/DataListActivity.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListMeta from '@/components/DataListMeta.vue'
// import DataListDRep from '@/components/DataListDRep.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListTimeAgo from '@/components/DataListTimeAgo.vue'
import DataPagination from '@/components/DataPagination.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import HolderIcons from '@/components/HolderIcons.vue'
// import PercentFilled from '@/components/PercentFilled.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'
import VoteLabel from '@/components/VoteLabel.vue'
import WatchlistToggle from '@/components/WatchlistToggle.vue'

type TabId = keyof typeof tabData

const tabData = getTabData({
  epochs: {
    icon: MenuEpochsIcon,
    colList: [
      { id: 'epoch' },
      { id: 'reward_amount', slot: 'ada' },
      { id: 'apr' },
      { id: 'block', slot: 'num' },
      { id: 'luck' },
      { id: 'stake', slot: 'ada' },
      { id: 'delegator', slot: 'num' },
      { id: 'pledge' },
      { id: 'pool_fee' },
      { id: 'epoch_stake', slot: 'ada' },
    ],
    sortKeyMap: {
      epoch: 'no',
      reward_amount: 'reward_amount',
      apr: 'apr',
      stake: 'stake',
      delegator: 'delegator',
      pledge: 'pledge',
      pool_fee: 'pool_fee',
      block: 'block',
      epoch_stake: 'epoch_stake',
    },
  },
  blocks: {
    icon: BlocksIcon,
    colList: [
      { id: 'block' },
      { id: 'time' },
      { id: 'tx', slot: 'num' },
      { id: 'size' },
      { id: 'slot_no', slot: 'num' },
      { id: 'epoch_slot' },
      { id: 'tx_amount', slot: 'ada' },
      { id: 'tx_out_sum', slot: 'ada' },
      { id: 'tx_fee', slot: 'ada' },
      { id: 'proto_ver' },
    ],
    sortKeyMap: {
      block: 'no',
      time: 'no',
      slot_no: 'no',
      epoch_slot: 'no',
      tx: 'tx',
      tx_amount: 'tx_amount',
      tx_out_sum: 'tx_out_sum',
      tx_fee: 'tx_fee',
      size: 'size',
    },
  },
  delegators: {
    icon: HoldersIcon,
    colList: [
      { id: 'account' },
      { id: 'live_stake', slot: 'ada' },
      { id: 'total_reward_amount', slot: 'ada' },
      { id: 'delegated' },
      { id: 'prev_pool' },
      { id: 'last_activity' },
    ],
    sortKeyMap: {
      live_stake: 'live_stake',
      total_reward_amount: 'total_reward_amount',
    },
  },
  delegations: {
    icon: DelegationIcon,
  },
  votes: {
    icon: VotesIcon,
    colList: [{ id: 'gov_action' }, { id: 'type' }, { id: 'vote' }, { id: 'tx' }, { id: 'meta' }],
    sortKeyMap: {
      tx: 'time',
    },
  },
  updates: {
    icon: SettingsIcon,
    name: 'changes',
    colList: [
      { id: 'transaction' },
      { id: 'epoch_slot' },
      { id: 'certificate' },
      { id: 'effective_date' },
      { id: 'fees' },
      { id: 'reward_address' },
      { id: 'pledge' },
      { id: 'relays' },
      { id: 'meta' },
    ],
    sortKeyMap: {
      tx: 'time',

      pledge: 'pledge',
      margin: 'margin',
      fixed_cost: 'fixed_cost',
      effective_date: 'active_epoch_no',
    },
  },
  relays: {
    icon: EarthIcon,
    colList: [{ id: 'relay' }, { id: 'port' }, { id: 'status' }, { id: 'country' }, { id: 'asn' }],
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
    // updateRows,
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
  calidusHexView = ref(true),
  activeDataView = ref(false),
  tabInteraction = ref<BooleanObject>({}),
  delegatorTypes = ref(),
  socialIcons = {
    homepage: HomeIcon,
    github: GithubIcon,
    x: XIcon,
    discord: DiscordIcon,
    telegram: TelegramIcon,
    facebook: FacebookIcon,
    youtube: YoutubeIcon,
    twitch: TwitchIcon,
    email: EmailIcon,
  },
  socialLinks = ref<Partial<Record<keyof typeof socialIcons, string>>>({}),
  bubbles = ref<
    {
      id: number
      scale: number
      left: number
      to: number
      delay: number
    }[]
  >(),
  chartBlocksConfig = ref<ChartConfigurationCustomTypesPerDataset>(),
  blocksPerEpoch = import.meta.env.VITE_EPOCH_LENGTH * import.meta.env.VITE_ACTIVE_SLOTS_COEFF

const liveSaturationColorVar = computed(() => `var(${getRatioColor(data.value!.live_saturation)})`)

const activeSaturationColorVar = computed(() => `var(${getRatioColor(data.value!.active_saturation)})`)

const setBubbles = () => {
  const { live_saturation } = data.value!,
    now = Date.now(),
    left = [],
    delayCap = 8000,
    delayMultiplier =
      live_saturation < 0.1
        ? 600
        : live_saturation < 0.2
          ? 500
          : live_saturation < 0.3
            ? 400
            : live_saturation < 0.4
              ? 300
              : 200

  bubbles.value = []

  for (let delay = 0; delay < delayCap; ) {
    const rand = Math.floor(Math.random() * 5) + 1

    left.push(Math.round((delay / delayCap) * 100))

    bubbles.value.push({
      id: now + delay,
      scale: 1 - Math.floor(Math.random() * 5) * 0.1,
      left: 0,
      to: rand < 4 ? rand : 2 - rand,
      delay,
    })

    delay += delayMultiplier * rand
  }

  left.sort(() => Math.random() - 0.5)

  for (let i = 0; i < left.length; i++) {
    bubbles.value[i]!.left = left[i]!
  }
}

const initChartBlocks = () => {
  if (tab.value == 'blocks') {
    const labels: string[] = [],
      exactlyProbability: number[] = [],
      exactlyColors: string[] = [],
      exactlyHoverColors: string[] = [],
      atLeastProbability: number[] = [],
      exactlyColor = getColorValue(darkMode.value ? '--color-sky-400' : '--color-blue-300'),
      exactlyHoverColor = getColorValue(darkMode.value ? '--color-sky-500' : '--color-blue-400'),
      atLeastColor = (
        darkMode.value
          ? ['--color-orange-700', '--color-yellow-600', '--color-amber-900']
          : ['--color-yellow-400', '--color-orange-400', '--color-amber-200']
      ).map((color) => getColorValue(color))

    let totalProbability = data.value!.blocks_probability[0].k ? 0.9999 : 1

    for (const row of data.value!.blocks_probability) {
      if (row.v >= 0.001) {
        labels.push(row.k)
        exactlyProbability.push(row.v)

        exactlyColors.push(
          row.k != data.value!.block
            ? exactlyColor
            : getColorValue(darkMode.value ? '--color-green-400' : '--color-green-300')
        )
        exactlyHoverColors.push(
          row.k != data.value!.block
            ? exactlyHoverColor
            : getColorValue(darkMode.value ? '--color-green-500' : '--color-green-400')
        )

        atLeastProbability.push(totalProbability)
      }
      totalProbability -= row.v
    }

    chartBlocksConfig.value = {
      data: {
        labels: labels,
        datasets: [
          {
            yAxisID: 'atLeast',
            type: 'line',
            data: atLeastProbability,
            clip: false,
            tooltipColor: `linear-gradient(90deg, ${atLeastColor[0]}, ${atLeastColor[1]})`,
            borderColor: horizontalGradiend([
              { offset: 0, color: atLeastColor[0]! },
              { offset: 1, color: atLeastColor[1]! },
            ]),
            borderWidth: 2,
            pointRadius: 0,
            // shadowColor: atLeastColor[2],
            // shadowBlur: 15,
            // shadowOffsetX: 0,
            // shadowOffsetY: 0,
          },
          {
            yAxisID: 'exactly',
            type: 'bar',
            // tooltipColor: colors,
            data: exactlyProbability,

            // borderJoinStyle: 'round',
            backgroundColor: exactlyColors,
            hoverBackgroundColor: exactlyHoverColors,
            // hoverBorderColor: hoverColors,
            // borderColor: borderColors,
            // hoverOffset: 1,
            // offset: 5,
            // spacing: data.length > 1 ? 2 : 0,
            // borderAlign: 'inner',
            borderWidth: 0,
            hoverBorderWidth: 0,
            // hoverOffset: 1,
            borderRadius: 4,
            // borderRadius: data.length > 1 ? (ctx) => (ctx.chart.data.labels![ctx.dataIndex] == 'not_voted' ? 0 : 4) : 0,
            // hoverBorderRadius: 0,
            // borderColor: () => (darkMode.value ? getColorValue('--color-gray-900') : '#fff'),
          },
        ],
      },
      options: {
        // events: [],
        animation: false,
        // layout: { padding: 2 },
        // interaction: {
        //   mode: 'index',
        //   intersect: false,
        // },
        plugins: {
          tooltip: {
            enabled: true,
            itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
            callbacks: {
              title: (tooltipItems) => {
                const blocks = +tooltipItems[0]!.label

                return t('n.block', blocks) + (blocks == data.value!.block ? ` (${t('actual')})` : '')
              },
              beforeLabel: (tooltipItem) => t(tooltipItem.dataset.yAxisID == 'exactly' ? 'exactly' : 'at_least'),
              label: (tooltipItem) => formatPercent(tooltipItem.raw as number, 2),
            },
          },
        },
        scales: {
          x: {
            border: {
              display: false,
            },
            grid: {
              drawOnChartArea: false,
              // drawTicks: true,
            },
            offset: true,
            // ticks: { mirror: true },
            // ticks: {
            //   padding: 20,
            // },
          },
          exactly: {
            border: {
              display: false,
            },
            ticks: {
              color: exactlyHoverColor,
              callback: (value) => {
                return value ? formatPercent(value as number, 2) : ''
              },
            },
            // position: 'right',
          },
          atLeast: {
            border: {
              display: false,
            },
            ticks: {
              color: atLeastColor[1],
              callback: (value) => {
                return value ? formatPercent(value as number, 2) : ''
              },
            },
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
              tickColor: '#0000',
            },
            position: 'right',
          },
        },
      },
    }
  }
}

const setTabRows = (_rows = rows.value, _newRows?: typeof rows.value) => {
  const _tab = tab.value
  if (_tab == 'delegations') {
    if (_newRows && _newRows.length < _rows.length) {
      // Show more
      _rows = _newRows
    } else {
      tabRows.value = []
    }

    for (const row of _rows) {
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

      row._delegator = row.stake > 0 || row.stake === '0'
    }
  } else if (_tab == 'relays') {
    tabRows.value = data.value!.relays
  } else {
    tabRows.value = _rows
  }

  tabSortKey.value = sortKey.value
  tabSortDir.value = sortDir.value

  if (_tab == 'delegators') {
    delegatorTypes.value = data.value!.delegator_types
  }

  initChartBlocks()
}

const onTabResolve = async (tabId: TabId) => {
  setRowsType(tabId, tabData[tabId].sortKeyMap ?? {})

  await setApiRows(tabId == 'relays' ? () => [] : undefined)

  tab.value = tabId
}

const onTabChange = () => {
  const tabValue = tab.value!,
    { colList = [], sortKeyMap } = tabData[tabValue]

  tabCols.value = getTableCols(
    sortPoint.value,
    colList.map((col) => ({
      id: col.id,
      name: 'table_cols.pool.' + tabValue,
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
      const _data = data.value!

      socialLinks.value = {}

      if (_data.homepage) {
        socialLinks.value.homepage = _data.homepage
      }

      try {
        for (const [key, val] of Object.entries(_data.extended_data.info.social as Record<string, string>)) {
          if (val) {
            let handle = key.replace('_handle', '')

            if (handle == 'twitter') {
              handle = 'x'
            } else if (handle == 'tg') {
              handle = 'telegram'
            } else if (handle == 'fb') {
              handle = 'facebook'
            } else if (handle == 'yt') {
              handle = 'youtube'
            } else if (handle == 'mail') {
              handle = 'email'
            }

            if (handle == 'email') {
              socialLinks.value.email = val.startsWith('mailto:') ? val : 'mailto:' + val
            } else if (socialIcons[handle as keyof typeof socialIcons]) {
              let link = val

              if (!link.startsWith('https://') && !link.startsWith('http://')) {
                switch (handle) {
                  case 'x':
                    link = 'x.com'
                    break
                  case 'telegram':
                    link = 't.me'
                    break
                  case 'facebook':
                    link = 'www.facebook.com'
                    break
                  case 'youtube':
                    link = 'www.youtube.com'
                    break
                  case 'twitch':
                    link = 'www.twitch.tv'
                    break
                  case 'discord':
                    link = 'discord.com'
                    break
                  case 'github':
                    link = 'github.com'
                    break
                }
                link = 'https://' + link + '/' + val
              }

              socialLinks.value[handle as keyof typeof socialLinks.value] = link
            }
          }
        }
      } catch {}

      setBubbles()

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

watch([darkMode, trendColors], initChartBlocks)

// watch(
//   () => data.value?.last_tx_time,
//   () => {
//     updateRows(setTabRows)
//   }
// )
</script>
