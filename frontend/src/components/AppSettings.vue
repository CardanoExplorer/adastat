<template>
  <Transition
    enter-from-class="scale-120 opacity-0 sm:transform-[perspective(10rem)_rotateY(-90deg)]"
    enter-active-class="transition-translate duration-300 ease-out"
    leave-to-class="scale-120 opacity-0 sm:transform-[perspective(10rem)_rotateY(-90deg)]"
    leave-active-class="transition-translate duration-300 ease-out">
    <div
      v-if="visible"
      class="fixed inset-0 z-80 bg-sky-50/90 backdrop-blur-xs sm:left-auto sm:w-90 sm:bg-transparent sm:backdrop-brightness-200 lg:w-100 dark:bg-gray-900/90 dark:sm:bg-transparent">
      <aside
        class="fixed inset-0 z-80 scrollbar overscroll-none sm:left-auto sm:[direction:rtl]"
        @mousemove="setThinScrollbar"
        @mouseleave="thinScrollbar = false"
        @click.stop
        ref="aside"
        :class="{ 'sm:scrollbar-thin': thinScrollbar }">
        <div
          class="min-h-full px-2 pb-2 sm:w-90 sm:bg-sky-50/90 sm:px-3 sm:[direction:ltr] md:px-4 lg:w-100 dark:sm:bg-gray-900/90 dark:sm:text-gray-50">
          <div
            class="sticky top-0 z-1 -mx-2 mb-6 bg-sky-50 pt-6 shadow-blur shadow-sky-50 sm:m-0 sm:p-0 dark:bg-gray-900 dark:shadow-gray-900">
            <div
              class="absolute top-0 left-0 h-11 w-full bg-linear-to-b from-fuchsia-100/80 to-sky-50 sm:hidden dark:from-sky-950/80 dark:to-gray-900"></div>
            <div
              class="-mx-3 hidden h-1 bg-linear-to-r from-violet-400 to-sky-300 sm:block md:-mx-4 dark:from-violet-500 dark:to-sky-500"></div>
            <div class="relative flex h-10 items-center sm:h-16 md:h-20">
              <div class="mx-auto text-lg">{{ t('settings') }}</div>
              <button
                ref="closeButton"
                class="absolute left-6 size-10 rounded-md bg-sky-100 py-3 text-slate-700 hover:bg-sky-200/50 sm:right-2 sm:left-auto dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800"
                @click="emit('close')">
                <ChevronIcon class="mx-auto size-4 rotate-180 sm:hidden" />
                <CloseIcon class="mx-auto hidden size-4 rotate-180 stroke-2 sm:block pointer-fine:sm:hidden" />
                <div class="hidden text-center text-s leading-4 pointer-fine:sm:block">Esc</div>
              </button>
            </div>
          </div>

          <AppSettingsAccordion :icon="LanguageIcon" :title="t('language')" :desc="t('language.desc')">
            <div
              class="mb-4 flex w-full cursor-pointer items-center gap-2 text-s"
              :class="{
                'mt-6 md:mt-8': !i,
                'sm:hover:*:last:bg-white dark:sm:hover:*:last:bg-gray-700': isoCode != locale,
              }"
              @click="locale = isoCode"
              :key="isoCode"
              v-for="(localeData, isoCode, i) of locales">
              <div class="flex min-w-0 flex-1 items-center gap-1">
                <div class="truncate">{{ localeData.title }}</div>
                <CheckIcon v-if="isoCode == locale" class="mr-2 size-4 stroke-2 text-violet-400" />
              </div>
              <button
                class="flex h-8 items-center gap-0.5 rounded-md bg-white/80 px-3 dark:bg-gray-700/50"
                :class="{
                  'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800':
                    isoCode == locale,
                }">
                {{ localeData.short }}
              </button>
            </div>
          </AppSettingsAccordion>

          <AppSettingsAccordion :icon="AppearanceIcon" :title="t('appearance')" :desc="t('appearance.desc')">
            <div
              class="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500 capitalize dark:text-gray-400">
              <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
              {{ t('appearance.theme') }}
              <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="cursor-pointer pt-10 hover:*:opacity-100" @click="appTheme = 'light'">
                <button
                  class="block w-full rounded-md border border-sky-100 bg-sky-50 p-3 dark:border-gray-800"
                  :class="
                    appTheme == 'light'
                      ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800'
                      : 'opacity-90'
                  ">
                  <div class="mx-auto size-10 rounded-full bg-slate-300"></div>
                  <div class="mx-1.5 my-2 h-2 rounded-sx bg-slate-300"></div>
                  <div class="rounded-md border border-sky-100 bg-white">
                    <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                    <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                    <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                  </div>
                </button>
                <div
                  class="flex items-center justify-center gap-1 text-s"
                  :class="appTheme == 'light' ? 'mt-3' : 'mt-1.5'">
                  {{ t('appearance.theme.light') }}
                  <CheckIcon v-if="appTheme == 'light'" class="size-4 stroke-2 text-violet-400" />
                </div>
              </div>
              <div class="cursor-pointer pt-10 hover:*:opacity-100" @click="appTheme = 'dark'">
                <button
                  class="block w-full rounded-md border border-gray-900 bg-gray-900 p-3"
                  :class="
                    appTheme == 'dark'
                      ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800'
                      : 'opacity-90'
                  ">
                  <div class="mx-auto size-10 rounded-full bg-gray-600"></div>
                  <div class="mx-1.5 my-2 h-2 rounded-sx bg-gray-600"></div>
                  <div class="rounded-md border border-gray-800 bg-gray-800">
                    <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                    <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                    <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                  </div>
                </button>
                <div
                  class="flex items-center justify-center gap-1 text-s"
                  :class="appTheme == 'dark' ? 'mt-3' : 'mt-1.5'">
                  {{ t('appearance.theme.dark') }}
                  <CheckIcon v-if="appTheme == 'dark'" class="size-4 stroke-2 text-violet-400" />
                </div>
              </div>
              <div class="cursor-pointer pt-10 hover:*:opacity-100" @click="appTheme = 'system'">
                <button
                  class="relative block w-full rounded-md"
                  :class="
                    appTheme == 'system'
                      ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800'
                      : 'opacity-90'
                  ">
                  <div class="rounded-md border border-sky-100 bg-sky-50 p-3 dark:border-gray-800">
                    <div class="mx-auto size-10 rounded-full bg-slate-300"></div>
                    <div class="mx-1.5 my-2 h-2 rounded-sx bg-slate-300"></div>
                    <div class="rounded-md border border-sky-100 bg-white">
                      <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                      <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                      <div class="m-2 h-2 rounded-sx bg-slate-300"></div>
                    </div>
                  </div>
                  <div class="absolute inset-0 w-1/2 overflow-hidden">
                    <div class="w-2/1 rounded-md border border-gray-900 bg-gray-900 p-3">
                      <div class="mx-auto size-10 rounded-full bg-gray-600"></div>
                      <div class="mx-1.5 my-2 h-2 rounded-sx bg-gray-600"></div>
                      <div class="rounded-md border border-gray-800 bg-gray-800">
                        <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                        <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                        <div class="m-2 h-2 rounded-sx bg-gray-600"></div>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  class="flex items-center justify-center gap-1 text-s"
                  :class="appTheme == 'system' ? 'mt-3' : 'mt-1.5'">
                  {{ t('appearance.theme.system') }}
                  <CheckIcon v-if="appTheme == 'system'" class="size-4 stroke-2 text-violet-400" />
                </div>
              </div>
            </div>

            <template v-if="networkId == 'mainnet'">
              <div
                class="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 capitalize dark:text-gray-400">
                <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
                {{ t('appearance.ui') }}
                <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="cursor-pointer pt-10 hover:*:opacity-100">
                  <button
                    class="block w-full border border-slate-200 bg-sky-50 p-3 opacity-90 dark:border-gray-800 dark:bg-gray-900">
                    <div
                      class="border border-sky-100 bg-white dark:border-gray-800 dark:bg-gray-800"
                      @click="switchToClassicUI">
                      <div class="m-2 flex">
                        <div class="mr-2 size-6 bg-slate-300 dark:bg-gray-600"></div>
                        <div class="flex-1">
                          <div class="mb-2 h-2 bg-slate-300 dark:bg-gray-600"></div>
                          <div class="h-2 bg-slate-300 dark:bg-gray-600"></div>
                        </div>
                      </div>
                      <div class="m-2 h-2 bg-slate-300 dark:bg-gray-600"></div>
                    </div>
                  </button>
                  <div class="mt-1.5 flex items-center justify-center gap-1 text-s">
                    {{ t('appearance.ui.classic') }}
                  </div>
                </div>
                <div class="cursor-pointer pt-10 hover:*:opacity-100">
                  <button
                    class="block w-full rounded-md border border-sky-100 bg-sky-50 p-3 ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:border-gray-900 dark:bg-gray-900 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800">
                    <div class="rounded-md border border-sky-100 bg-white dark:border-gray-800 dark:bg-gray-800">
                      <div class="m-2 flex">
                        <div class="mr-2 size-6 rounded-md bg-slate-300 dark:bg-gray-600"></div>
                        <div class="flex-1">
                          <div class="mb-2 h-2 rounded-sx bg-slate-300 dark:bg-gray-600"></div>
                          <div class="h-2 rounded-sx bg-slate-300 dark:bg-gray-600"></div>
                        </div>
                      </div>
                      <div class="m-2 h-2 rounded-sx bg-slate-300 dark:bg-gray-600"></div>
                    </div>
                  </button>
                  <div class="mt-3 flex items-center justify-center gap-1 text-s">
                    {{ t('appearance.ui.modern') }}
                    <CheckIcon class="size-4 stroke-2 text-violet-400" />
                  </div>
                </div>
              </div>
            </template>

            <div
              class="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 capitalize dark:text-gray-400">
              <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
              {{ t('appearance.trendcolors') }}
              <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
            </div>
            <div
              class="mb-4 flex w-full cursor-pointer items-center gap-2 text-left text-s"
              :class="{
                'mt-6 md:mt-8': !i,
                'sm:hover:*:last:bg-white dark:sm:hover:*:last:bg-gray-700': trendColors != i,
              }"
              @click="trendColors = i as typeof trendColors"
              :key="i"
              v-for="(style, i) of trendColorsStyle">
              <div class="flex min-w-0 flex-1 items-center gap-1">
                <div class="truncate">{{ t('appearance.trendcolors.' + i) }}</div>
                <CheckIcon v-if="trendColors == i" class="size-4 stroke-2 text-violet-400" />
              </div>
              <button
                class="flex h-8 items-center gap-0.5 rounded-md bg-white/80 px-3 dark:bg-gray-700/50"
                :class="{
                  'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800':
                    trendColors == i,
                }">
                <ArrowIcon class="h-3 rotate-90 stroke-3" :class="style.up" />
                <ArrowIcon class="h-3 rotate-270 stroke-3" :class="style.down" />
              </button>
            </div>
          </AppSettingsAccordion>

          <AppSettingsAccordion :icon="CurrencyIcon" :title="t('currency')" :desc="t('currency.desc')">
            <div
              class="mb-4 flex w-full cursor-pointer items-center gap-2 text-s"
              :class="{
                'mt-6 md:mt-8': !i,
                'sm:hover:*:last:bg-white dark:sm:hover:*:last:bg-gray-700': code != currency,
              }"
              @click="currency = code"
              :key="code"
              v-for="(code, i) of currencyCodes">
              <div class="grid size-6 place-content-center overflow-hidden text-2xl">
                {{ flags[currencies[code].country] }}
              </div>
              <div class="flex min-w-0 flex-1 items-center gap-1">
                <div class="truncate">{{ t(`currency.list.${code}`) }} ({{ currencies[code].sign }})</div>
                <CheckIcon v-if="code == currency" class="size-4 stroke-2 text-violet-400" />
              </div>
              <button
                class="flex h-8 items-center gap-0.5 rounded-md bg-white/80 px-3 dark:bg-gray-700/50"
                :class="{
                  'ring-2 ring-violet-400 ring-offset-4 ring-offset-sky-50 sm:ring-offset-indigo-100 dark:ring-offset-gray-900 dark:sm:ring-offset-gray-800':
                    code == currency,
                }">
                {{ currencies[code].code }}
              </button>
            </div>
          </AppSettingsAccordion>

          <AppSettingsAccordion :icon="EarthIcon" :title="t('region_formats')" :desc="t('region_formats.desc')">
            <!-- <div class="mt-6 flex items-center justify-center gap-2 p-2 text-sm text-slate-500 dark:text-gray-400">
              <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
              {{ t('timezone') }}
              <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
            </div> -->
            <label class="mt-8 flex cursor-pointer items-center gap-4 text-s">
              <div class="flex-1 truncate">{{ t('use_device_settings') }}</div>
              <VSwitcher
                :model-value="!timeZone"
                @update:model-value="(v) => (timeZone = v ? undefined : localTimeZone)" />
            </label>

            <div class="transition-opacity duration-300" :class="{ 'opacity-50': !timeZone }">
              <div class="mt-6 flex items-center gap-4 text-s">
                {{ t('timezone') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="timeZone"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <optgroup :key="optgroup.label" :label="t(optgroup.label)" v-for="optgroup of timeZoneOptions">
                      <option :key="option.value" :value="option.value" v-for="option of optgroup.options">
                        {{ option.text }}
                      </option>
                    </optgroup>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ (timeZone || localTimeZone).split('/').join(' / ') }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>

              <div class="mt-4 flex items-center gap-4 text-s">
                {{ t('format.date') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="dateFormat"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <option :key="option.value" :value="option.value" v-for="option of dateFormatOptions">
                      {{ formatDate(option.text, option.value) }}
                    </option>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ formatDate(timestamp, dateFormat) }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>

              <div class="mt-4 flex items-center gap-4 text-s">
                {{ t('format.time') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="timeFormat"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <option :key="option.value" :value="option.value" v-for="option of timeFormatOptions">
                      {{ formatTime(option.text, option.value) }}
                    </option>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ formatTime(timestamp, timeFormat) }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>

              <div class="mt-4 flex items-center gap-4 text-s">
                {{ t('format.number') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="numberFormat"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <option :key="option.value" :value="option.value" v-for="option of numberFormatOptions">
                      {{ formatNumber(option.text, 2, false, option.value) }}
                    </option>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ formatNumber(1234567.89, 2, false, numberFormat) }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>

              <div class="mt-4 flex items-center gap-4 text-s">
                {{ t('format.currency') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="currencyFormat"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <option :key="option.value" :value="option.value" v-for="option of currencyFormatOptions">
                      {{ formatToken(option.text, '₳', false, option.value) }}
                    </option>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ formatToken(999, '₳', false, currencyFormat) }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>

              <div class="mt-4 flex items-center gap-4 text-s">
                {{ t('format.unit') }}
                <div
                  class="relative ml-auto flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-100 bg-white p-2 text-s outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 dark:border-gray-500 dark:bg-transparent">
                  <select
                    v-if="timeZone"
                    v-model="unitFormat"
                    class="peer absolute inset-0 z-1 w-full appearance-none bg-white px-3 opacity-0 open:min-w-max dark:bg-gray-800">
                    <option :key="option.value" :value="option.value" v-for="option of unitFormatOptions">
                      {{ formatUnit(option.text, t('abbr.data.gigabyte'), option.value) }}
                    </option>
                  </select>
                  <div class="min-w-0 flex-1 truncate">
                    {{ formatUnit(196, t('abbr.data.gigabyte'), unitFormat) }}
                  </div>
                  <ChevronIcon
                    class="size-4 scale-x-75 rotate-90 transition-transform duration-300 peer-open:rotate-270"
                    stroke-width="1.3" />
                </div>
              </div>
            </div>
          </AppSettingsAccordion>

          <!-- <AppSettingsAccordion :icon="NetworkIcon" :title="t('network')" :desc="t('network.desc')">
            <div class="mt-6 flex items-center justify-center gap-2 p-2 text-slate-500 dark:text-gray-400">
              <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
              {{ t('mainnet') }}
              <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
            </div>
            <div class="mt-6 flex items-center justify-center gap-2 p-2 text-slate-500 dark:text-gray-400">
              <div class="h-px flex-1 bg-linear-to-r to-slate-600 dark:to-gray-400"></div>
              {{ t('testnets') }}
              <div class="h-px flex-1 bg-linear-to-l to-slate-600 dark:to-gray-400"></div>
            </div>
          </AppSettingsAccordion> -->

          <div class="sticky bottom-0 mt-4 shadow-blur shadow-sky-50 dark:shadow-gray-900"></div>
        </div>
      </aside>
    </div>
  </Transition>
  <!-- <div class="sm_fixed sm_inset-0 sm_z-20 sm_bg-c3/70">
    <aside
      class="sm_bottom-0 sm_left-auto sm_right-0 sm_w-80 sm_bg-c7 bg-c3 fixed top-0 bottom-13 left-0 z-30 w-full overflow-y-auto overscroll-none px-4 py-7 text-s">
      <div class="flex items-center justify-between pb-16">
        <BackIcon class="h-4 w-4 stroke-2" @click="state.settingsVisible = false" />
      </div>
      <div class="mb-4 flex items-center justify-between rounded-md p-2.5">
        <div class="flex items-center justify-center gap-2.5 capitalize">
          <RefreshIcon class="h-5 w-5" />
          {{ t('settings.autoupdate') }}
        </div>
        <VSwitcher v-model="autoUpdate" />
      </div>
      <div class="mb-4 flex items-center justify-between rounded-md p-2.5">
        <div class="flex items-center justify-center gap-2.5 capitalize">
          <ThemeSwitcherIcon class="h-5 w-5" />
          {{ t('settings.dark_mode') }}
        </div>
        <VSwitcher v-model="darkMode" />
      </div>
      <div class="sm_bg-c3/70 bg-c7 mb-4 rounded-md p-2.5">
        <details class="group peer" ref="localeDetails">
          <summary class="flex cursor-pointer items-center justify-between">
            <div class="flex items-center justify-center gap-2.5 capitalize">
              <div class="h-5 w-5">{{ currentLocale.flag }}</div>
              {{ currentLocale.title }}
            </div>
            <div class="group-open_rotate-180 transition-transform">&rang;</div>
          </summary>
        </details>
        <div class="peer-open_grid-rows-[1fr] grid grid-rows-[0fr] transition-[grid-template-rows]">
          <div class="overflow-hidden">
            <template :key="isoCode" v-for="(localeData, isoCode) of locales">
              <div v-if="isoCode != locale" class="flex cursor-pointer items-center gap-2.5 pt-4" @click="setLocale(isoCode)">
                <div class="h-5 w-5">{{ localeData.flag }}</div>
                {{ localeData.title }}
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="sm_bg-c3/70 bg-c7 mb-4 rounded-md p-2.5">
        <details class="group peer" ref="currencyDetails">
          <summary class="flex cursor-pointer items-center justify-between">
            <div class="flex items-center justify-center gap-2.5 capitalize">
              <div class="border-cc flex h-5 w-5 items-center justify-center rounded-full border text-xs">{{ currencies[currency] }}</div>
              <div class="uppercase">{{ currency }}</div>
            </div>
            <div class="group-open_rotate-180 transition-transform">&rang;</div>
          </summary>
        </details>
        <div class="peer-open_grid-rows-[1fr] grid grid-rows-[0fr] transition-[grid-template-rows]">
          <div class="overflow-hidden">
            <template :key="val" v-for="(name, val) of currencies">
              <button v-if="val != currency" class="ml-2.5 pt-4 pl-5" @click="setCurrency(val)">{{ val + ' (' + name + ')' }}</button>
            </template>
          </div>
        </div>
      </div>
      <div class="sm_bg-c3/70 bg-c7 rounded-md p-2.5">
        <details class="group peer" ref="timezoneDetails">
          <summary class="flex cursor-pointer items-center justify-between">
            <div class="flex items-center justify-center gap-2.5 capitalize">
              <TimerIcon class="h-5 w-5" />
              {{ timeZone == '' ? t('settings.local_timezone') : 'UTC' + (timeZone < 0 ? timeZone : '+' + timeZone) }}
            </div>
            <div class="group-open_rotate-180 transition-transform">&rang;</div>
          </summary>
        </details>
        <div class="peer-open_grid-rows-[1fr] grid grid-rows-[0fr] transition-[grid-template-rows]">
          <div class="overflow-hidden">
            <template :key="tz.value" v-for="tz of timezoneList">
              <button v-if="tz.value != timeZone" class="ml-2.5 pt-4 pl-5" @click="setTimezone(tz.value)">{{ tz.name }}</button>
            </template>
          </div>
        </div>
      </div>
    </aside>
  </div> -->
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, useTemplateRef, watch } from 'vue'

import AppearanceIcon from '@/assets/icons/appearance.svg?component'
import ArrowIcon from '@/assets/icons/arrow.svg?component'
import CheckIcon from '@/assets/icons/check.svg?component'
import ChevronIcon from '@/assets/icons/chevron.svg?component'
import CloseIcon from '@/assets/icons/close.svg?component'
import CurrencyIcon from '@/assets/icons/coin.svg?component'
import EarthIcon from '@/assets/icons/earth.svg?component'
import LanguageIcon from '@/assets/icons/language.svg?component'

// import NetworkIcon from '@/assets/icons/pools.svg?component'

// import ThemeSwitcherIcon from '@/assets/icons/theme_switcher.svg?component'

import {
  currencies,
  currency,
  currencyFormat,
  currencyFormats,
  dateFormat,
  dateFormats,
  flags,
  localDateFormat,
  localNumberFormat,
  localTimeFormat,
  localTimeZone,
  locale,
  locales,
  numberFormat,
  numberFormats,
  t,
  timeFormat,
  timeFormats,
  timeZone,
  timeZones,
  unitFormat,
  unitFormats,
} from '@/i18n'
import { formatDate, formatNumber, formatTime, formatToken, formatUnit } from '@/utils/formatter'
import { keyDownSymbol } from '@/utils/injectionSymbols'
import { appTheme, trendColors } from '@/utils/settings'

import AppSettingsAccordion from '@/components/AppSettingsAccordion.vue'
import VSwitcher from '@/components/VSwitcher.vue'

const { visible = false } = defineProps<{
  visible?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const keyDown = inject(keyDownSymbol)!

const networkId = import.meta.env.VITE_NETWORK_ID

const currencyCodes = Object.keys(currencies) as (keyof typeof currencies)[]

currencyCodes.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))

const trendColorsStyle = [
  { up: 'text-green-500', down: 'text-pink-500' },
  { up: 'text-pink-500', down: 'text-green-500' },
  { up: 'text-sky-500', down: 'text-yellow-500' },
  { up: 'text-yellow-500', down: 'text-sky-500' },
] as const

const timestamp = Date.now() / 1000 // UTC Timezone

const closeButtonRef = useTemplateRef('closeButton'),
  aside = useTemplateRef('aside')

const timeZoneOptions = computed(() => {
  const value = [],
    regions: Record<string, { value: string; text: string }[]> = {
      africa: [],
      america: [],
      antarctica: [],
      arctic: [],
      asia: [],
      atlantic: [],
      australia: [],
      europe: [],
      indian: [],
      pacific: [],
      other: [],
    }

  for (const tz of timeZones) {
    const splitedTz = tz.split('/'),
      headLowerCase = splitedTz[0]!.toLowerCase(),
      region = regions[headLowerCase] && splitedTz.length > 1 ? headLowerCase : 'other'

    regions[region]!.push({
      value: tz,
      text: splitedTz.join(' / '),
    })
  }

  const otherOtions = regions['other']!

  delete regions['other']

  const sortedRegions = Object.keys(regions)

  sortedRegions.sort()

  for (const key of sortedRegions) {
    const options = regions[key]!
    if (options.length) {
      options.sort((a, b) => a.value.localeCompare(b.value))

      value.push({
        label: 'timezone.' + key,
        options: options,
      })
    }
  }

  if (otherOtions.length) {
    otherOtions.sort((a, b) => a.value.localeCompare(b.value))

    value.push({
      label: 'timezone.other',
      options: otherOtions,
    })
  }

  return value
})

const dateFormatOptions = computed(() => {
  const value = []

  let isDefaultFormatNeeded = true

  for (const format of dateFormats) {
    if (localDateFormat == format) {
      isDefaultFormatNeeded = false
    }

    value.push({
      value: localDateFormat == format ? '' : format,
      text: timestamp,
    } as const)
  }

  if (isDefaultFormatNeeded) {
    value.unshift({
      value: '',
      text: timestamp,
    } as const)
  }

  return value
})

const timeFormatOptions = computed(() => {
  const value = []

  for (const format of timeFormats) {
    value.push({
      value: localTimeFormat == format ? '' : format,
      text: timestamp,
    } as const)
  }

  return value
})

const numberFormatOptions = computed(() => {
  const value = [],
    num = 1234567.89

  let isDefaultFormatNeeded = true

  for (const format of numberFormats) {
    if (localNumberFormat == format) {
      isDefaultFormatNeeded = false
    }

    value.push({
      value: localNumberFormat == format ? '' : format,
      text: num,
    } as const)
  }

  if (isDefaultFormatNeeded) {
    value.unshift({
      value: '',
      text: num,
    } as const)
  }

  return value
})

const currencyFormatOptions = computed(() => {
  const value = []

  for (const format of currencyFormats) {
    value.push({
      value: format,
      text: 999,
    })
  }

  return value
})

const unitFormatOptions = computed(() => {
  const value = []

  for (const format of unitFormats) {
    value.push({
      value: format,
      text: 196,
    })
  }

  return value
})

const thinScrollbar = ref(false)

const setThinScrollbar = (event: MouseEvent) => {
  const asideEl = aside.value!

  thinScrollbar.value = event.clientX <= asideEl.parentElement!.offsetLeft || asideEl.clientWidth == asideEl.offsetWidth
}

const switchToClassicUI = () => {
  localStorage.setItem('ui', 'classic')

  window.location.href = '/'
}

const keyDownHandler = watch(keyDown, (val) => {
  if (val.key == 'Escape') {
    emit('close')
  }
})

watch(
  () => visible,
  (val) => {
    if (val) {
      nextTick(() => {
        requestAnimationFrame(() => {
          closeButtonRef.value?.focus()
        })
      })

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
