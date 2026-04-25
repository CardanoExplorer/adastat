<template>
  <NetworkError v-if="errorCode" :code="errorCode" />
  <template v-else-if="data">
    <div
      class="mb-9 grid grid-cols-1 gap-7 text-s sm:grid-cols-2 sm:gap-5 sm:gap-x-3 md:mb-10 md:gap-x-4 xl:grid-cols-4">
      <div class="relative order-1">
        <h1 class="text-2xl font-medium">
          {{ t('transaction') }}
          <span :style="{ color: `var(${getRatioColor(utilization)})` }">{{
            data.epoch_no == null ? t('block.genesis') : formatNumber(data.block_no)
          }}</span>
          <span class="font-light opacity-50">#</span>
          <span>{{ data.block_index }}</span>
        </h1>
        <div class="grid min-h-60 pt-2 pb-px text-s">
          <MatterTx :key="data.hash" :data="data" />
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
            <RouterLink
              v-else
              :to="{ name: 'epoch', params: { id: data.epoch_no } }"
              class="text-sky-500 underline dark:text-cyan-400">
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
            <PercentFilled v-else :value="data.size" :max="maxTxSize" class="my-0.5" />
          </DataGridSectionRow>
          <DataGridSectionRow title="block">
            <RouterLink :to="{ name: 'block', params: { id: data.block_hash } }" class="max-w-30 min-w-0">
              <TextTruncate :text="data.block_hash" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="input.sum">
            <FormattedAmount :value="inputSum!" />
          </DataGridSectionRow>
          <DataGridSectionRow title="reward.withdrawal">
            <FormattedAmount :value="withdrawalSum!" />
          </DataGridSectionRow>
          <DataGridSectionRow title="output.sum">
            <FormattedAmount :value="data.out_sum" />
          </DataGridSectionRow>
          <DataGridSectionRow title="amount">
            <FormattedAmount :value="data.amount" />
          </DataGridSectionRow>
          <DataGridSectionRow title="fee">
            <FormattedAmount :value="data.fee" />
          </DataGridSectionRow>
          <DataGridSectionRow title="treasury.donation">
            <FormattedAmount :value="data.treasury_donation" />
          </DataGridSectionRow>
          <DataGridSectionRow>
            <template #title> {{ t('deposit') }} / {{ t('refund') }} </template>
            <FormattedAmount :value="depositSum!" />
            /
            <FormattedAmount :value="refundSum!" />
          </DataGridSectionRow>
          <DataGridSectionRow>
            <template #title> {{ t('minting') }} / {{ t('burning') }} </template>
            {{ formatNumber(tokenMint!) }} / {{ formatNumber(tokenBurn!) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="metadata.size">
            {{ formatBytes(metadataSize!) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="script.size">
            {{ formatBytes(scriptQty!) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <VCard class="order-3" dark>
        <DataGridSection class="-mt-1">
          <DataGridSectionRow title="inputs">
            {{ formatNumber(data.inputs.rows.length) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="reward.withdrawals">
            {{ formatNumber(data.withdrawals.rows.length) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="outputs">
            {{ formatNumber(data.outputs.rows.length) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="tokens">
            {{ formatNumber(tokenQty!) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="certificates">
            {{ formatNumber(data.certificate) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="metadata.labels">
            {{ formatNumber(data.metadata.rows.length) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="scripts">
            {{ formatNumber(scriptQty!) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="datums">
            {{ formatNumber(datumQty!) }}
          </DataGridSectionRow>
          <DataGridSectionRow title="redeemers">
            {{ formatNumber(redeemerQty!) }}
          </DataGridSectionRow>
        </DataGridSection>
      </VCard>

      <div class="order-2 sm:order-4 sm:col-span-2 sm:mt-4 md:mt-5 xl:col-span-4">
        <DataGridSectionHeader class="mb-2 max-w-max">
          <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
          {{ t('transaction.hash') }}
        </DataGridSectionHeader>
        <div class="flex items-center text-sm">
          <TextTruncate
            :text="data.hash"
            class="text-slate-500 dark:text-gray-300"
            highlight="font-medium text-amber-500 dark:text-amber-400" />
          <CopyToClipboard :text="data.hash" class="size-5 pl-1.5 text-blue-500 dark:text-sky-400" />
        </div>
        <template v-if="message.length">
          <!-- TODO message -->
          <DataGridSectionHeader class="mb-2 max-w-max">
            <div class="mr-1.5 text-sm leading-3.5 opacity-50">#</div>
            {{ t('transaction.hash') }}
          </DataGridSectionHeader>
        </template>
      </div>
    </div>

    <VTabs :tabs="tabs" :tab="tab" @resolve="onTabResolve" @change="onTabChange">
      <template #summary>
        <div :key="row.id" v-for="row of tabRows as SummaryRow[]" class="mt-5 text-sm">
          <div class="flex items-center p-2 whitespace-nowrap sm:px-4">
            <div class="mr-1 font-light opacity-70">{{ t(row.stakeKey ? 'account.stake' : 'address') }}</div>
            <RouterLink :to="{ name: row.stakeKey ? 'account' : 'address', params: { id: row.id } }" class="min-w-0">
              <TextTruncate :text="row.id" class="text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
            <CopyToClipboard :text="row.id" class="h-5 w-5 pl-1.5" />
          </div>
          <div
            class="flex gap-2 rounded-lg bg-white/60 p-2 hover:bg-fuchsia-100/30 hover:transition-colors sm:gap-3.5 sm:p-4 dark:bg-gray-800/30 dark:hover:bg-gray-700/20">
            <component
              :key="row.type"
              :is="getTxTypeDataIcon(row.type)"
              class="mt-1 h-9 w-9 stroke-[0.5] opacity-80"
              :class="getTxTypeDataClass(row.type)" />
            <div class="text-sm">
              <div class="flex flex-wrap items-center gap-1">
                {{ t('summary.' + row.type) }}
                <template v-if="row.stakeKey">
                  <div
                    class="rounded-sx bg-teal-500/50 px-1 text-2xs whitespace-nowrap dark:bg-teal-400/50"
                    :key="type"
                    v-for="type of row.stakeKey">
                    <small>{{ t('summary.' + type) }}</small>
                  </div>
                </template>
              </div>

              <FormattedAmount
                class="mt-1 h-5 font-alt opacity-90"
                :class="row.amount < 0 ? 'text-down-500 dark:text-down-400' : 'text-up-500 dark:text-up-400'"
                sign
                :value="`${row.amount}`" />

              <div v-if="row.tokens.length > 0" class="mt-1 flex flex-wrap gap-1 text-3xs leading-4">
                <template
                  :key="i"
                  v-for="(n, i) of tabInteraction[row.id] ? row.tokens.length : Math.min(3, row.tokens.length)">
                  <VTooltip
                    v-if="n < 3 || row.tokens.length == 3 || tabInteraction[row.id]"
                    class="h-4 max-w-28 truncate rounded-xs px-1"
                    :class="
                      row.tokens[i].quantity < 0
                        ? 'bg-down-500/50 dark:bg-down-400/50'
                        : 'bg-up-500/50 dark:bg-up-400/50'
                    "
                    truncate>
                    <FormattedAmount
                      class="inline"
                      :value="row.tokens[i].quantity"
                      :fraction-digits="tokens![row.tokens[i].fingerprint].decimals"
                      currency=""
                      sign />
                    {{ getTokenName(tokens![row.tokens[i].fingerprint]) }}
                  </VTooltip>
                </template>
                <button
                  v-if="row.tokens.length > 3"
                  class="underline decoration-dashed underline-offset-2 opacity-90"
                  @click="showMoreToken(row.id)">
                  {{ t(tabInteraction[row.id] ? 'show.less' : 'more.n', { n: row.tokens.length - 2 }) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <DataPagination
          class="mt-8 md:mt-12"
          :page-count="pageCount"
          :total="summaryRows!.length"
          :more-handling="moreHandling"
          more-only
          @more="onShowMore" />
      </template>

      <template #inputs>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #address="{ row: { address } }">
            <DataListHolder :bech32="address" />
          </template>
          <template #account="{ row: { stake_base16, stake_bech32 } }">
            <DataListHolder :bech32="stake_bech32" :base16="stake_base16" />
          </template>
          <template #amount="{ row: { amount } }">
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
          <template #utxo="{ row: { utxo_hash, utxo_index } }">
            <RouterLink :to="{ name: 'transaction', params: { id: utxo_hash } }" class="inline-block w-40 max-w-[30vw]">
              <TextTruncate
                :text="utxo_hash"
                class="font-medium text-sky-500 *:underline dark:text-cyan-400" /> </RouterLink
            ><span class="font-light opacity-50">#</span>{{ utxo_index }}
          </template>
          <template #redeemer>–</template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_inputs`) }}</div>
      </template>

      <template #withdrawals>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #account="{ row: { stake_base16, stake_bech32 } }">
            <DataListHolder :bech32="stake_bech32" :base16="stake_base16" />
          </template>
          <template #amount="{ row: { amount } }">
            <FormattedAmount :value="amount" />
          </template>
          <template #redeemer>–</template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_withdrawals`) }}</div>
      </template>

      <template #outputs>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #address="{ row: { address } }">
            <DataListHolder :bech32="address" />
          </template>
          <template #account="{ row: { stake_base16, stake_bech32 } }">
            <DataListHolder :bech32="stake_bech32" :base16="stake_base16" />
          </template>
          <template #amount="{ row: { amount } }">
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
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_inputs`) }}</div>
      </template>

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
          <template #quantity="{ row: { quantity, decimals } }">
            <FormattedAmount
              v-if="quantity"
              :value="quantity"
              :raction-digits="decimals"
              currency=""
              sign
              :class="quantity < 0 ? 'text-down-500 dark:text-down-400' : 'text-up-500 dark:text-up-400'" />
            <template v-else>0</template>
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
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_tokens`) }}</div>
      </template>

      <template #metadata>
        <template v-if="metadata.length">
          <div :key="row.key" v-for="row of metadata" class="mt-5 text-sm">
            <div class="flex items-center gap-2 p-2 sm:gap-4 sm:px-4">
              <div class="flex items-center gap-1 text-slate-500 dark:text-gray-300">
                {{ t('label') }}
                <b>{{ row.key }}</b>
                <button
                  class="relative ml-2 grid grid-cols-2 items-center rounded-sx bg-sky-100 py-px text-center text-s leading-3 text-slate-800 dark:bg-gray-800 dark:text-gray-300">
                  <div
                    class="absolute h-3.5 w-1/2 transform rounded-sx opacity-60 transition-transform"
                    :class="
                      !row.pretty ? 'translate-x-full bg-gray-400 dark:bg-gray-500' : 'bg-violet-400 dark:bg-violet-500'
                    "></div>
                  <small class="z-1 px-1" @click="row.pretty = true">Pretty</small>
                  <small class="z-1 px-1" @click="row.pretty = false">Raw</small>
                </button>
              </div>
              <DownloadString
                :text="JSON.stringify(row.data, null, row.pretty ? 2 : 0)"
                :name="`label.${row.key}`"
                class="text-c5 ml-auto h-4 w-4" />
              <CopyToClipboard :text="JSON.stringify(row.data, null, row.pretty ? 2 : 0)" class="text-c5 h-4 w-4" />
            </div>
            <div class="rounded-lg bg-sky-100/50 p-2 px-3 py-2 sm:p-4 dark:bg-gray-800/50">
              <component
                :is="row.pretty ? 'pre' : 'div'"
                :class="row.pretty ? 'overflow-x-auto font-mono' : 'line-clamp-3'">
                {{ row.data }}
              </component>
            </div>
          </div>
        </template>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_meta`) }}</div>
      </template>

      <template #stake_keys>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #account="{ row: { stake_base16, stake_bech32 } }">
            <DataListHolder :bech32="stake_bech32" :base16="stake_base16" />
          </template>
          <template #certificate="{ row }">
            <PoolDelegation
              v-if="row.to_pool_hash"
              :name="row.to_pool_name"
              :bech32="row.to_pool_bech32"
              :hash="row.to_pool_hash"
              :ticker="row.to_pool_ticker"
              :prev_name="row.from_pool_name"
              :prev_bech32="row.from_pool_bech32"
              :prev_hash="row.from_pool_hash"
              :prev_ticker="row.from_pool_ticker"
              :value="row.amount" />
            <DRepDelegation
              v-else-if="row.bech32"
              :name="row.given_name"
              :bech32="row.bech32"
              :base16="row.base16"
              :image="row.image"
              :prev_name="row.prev_given_name"
              :prev_bech32="row.prev_bech32"
              :prev_base16="row.prev_base16"
              :prev_image="row.prev_image" />
            <CertRegistration v-else-if="row.deposit_amount > 0" :value="row.deposit_amount" />
            <CertDeregistration v-else-if="row.deposit_amount < 0" :value="-row.deposit_amount" />
          </template>
          <template #effective_date="{ row: { active_epoch_no, active_time } }">
            <template v-if="active_time">
              <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(active_time) }}</div>
              <div class="mt-1 text-xs leading-5 font-light">{{ t('epoch') }} {{ active_epoch_no }}</div>
            </template>
            <template v-else>{{ t('immediately') }}</template>
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_stakekeys`) }}</div>
      </template>

      <template #pools>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #pool="{ row: { pool_name, pool_bech32, pool_hash, pool_ticker } }">
            <DataListPool :name="pool_name" :bech32="pool_bech32" :hash="pool_hash" :ticker="pool_ticker" />
          </template>
          <template #certificate="{ row: { deposit_amount, retiring_time } }">
            <CertDeregistration v-if="retiring_time" :value="deposit_amount" icon-hide />
            <CertRegistration v-else-if="deposit_amount > 0" :value="deposit_amount" icon-hide />
            <CertUpdate v-else icon-hide />
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
          <template #reward_address="{ row: { reward_address_bech32, reward_address_base16 } }">
            <DataListHolder :bech32="reward_address_bech32" :base16="reward_address_base16" />
          </template>
          <template #pledge="{ row: { pledge, owners, index } }">
            <template v-if="pledge">
              <div class="mb-1 flex w-40 max-w-[30vw] justify-between gap-2">
                <TooltipAmount :value="pledge" />
                <button
                  v-if="tabInteraction[index]"
                  class="h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                  @click="tabInteraction[index] = false">
                  {{ t('show.less') }}
                </button>
              </div>
              <div v-if="owners?.length" class="w-40 max-w-[30vw]">
                <button
                  v-if="!tabInteraction[index]"
                  class="h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                  @click="tabInteraction[index] = true">
                  {{ t('n.owner', owners.length) }}
                </button>
                <template v-if="tabInteraction[index]">
                  <DataListHolder
                    :bech32="bech32"
                    :base16="base16"
                    :key="base16"
                    v-for="{ bech32, base16 } of owners"
                    class="mt-3" />
                </template>
              </div>
            </template>
            <template v-else>–</template>
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>
          <template #relays="{ row: { relays, index } }">
            <template v-if="relays?.length">
              <div
                :key="i"
                v-for="(n, i) of tabInteraction['relay' + index] ? relays.length : relays.length == 2 ? 2 : 1"
                :class="{ 'mt-1': (i as number) > 0 }">
                {{ relays[i].relay
                }}<span v-if="relays[i].port" class="font-light opacity-70">:{{ relays[i].port }}</span>
              </div>
              <button
                v-if="relays.length > 2"
                class="mt-1 h-5 text-xs font-light underline decoration-dashed underline-offset-2 opacity-70"
                @click="tabInteraction['relay' + index] = !tabInteraction['relay' + index]">
                {{ t(tabInteraction['relay' + index] ? 'show.less' : 'more.n', { n: relays.length - 1 }) }}
              </button>
            </template>
            <template v-else>–</template>
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_pools`) }}</div>
      </template>

      <template #dreps>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #drep="{ row: { given_name, bech32, base16, image } }">
            <DataListDRep :name="given_name" :bech32="bech32" :base16="base16" :image="image" />
          </template>
          <template #certificate="{ row: { deposit_amount } }">
            <CertDeregistration v-if="deposit_amount < 0" :value="-deposit_amount" icon-hide />
            <CertRegistration v-else-if="deposit_amount > 0" :value="deposit_amount" icon-hide />
            <CertUpdate v-else icon-hide />
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="mt-7 px-2 text-sm font-light opacity-70 sm:px-4">{{ t(`transaction.no_dreps`) }}</div>
      </template>

      <template #committee>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #member="{ row: { member, cold_bech32 } }">
            <div class="flex max-w-52 gap-2.5 font-sans md:max-w-60">
              <VImg class="h-10 w-10" :src="member?.image" imgClass="rounded-md" fallback-class="stroke-[0.5]" />
              <div class="min-w-0 font-medium">
                <TextTruncate
                  :text="member?.name?.trim() || cold_bech32"
                  :tail-length="member?.name?.trim() ? 0 : 6"
                  class="mb-1.5" />
              </div>
            </div>
          </template>
          <template #certificate="{ row: { hot_hash } }">
            {{ t(hot_hash ? 'registration' : 'deregistration') }}
          </template>
          <template #key="{ row: { hot_hash, hot_bech32 } }">
            <template v-if="hot_hash">
              <div class="mb-1 block w-40 max-w-[30vw]">
                <TextTruncate :text="hot_bech32" />
              </div>
              <div class="w-40 max-w-[30vw] font-light opacity-70"><TextTruncate :text="hot_hash" /></div>
            </template>
            <template v-else>–</template>
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="font-300 mt-7 px-2 text-sm opacity-70 sm:px-4">{{ t(`transaction.no_committee`) }}</div>
      </template>

      <template #gov_actions>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #gov_action="{ row: { index, title } }">
            <RouterLink
              :to="{ name: 'gov_action', params: { id: data.hash + ('0' + parseInt(index).toString(16)).slice(-2) } }"
              class="mb-1 block w-72 max-w-[30vw]">
              <TextTruncate
                :text="title"
                :tail-length="0"
                class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #type="{ row: { type } }"> {{ t('gov_action.type.' + type) }} </template>
          <template #reward_address="{ row: { deposit_address_bech32, deposit_address_base16 } }">
            <DataListHolder :bech32="deposit_address_bech32" :base16="deposit_address_base16" />
          </template>
          <template #expiration="{ row: { expiration_epoch, expiration_time } }">
            <div class="text-amber-700 dark:text-orange-300">{{ formatDateTime(expiration_time) }}</div>
            <div class="mt-1 text-xs leading-5 font-light">{{ t('epoch') }} {{ expiration_epoch }}</div>
          </template>
          <template #deposit="{ row: { deposit_amount } }">
            <TooltipAmount
              :value="deposit_amount"
              class="bg-linear-to-r from-lime-700 to-yellow-700 bg-clip-text font-alt text-transparent dark:from-lime-400 dark:to-yellow-400" />
          </template>
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="font-300 mt-7 px-2 text-sm opacity-70 sm:px-4">{{ t(`transaction.no_gov_actions`) }}</div>
      </template>

      <template #votes>
        <DataList
          v-if="tabRows?.length"
          :cols="tabCols"
          :rows="tabRows"
          :unique-key="(row) => row.index"
          :sort-key="tabSortKey"
          :sort-dir="tabSortDir"
          :sort-handling="sortHandling"
          @sort="onSort">
          <template #index="{ row: { index } }">{{ index }}</template>
          <template #gov_action="{ row: { ga_index, title } }">
            <RouterLink
              :to="{
                name: 'gov_action',
                params: { id: data.hash + ('0' + parseInt(ga_index).toString(16)).slice(-2) },
              }"
              class="mb-1 block w-72 max-w-[30vw]">
              <TextTruncate
                :text="title"
                :tail-length="0"
                class="mb-1 font-medium text-sky-500 *:underline dark:text-cyan-400" />
            </RouterLink>
          </template>
          <template #role="{ row: { voter_role } }">
            {{ t(voter_role == 'spo' ? 'pool' : voter_role == 'drep' ? 'drep' : 'cc_member') }}
          </template>
          <template #vote="{ row: { vote } }">
            <VoteLabel :vote="vote" />
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
          <template #meta="{ row: { meta_url, meta_hash } }">
            <DataListMeta :url="meta_url" :hash="meta_hash" />
          </template>

          <DataPagination
            class="mt-8 md:mt-12"
            :page-count="pageCount"
            :total="sortedRows!.length"
            :more-handling="moreHandling"
            more-only
            @more="onShowMore" />
        </DataList>
        <div v-else class="font-300 mt-7 px-2 text-sm opacity-70 sm:px-4">{{ t(`transaction.no_votes`) }}</div>
      </template>
    </VTabs>
  </template>
</template>

<script setup lang="ts">
import { h, nextTick, ref, useTemplateRef, watch } from 'vue'

import KeyIcon from '@/assets/icons/key.svg?component'
import LoupeIcon from '@/assets/icons/loupe.svg?component'
import MenuActionsIcon from '@/assets/icons/menu_actions.svg?component'
import MenuDRepsIcon from '@/assets/icons/menu_dreps.svg?component'
import MenuHoldersIcon from '@/assets/icons/menu_holders.svg?component'
import MenuPoolsIcon from '@/assets/icons/menu_pools.svg?component'
import MenuTokensIcon from '@/assets/icons/menu_tokens.svg?component'
import VotesIcon from '@/assets/icons/votes.svg?component'
import WalletInIcon from '@/assets/icons/wallet_in.svg?component'
import WalletIntraIcon from '@/assets/icons/wallet_intra.svg?component'
import WalletOutIcon from '@/assets/icons/wallet_out.svg?component'
import WalletRewardIcon from '@/assets/icons/wallet_reward.svg?component'
import WalletSwapIcon from '@/assets/icons/wallet_swap.svg?component'

import { t } from '@/i18n'
import { useViewApi } from '@/utils/api'
// import { getColorValue } from '@/utils/chartjs'
import { formatBytes, formatDateTime, formatNumber, formatPercent } from '@/utils/formatter'
import {
  type AnyObject,
  type BigIntObject,
  type BooleanObject,
  getRatio,
  getRatioColor,
  getTabData,
  getTableCols,
  getTokenName,
  getTxTypeDataClass,
  getTxTypeDataIcon,
} from '@/utils/helper'
import { limit } from '@/utils/settings'

import CertDeregistration from '@/components/CertDeregistration.vue'
import CertRegistration from '@/components/CertRegistration.vue'
import CertUpdate from '@/components/CertUpdate.vue'
import CopyToClipboard from '@/components/CopyToClipboard.vue'
import DRepDelegation from '@/components/DRepDelegation.vue'
import DataGridSection from '@/components/DataGridSection.vue'
import DataGridSectionHeader from '@/components/DataGridSectionHeader.vue'
import DataGridSectionRow from '@/components/DataGridSectionRow.vue'
import DataList from '@/components/DataList.vue'
import DataListDRep from '@/components/DataListDRep.vue'
import DataListHolder from '@/components/DataListHolder.vue'
import DataListMeta from '@/components/DataListMeta.vue'
import DataListPool from '@/components/DataListPool.vue'
import DataListToken from '@/components/DataListToken.vue'
import DataPagination from '@/components/DataPagination.vue'
import DownloadString from '@/components/DownloadString.vue'
// import ChartJS, { type ChartConfigurationCustomTypesPerDataset } from '@/components/ChartJS.vue'
import FormattedAmount from '@/components/FormattedAmount.vue'
import MatterTx from '@/components/MatterTx.vue'
import PercentFilled from '@/components/PercentFilled.vue'
import PoolDelegation from '@/components/PoolDelegation.vue'
import TextTruncate from '@/components/TextTruncate.vue'
import TooltipAmount from '@/components/TooltipAmount.vue'
import VCard from '@/components/VCard.vue'
import VImg from '@/components/VImg.vue'
import VTabs, { type Tab } from '@/components/VTabs.vue'
import VTooltip from '@/components/VTooltip.vue'
import VoteLabel from '@/components/VoteLabel.vue'

type TabId = keyof typeof tabData

type StakeKeyCerts = Set<'reg' | 'dereg' | 'pool' | 'drep'>

type SummaryRow = {
  id: string
  stakeKey: StakeKeyCerts | false
  amount: bigint
  deposit: bigint
  tokens: any[]
  type: 'in' | 'out' | 'swap' | 'intra'
}

const tabData = getTabData({
  summary: {
    icon: LoupeIcon,
  },
  inputs: {
    icon: WalletInIcon,
    colList: [
      { id: 'index' },
      { id: 'address' },
      { id: 'account' },
      { id: 'amount' },
      { id: 'tokens' },
      { id: 'redeemer' },
      { id: 'utxo' },
    ],
    sortKeyMap: { index: 'index', amount: 'amount' },
  },
  withdrawals: {
    icon: WalletRewardIcon,
    colList: [{ id: 'index' }, { id: 'account' }, { id: 'amount' }, { id: 'redeemer' }],
    sortKeyMap: { index: 'index', amount: 'amount' },
  },
  outputs: {
    icon: WalletOutIcon,
    colList: [
      { id: 'index' },
      { id: 'address' },
      { id: 'account' },
      { id: 'amount' },
      { id: 'tokens' },
      { id: 'datum' },
    ],
    sortKeyMap: { index: 'index', amount: 'amount' },
  },
  tokens: {
    icon: MenuTokensIcon,
    colList: [{ id: 'token' }, { id: 'quantity' }, { id: 'policy' }, { id: 'fingerprint' }],
    sortKeyMap: { quantity: 'quantity' },
  },
  metadata: {
    icon: () => h('div', { class: 'text-lg leading-5 text-center aspect-square font-light' }, '{ }'),
  },
  stake_keys: {
    icon: KeyIcon,
    colList: [{ id: 'index' }, { id: 'account' }, { id: 'certificate' }, { id: 'effective_date' }],
    sortKeyMap: { index: 'index' },
  },
  pools: {
    icon: MenuPoolsIcon,
    colList: [
      { id: 'index' },
      { id: 'pool' },
      { id: 'certificate' },
      { id: 'effective_date' },
      { id: 'fees' },
      { id: 'reward_address' },
      { id: 'pledge' },
      { id: 'relays' },
      { id: 'meta' },
    ],
    sortKeyMap: { index: 'index' },
  },
  dreps: {
    icon: MenuDRepsIcon,
    colList: [{ id: 'index' }, { id: 'drep' }, { id: 'certificate' }, { id: 'meta' }],
    sortKeyMap: { index: 'index' },
  },
  committee: {
    icon: MenuHoldersIcon,
    colList: [{ id: 'index' }, { id: 'member' }, { id: 'certificate' }, { id: 'key' }, { id: 'meta' }],
    sortKeyMap: { index: 'index' },
  },
  gov_actions: {
    icon: MenuActionsIcon,
    name: 'gov_actions',
    colList: [
      { id: 'index' },
      { id: 'gov_action' },
      { id: 'type' },
      { id: 'expiration' },
      { id: 'deposit' },
      { id: 'reward_address' },
      { id: 'meta' },
    ],
    sortKeyMap: { index: 'index' },
  },
  votes: {
    icon: VotesIcon,
    colList: [{ id: 'index' }, { id: 'voter' }, { id: 'role' }, { id: 'vote' }, { id: 'gov_action' }, { id: 'meta' }],
    sortKeyMap: { index: 'index' },
  },
})

const maxTxSize = 16384,
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
  tabs = ref<Tab[]>([]),
  tab = ref<TabId>(),
  tabRows = ref<typeof rows.value>(),
  tabCols = ref<ReturnType<typeof getTableCols>>(),
  tabSortKey = ref(sortKey.value),
  tabSortDir = ref(sortDir.value),
  tokens = ref<AnyObject>(),
  summaryRows = ref<SummaryRow[]>(),
  stakeKeyRows = ref<any[]>(),
  poolRows = ref<any[]>(),
  inputSum = ref<`${bigint}`>(),
  withdrawalSum = ref<`${bigint}`>(),
  depositSum = ref<`${bigint}`>(),
  refundSum = ref<`${bigint}`>(),
  tokenMint = ref<number>(),
  tokenBurn = ref<number>(),
  tokenQty = ref<number>(),
  metadataSize = ref<number>(),
  scriptQty = ref<number>(),
  redeemerQty = ref<number>(),
  datumQty = ref<number>(),
  utilization = ref(0),
  metadata = ref<AnyObject[]>([]),
  message = ref<string[]>([]),
  encMessage = ref<string>(),
  passphrase = ref<string>(),
  passphraseError = ref(),
  // passphraseInput = useTemplateRef('passphraseInputRef'),
  tabInteraction = ref<BooleanObject>({})

let sortedRows: typeof rows.value

// const removeSpoiler = async () => {
//   await decrypt()

//   passphraseError.value = false

//   nextTick(() => passphraseInput.value?.focus())
// }

const setMessage = (_msg: any[]) => {
  const _message = message.value!

  let needConcat!: boolean

  try {
    for (const msg of _msg) {
      const msgStr = msg.toString()
      if (needConcat) {
        _message[_message.length - 1] += msgStr
      } else {
        _message.push(msgStr)
      }
      needConcat = msgStr.length == 64
    }
  } catch {}
}

const decrypt = async () => {
  try {
    const encryptedData = Uint8Array.from(atob(encMessage.value!), (c) => c.charCodeAt(0))

    const pKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase.value || 'cardano'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    const keyIv = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encryptedData.slice(8, 16),
          iterations: 10000,
          hash: 'SHA-256',
        },
        pKey,
        384 // 256 bits for Key + 128 bits for IV
      )
    )

    const aesKey = await crypto.subtle.importKey('raw', keyIv.slice(0, 32), { name: 'AES-CBC' }, false, ['decrypt'])

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: keyIv.slice(32) },
      aesKey,
      encryptedData.slice(16)
    )

    message.value = []
    encMessage.value = ''

    setMessage(JSON.parse(new TextDecoder().decode(decryptedBuffer)))
  } catch {
    passphraseError.value = true
  }
}

const showMoreToken = (uniqueKey: string, el?: HTMLElement) => {
  tabInteraction.value[uniqueKey] = !tabInteraction.value[uniqueKey]

  if (el) {
    el.style.width = tabInteraction.value[uniqueKey] ? el.offsetWidth + 'px' : ''
  }
}

const getSortedRows = (tabId = tab.value!) => {
  const _data = data.value!,
    sortField = tabData[tabId].sortKeyMap?.[sortKey.value]

  if (tabId == 'summary') {
    sortedRows = summaryRows.value!
  } else if (tabId == 'tokens') {
    sortedRows = Object.values(tokens.value!)
  } else if (tabId == 'stake_keys') {
    sortedRows = stakeKeyRows.value!
  } else if (tabId == 'pools') {
    sortedRows = poolRows.value!
  } else if (tabId == 'dreps') {
    sortedRows = _data.drep_registrations.rows
  } else if (tabId == 'votes') {
    sortedRows = _data.gov_votes.rows
  } else {
    sortedRows = _data[tabId]?.rows || []
  }

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
      name: 'table_cols.transaction.' + tabValue,
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
  await moreHandler(
    () => sortedRows.slice(pageCount.value * limit.value, (pageCount.value + 1) * limit.value),
    setTabRows
  )
}

watch(passphrase, () => (passphraseError.value = false))

watch(
  () => data.value?.hash,
  (newValue, oldValue) => {
    if (newValue && newValue != oldValue) {
      const _data = data.value!

      let _inputSum = 0n,
        _withdrawalSum = 0n,
        _depositSum = 0n,
        _refundSum = 0n,
        _tokenMint = 0,
        _tokenBurn = 0,
        _tokenQty = 0,
        _metadata = [],
        _metadataSize = 0,
        _scriptQty = 0,
        _datumQty = 0,
        _redeemerQty = 0,
        _message = [],
        _encMessage = ''

      utilization.value = _data.epoch_no == null ? 1 : getRatio(_data.size, maxTxSize)

      if (_data.metadata) {
        _metadata = _data.metadata.rows
        for (const row of _data.metadata.rows) {
          if (row.key == 674) {
            try {
              if (row.data.enc == 'basic') {
                _message = row.data.msg
                _encMessage = row.data.msg.join('')
              } else {
                setMessage(row.data.msg)
              }
            } catch {}
          }

          _metadataSize += row.size
        }
      } else {
        _metadata = []
      }

      //stake keys
      const _stakeKeys: Record<string, StakeKeyCerts> = {},
        _stakeKeyRows = [],
        _stakeKeyDeposits: BigIntObject = {}

      for (const row of _data.stake_registrations.rows.concat(
        _data.delegations.rows,
        _data.stake_deregistrations.rows,
        _data.drep_delegations.rows
      )) {
        _stakeKeyRows.push(row)
        ;(_stakeKeys[row.stake_bech32] ??= new Set()).add(
          row.deposit_amount ? (row.deposit_amount > 0 ? 'reg' : 'dereg') : row.to_pool_hash ? 'pool' : 'drep'
        )

        if (row.deposit_amount) {
          _stakeKeyDeposits[row.stake_bech32] = (_stakeKeyDeposits[row.stake_bech32] ?? 0n) + BigInt(row.deposit_amount)
        }
      }

      // pools
      const _poolRows = []
      for (const row of _data.pool_updates.rows.concat(_data.pool_retirements.rows)) {
        _poolRows.push(row)
      }

      // deposits
      for (const row of _data.stake_registrations.rows.concat(
        _data.stake_deregistrations.rows,
        _data.pool_updates.rows,
        _data.gov_actions.rows,
        _data.drep_registrations.rows
      )) {
        if (row.deposit_amount > 0) {
          _depositSum += BigInt(row.deposit_amount)
        } else if (row.deposit_amount < 0) {
          _refundSum -= BigInt(row.deposit_amount)
        }
      }

      // dreps
      // drepsRows = []
      // for (const row of _data.drep_registrations.rows) {
      //   drepsRows.push(row)
      // }

      // summary
      const _summaryRows: Record<string, SummaryRow> = {},
        _rowTokens: Record<string, BigIntObject> = {}

      const _tokens: Record<string, AnyObject> = {}

      for (const row of _data.inputs.rows.concat(_data.withdrawals.rows)) {
        const rowId = row.stake_bech32 || row.address
        // const rowId = (!row.address_has_script && row.stake_bech32) || row.address

        if (_summaryRows[rowId]) {
          _summaryRows[rowId].amount -= BigInt(row.amount)
        } else {
          _summaryRows[rowId] = {
            id: rowId,
            stakeKey: row.stake_bech32 ? (_stakeKeys[rowId] ?? new Set()) : false,
            amount: -BigInt(row.amount),
            deposit: _stakeKeyDeposits[row.stake_bech32] ?? 0n,
            tokens: [],
            type: 'in',
          }
        }

        if (!_rowTokens[rowId]) {
          _rowTokens[rowId] = {}
        }

        if (row.tokens?.rows) {
          for (const token of row.tokens.rows) {
            const fingerprint = token.fingerprint,
              qty = BigInt(token.quantity)

            _rowTokens[rowId][fingerprint] = (_rowTokens[rowId][fingerprint] ?? 0n) - qty
            ;(_tokens[fingerprint] ??= { ...token, quantity: 0n }).quantity -= qty
          }

          _inputSum += BigInt(row.amount)
        } else {
          _withdrawalSum += BigInt(row.amount)
        }
      }

      for (const row of _data.outputs.rows) {
        const rowId = row.stake_bech32 || row.address
        // const rowId = (!row.address_has_script && row.stake_bech32) || row.address

        if (_summaryRows[rowId]) {
          _summaryRows[rowId].amount += BigInt(row.amount)
        } else {
          _summaryRows[rowId] = {
            id: rowId,
            stakeKey: row.stake_bech32 ? (_stakeKeys[rowId] ?? new Set()) : false,
            amount: BigInt(row.amount),
            deposit: _stakeKeyDeposits[row.stake_bech32] ?? 0n,
            tokens: [],
            type: 'out',
          }
        }

        if (!_rowTokens[rowId]) {
          _rowTokens[rowId] = {}
        }

        for (const token of row.tokens.rows) {
          const fingerprint = token.fingerprint,
            qty = BigInt(token.quantity)

          _rowTokens[rowId][fingerprint] = (_rowTokens[rowId][fingerprint] ?? 0n) + qty
          ;(_tokens[fingerprint] ??= { ...token, quantity: 0n }).quantity += qty
        }

        if (row.data_hash) {
          _datumQty++
        }
      }

      const scripts: any = {}
      for (const row of _data.redeemer.rows) {
        if (row.script_hash) {
          scripts[row.script_hash] = true
        }
      }
      _scriptQty = Object.keys(scripts).length
      _redeemerQty = _data.redeemer.rows.length

      for (const [rowId, row] of Object.entries(_summaryRows)) {
        let pos = row.amount > 0,
          neg = row.amount < 0

        for (const [fingerprint, quantity] of Object.entries(_rowTokens[rowId]!)) {
          if (quantity) {
            row.tokens.push({
              fingerprint: fingerprint,
              quantity: quantity,
            })
            if (quantity > 0) {
              pos = true
            } else {
              neg = true
            }
          }
        }

        if (row.amount || row.tokens.length) {
          if (_stakeKeys[rowId] && row.tokens.length == 0 && row.amount == -row.deposit - BigInt(_data.fee)) {
            row.type = 'intra'
          } else if (pos && neg) {
            row.type = 'swap'
          } else if (pos) {
            row.type = 'in'
          } else {
            row.type = 'out'
          }
        } else if (_stakeKeys[rowId]) {
          row.type = 'intra'
        } else {
          delete _summaryRows[rowId]
        }
      }

      summaryRows.value = Object.values(_summaryRows)

      if (summaryRows.value.length == 1) {
        summaryRows.value[0]!.type = 'intra'
      }

      for (const token of Object.values(_tokens)) {
        if (token.quantity > 0) {
          _tokenMint++
        } else if (token.quantity < 0) {
          _tokenBurn++
        }

        _tokenQty++
      }

      inputSum.value = `${_inputSum}`
      withdrawalSum.value = `${_withdrawalSum}`
      depositSum.value = `${_depositSum}`
      refundSum.value = `${_refundSum}`
      tokenMint.value = _tokenMint
      tokenBurn.value = _tokenBurn
      tokenQty.value = _tokenQty
      metadataSize.value = _metadataSize
      scriptQty.value = _scriptQty
      redeemerQty.value = _redeemerQty
      datumQty.value = _datumQty
      metadata.value = _metadata
      message.value = _message
      encMessage.value = _encMessage
      tokens.value = _tokens
      stakeKeyRows.value = _stakeKeyRows
      poolRows.value = _poolRows

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
        getSortedRows()
        onTabChange()
      }
    }
  },
  {
    immediate: true,
  }
)
</script>
