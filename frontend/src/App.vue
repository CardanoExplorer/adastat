<template>
  <div
    id="page"
    class="mx-auto flex min-h-dvh max-w-480 flex-col pb-20 lg:p-0"
    :class="[{ '**:outline-none': latestClick }, trendClass]">
    <header class="sticky top-0 z-70 mb-1 lg:m-0">
      <div
        class="absolute inset-0 flex bg-sky-50 shadow-blur shadow-sky-50 sm:bg-transparent sm:backdrop-blur-sm dark:bg-gray-900 dark:shadow-gray-900 dark:sm:bg-transparent">
        <div
          class="-ml-40 hidden aspect-4/1 bg-radial-[farthest-side_at_100%_0] from-fuchsia-100/80 to-sky-50 sm:block dark:from-sky-950/80 dark:to-gray-900"></div>
        <div class="grow bg-linear-to-b from-fuchsia-100/80 to-sky-50 dark:from-sky-950/80 dark:to-gray-900"></div>
        <div
          class="hidden aspect-4/1 bg-radial-[farthest-side_at_0_0] from-fuchsia-100/80 to-sky-50 sm:block dark:from-sky-950/80 dark:to-gray-900"></div>
      </div>

      <div class="relative flex h-11 items-center px-2 sm:h-16 sm:px-4 md:h-20 md:px-5 lg:px-10">
        <div class="flex w-50 pl-2 sm:p-0 lg:w-60">
          <RouterLink :to="{ name: 'dashboard' }" title="AdaStat Cardano Explorer" class="shrink-0 rounded">
            <img :src="darkMode ? logoDark : logoLight" alt="AdaStat Cardano Explorer" class="h-6 sm:h-8" />
            <div class="absolute ml-25 font-alt text-s font-medium text-violet-400" v-if="networkId != 'mainnet'">
              {{ t(`network.${networkId}`) }}
            </div>
          </RouterLink>
        </div>

        <div class="mx-auto flex max-w-400 grow items-center gap-2 text-xs lg:text-s xl:gap-3">
          <div class="ml-auto flex gap-2 sm:mr-auto">
            <DoneIcon class="hidden h-4 w-4 md:block" />
            <div class="mt-0.5 text-right text-2xs tabular-nums">
              {{ t('synced') + ' ' }}
              <OptionalWrapper tag="span" class="whitespace-nowrap">
                <I18nT v-if="syncTimer > 0" keypath="time.ago">
                  <template #time>
                    <b
                      class="font-medium text-up-600 hue-rotate-(--rotate) text-shadow-stroke text-shadow-white dark:text-up-500 dark:text-shadow-none"
                      :style="{
                        '--rotate': `${syncTimer < 46 ? 0 : syncTimer < 60 ? 225 - syncTimer * 5 : syncTimer < 106 ? -75 : syncTimer < 120 ? 450 - syncTimer * 5 : -150}deg`,
                      }"
                      >{{ t('n.synced', syncTimer) }}</b
                    >
                  </template>
                </I18nT>
                <b
                  v-else
                  class="font-medium text-cyan-600 text-shadow-stroke text-shadow-white dark:text-cyan-500 dark:text-shadow-none"
                  >{{ t('n.synced', 0) }}</b
                >
              </OptionalWrapper>
            </div>
          </div>

          <div class="hidden grow items-center justify-end gap-2.5 sm:flex xl:gap-4">
            <button
              class="flex h-10 w-10 items-center rounded-md border border-sky-100 bg-white md:h-9 md:max-w-72 md:grow md:rounded-lg dark:border-gray-700 dark:bg-transparent"
              @click="openModal('search')">
              <SearchIcon class="h-10 w-10 p-2.5 md:h-9" />
              <div class="hidden truncate md:block">{{ t('search') }}…</div>
              <div
                class="mr-1.5 ml-auto hidden rounded bg-sky-50 p-1 text-2xs text-slate-600 md:block dark:bg-gray-800 dark:text-gray-400">
                {{ `${modifierKeyPrefix} K` }}
              </div>
            </button>

            <div
              class="order-first hidden h-10 items-center gap-3 rounded-md border border-sky-100 bg-white px-3 sm:flex md:order-0 md:h-11 md:rounded-lg lg:h-12 dark:border-gray-800 dark:bg-gray-800">
              <button class="hidden h-6 w-6 rounded-full border lg:block">{{ currencies[currency].sign }}</button>
              <div v-if="adaPrice" class="whitespace-nowrap text-slate-600 dark:text-gray-300">
                <div class="flex justify-between gap-3">
                  {{ t('ada_price') }}
                  <b class="text-right font-medium text-slate-950 dark:text-gray-50">{{ formatCurrency(adaPrice) }}</b>
                </div>
                <div class="flex justify-between gap-3">
                  {{ t('market_cap') }}
                  <b class="text-right font-medium text-slate-950 dark:text-gray-50">{{ formatCurrency(marketCap) }}</b>
                </div>
              </div>
            </div>

            <div
              class="relative hidden h-8 items-center rounded-md border border-sky-100 bg-white px-3 outline-0 outline-offset-4 outline-sky-500 outline-dashed has-focus-visible:not-has-open:outline-2 lg:flex dark:border-gray-800 dark:bg-gray-800">
              <select
                v-model="locale"
                class="absolute inset-0 w-max cursor-pointer appearance-none bg-white px-3 opacity-0 dark:bg-gray-800">
                <option :key="lang.code" :value="lang.code" v-for="lang of locales">
                  {{ lang.title }}
                </option>
              </select>
              {{ currentLocale.title }}
            </div>

            <button
              class="mx-2 hidden h-10 w-10 rounded-md p-2 hover:*:scale-115 hover:*:-rotate-360 hover:*:opacity-100 md:rounded-lg lg:block lg:h-12 lg:w-12 lg:p-3"
              @click="appTheme = darkMode ? 'light' : 'dark'"
              :aria-label="t('appearance.theme')">
              <ThemeSwitcherIcon class="opacity-80 transition-all" />
            </button>

            <VTooltip
              :tag="RouterLink"
              :to="{ name: 'watchlist' }"
              :title="t('watchlist')"
              :aria-label="t('watchlist')"
              hideByClick>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="opacity-80 transition-opacity hover:opacity-100 hover:*:last:scale-110 sm:size-11 md:size-12"
                stroke-width="0.5"
                stroke="url(#gradient-orange)">
                <path d="M12 1C1 1 1 1 1 12S1 23 12 23s11 0 11-11S23 1 12 1" />
                <path d="M9 16.5l.6-3.2L7.2 11l3.3-.5 1.5-3 1.5 3 3.3.5-2.4 2.3.6 3.2L12 15Z" class="origin-center" />
              </svg>
            </VTooltip>

            <VTooltip
              tag="button"
              :title="t('settings')"
              :aria-label="t('settings')"
              hideByClick
              @click="(event?: PointerEvent) => openModal('settings', event)">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="size-8 opacity-80 transition-opacity hover:opacity-100 hover:*:last:scale-110 sm:size-11 md:size-12"
                stroke-width="0.5"
                stroke="url(#gradient-sky)">
                <path d="M12 1C1 1 1 1 1 12S1 23 12 23s11 0 11-11S23 1 12 1" />
                <path
                  d="M7 12.5a.5.5 90 00.5.5 2 2 90 011.39 2.4.5.5 90 00.18.69l.87.5a.5.5 90 00.68-.18 2 2 90 012.77 0 .5.5 90 00.68.18l.87-.5a.5.5 90 00.18-.69A2 2 90 0116.5 13a.5.5 90 00.5-.5v-1a.5.5 90 00-.5-.5 2 2 90 01-1.38-2.39.5.5 90 00-.18-.69l-.87-.5a.5.5 90 00-.68.18 2 2 90 01-2.77 0 .5.5 90 00-.68-.18l-.87.5a.5.5 90 00-.19.69A2 2 90 017.5 11a.5.5 90 00-.5.5Zm3.5-1.5a1.8 1.8 90 11-.005.0075"
                  class="origin-center" />
              </svg>
            </VTooltip>
          </div>

          <button
            :title="t('settings')"
            :aria-label="t('settings')"
            @click="openModal('settings')"
            class="size-11 p-3 text-slate-500 sm:hidden dark:text-gray-400">
            <SettingsIcon />
          </button>
        </div>
      </div>
    </header>

    <div
      class="flex grow flex-col justify-between gap-2 p-2 sm:gap-4 sm:p-4 md:gap-5 md:p-5 lg:gap-10 lg:p-10 lg:pl-70">
      <main class="@container">
        <RouterView />
      </main>

      <footer class="mt-20">
        <div class="flex justify-center gap-4 text-s sm:justify-end">
          <template :key="network.id" v-for="network of networks">
            <div
              v-if="network.id == networkId"
              class="rounded-lg border border-green-600 p-2 px-5 text-green-600 capitalize dark:border-green-400 dark:text-green-400">
              {{ t(`network.${network.id}`) }}
            </div>
            <a
              v-else
              :href="network.url"
              class="rounded-lg border border-gray-600 p-2 px-5 text-gray-600 capitalize dark:border-gray-400 dark:text-gray-400"
              >{{ t(`network.${network.id}`) }}</a
            >
          </template>
        </div>
      </footer>
    </div>

    <div
      class="fixed top-20 bottom-0 -ml-60 hidden w-124 bg-radial-[farthest-side_at_50%_100%] from-fuchsia-100/90 lg:block dark:from-sky-700/10"></div>

    <Transition enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300">
      <div
        v-if="searchVisible || settingsVisible"
        class="fixed inset-0 z-80 sm:backdrop-brightness-50"
        @click="closeModal(true)"></div>
    </Transition>

    <MenuNavbar :item-id="navbarItemId" :is-more="moreVisible" @close="closeModal()" />

    <AppSettings :visible="settingsVisible" @close="closeModal()" />

    <SearchForm :visible="searchVisible" @close="closeModal()" />

    <Transition
      enter-from-class="opacity-0"
      enter-active-class="transition duration-300"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-500">
      <div v-if="overlayVisible" class="fixed inset-0 z-90 grid place-items-center overflow-hidden">
        <div
          v-if="!appActive"
          class="font-emoji fixed -bottom-25 left-1/2 h-50 w-360 -translate-x-205 bg-radial-[farthest-side] from-yellow-100 from-80% text-7xl dark:from-stone-800">
          <div class="absolute top-5 left-90 rotate-300 text-4xl">🌿</div>
          <div class="absolute top-7 left-110 text-8xl italic">🌿</div>
          <div class="absolute top-0 left-160 -scale-x-100 rotate-60 text-2xl italic">🌿</div>
          <div class="absolute bottom-31 left-189 text-4xl">🐚</div>
          <div class="absolute bottom-34 left-206 animate-ship text-8xl">🐡</div>
          <div class="absolute bottom-31 left-186 text-9xl">🪸</div>
          <div class="absolute top-9 left-245">🎍</div>
          <div class="absolute top-12 left-240 -scale-x-100">🎍</div>
          <div class="absolute top-12 left-248 italic">🎍</div>
          <div class="absolute top-12 left-290 text-xl">🦪</div>
        </div>

        <div class="fixed inset-0 h-lvh w-lvw bg-sky-50/50 dark:bg-gray-900/60"></div>

        <div v-if="!appActive" class="fixed right-1/2 bottom-26 w-4">
          <div
            :key="bubble.id"
            v-for="(bubble, i) of bubbles"
            class="absolute size-8 origin-right animate-bubble rounded-full border-2 border-blue-300 opacity-0 inset-shadow-sm inset-shadow-blue-400 dark:border-cyan-700 dark:inset-shadow-cyan-800"
            :style="{
              animationDelay: bubble.delay + 'ms',
              '--translate-x': `${bubble.to}rem`,
              '--scale': bubble.scale,
            }"
            @animationend="() => !i && setBubbles()">
            <div class="m-1 size-2.5 scale-x-50 rotate-45 rounded-full bg-blue-200 dark:bg-white"></div>
          </div>
        </div>

        <div
          v-if="isRouteLoading"
          class="absolute top-0 left-0 h-0.5 w-full bg-sky-500"
          :class="
            fetchProgressVisible && fetchProgress < 1 ? 'translate-0 transition-transform' : 'animate-loadbar-indicator'
          "
          :style="{ '--tw-translate-x': -(1 - fetchProgress) * 100 + '%' }"></div>

        <div
          v-if="fetchProgressVisible"
          class="h-24 w-24 animate-fade-in overflow-hidden rounded-full border-4 border-sky-500/60 text-white">
          <div
            class="-mt-2 h-24 w-2/1 translate-0 animate-ocean bg-sky-500/80 mask-ocean transition-transform duration-500 dark:bg-sky-500/80"
            :style="{ animationDuration: '1s', '--tw-translate-y': (1 - fetchProgress) * 100 + '%' }"></div>
          <CountUp
            :value="fetchProgress"
            :formatter="(v) => formatPercent(v)"
            :duration="0.5"
            :decimalPlaces="4"
            appear
            class="absolute inset-0 grid place-items-center text-xl" />
        </div>
      </div>
    </Transition>

    <svg class="pointer-events-none invisible fixed top-0 left-0 size-0">
      <defs>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves="2"
            seed="92"
            result="noise"></feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred"></feGaussianBlur>
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurred"
            scale="77"
            xChannelSelector="R"
            yChannelSelector="G"></feDisplacementMap>
        </filter>
        <filter
          id="gaussian-blur"
          color-interpolation-filters="linearRGB"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse">
          <feDisplacementMap
            in="SourceGraphic"
            in2="SourceGraphic"
            scale="20"
            xChannelSelector="R"
            yChannelSelector="B"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="displacementMap" />
          <feGaussianBlur
            stdDeviation="3 3"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="displacementMap"
            edgeMode="none"
            result="blur" />
        </filter>
        <linearGradient id="gradient-orange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="currentColor" class="text-yellow-400"></stop>
          <stop offset="1" stop-color="currentColor" class="text-orange-600 dark:text-orange-400"></stop>
        </linearGradient>
        <linearGradient id="gradient-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="currentColor" class="text-violet-400"></stop>
          <stop offset="1" stop-color="currentColor" class="text-sky-400 dark:text-sky-500"></stop>
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, reactive, readonly, ref, shallowRef, watch, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import DoneIcon from '@/assets/icons/done.svg?component'
// import LanguageIcon from '@/assets/icons/language.svg?component'
import SearchIcon from '@/assets/icons/search.svg?component'
import SettingsIcon from '@/assets/icons/settings.svg?component'
import ThemeSwitcherIcon from '@/assets/icons/theme_switcher.svg?component'
import logoDark from '@/assets/images/adastat.dark.svg?url'
import logoLight from '@/assets/images/adastat.light.svg?url'

import { currencies, currency, locale, locales, t } from '@/i18n'
import { isRouteLoading } from '@/router'
// import state from '@/state'
import { fetchProgress, lastSyncTime } from '@/utils/api'
import { apiLag, apiTip } from '@/utils/api'
import { formatCurrency, formatNumber, formatPercent, formatPrice } from '@/utils/formatter'
import {
  type KeyDown,
  type Pointer,
  appActiveSymbol,
  appVisibleSymbol,
  keyDownSymbol,
  pointerSymbol,
} from '@/utils/injectionSymbols'
import { trendColors } from '@/utils/settings'
import { appTheme, autoUpdate, darkMode } from '@/utils/settings'
import { socketClose, socketData, socketInit } from '@/utils/socket'

import AppSettings from '@/components/AppSettings.vue'
// import SearchPage from '@/views/SearchPage.vue'
import CountUp from '@/components/CountUp.vue'
// import FooterNavbar from '@/components/FooterNavbar.vue'
import MenuNavbar from '@/components/MenuNavbar.vue'
import OptionalWrapper from '@/components/OptionalWrapper.vue'
import SearchForm from '@/components/SearchForm.vue'
import VTooltip from '@/components/VTooltip.vue'

let idleTimer: number,
  idleTimerId: number,
  syncTimerId: number,
  routeTimestamp: number,
  fetchTimestamp: number,
  bodyOverflow = false,
  settingsButtonWithVisibleFocus: HTMLElement | undefined

const navigator = window.navigator as any,
  platform: string = (navigator?.userAgentData?.platform || navigator?.platform || '').toLowerCase(),
  modifierKeyPrefix = platform.startsWith('mac') || platform === 'iphone' || platform === 'ipad' ? '⌘' : 'Ctrl',
  networkId = import.meta.env.VITE_NETWORK_ID,
  networks = import.meta.env.VITE_NETWORKS

const router = useRouter(),
  route = useRoute(),
  latestClick = ref<null | boolean>(true),
  appVisible = ref(!document.hidden),
  appActive = ref<boolean>(false),
  overlayVisible = ref<boolean>(),
  fetchProgressVisible = ref<boolean>(),
  settingsVisible = ref<boolean>(),
  searchVisible = ref<boolean>(),
  moreVisible = ref<boolean>(),
  navbarItemId = ref<string>(),
  adaPrice = ref(''),
  marketCap = ref(''),
  syncTimer = ref(0),
  keyDown = shallowRef<KeyDown>({}),
  bubbles = ref<
    {
      id: number
      scale: number
      to: number
      delay: number
    }[]
  >()

const pointer = reactive<Pointer>({
  x: 0,
  y: 0,
})

const currentLocale = computed(() => locales[locale.value])

const trendClass = computed(() => {
  const classes = ['green-red', 'red-green', 'blue-yellow', 'yellow-blue']

  return 'trend-' + (classes[trendColors.value] || classes[0])
})

const setBubbles = () => {
  const now = Date.now()

  bubbles.value = []

  for (let delay = 0; delay < 4000; ) {
    const rand = Math.floor(Math.random() * 5) + 1

    bubbles.value.push({
      id: now + delay,
      scale: 1 - Math.floor(Math.random() * 5) * 0.1,
      to: rand < 4 ? rand : 2 - rand,
      delay,
    })

    delay += 100 * rand
  }
}

const setBodyOverflow = (isHidden: boolean) => {
  if (bodyOverflow != isHidden) {
    bodyOverflow = isHidden

    const { style } = document.body

    if (isHidden) {
      style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`
      style.overflow = 'hidden'
    } else {
      style.paddingRight = ''
      style.overflow = ''
    }
  }
}

const setOverlayVisible = (isVisible: boolean) => {
  if (!searchVisible.value && !settingsVisible.value) {
    setBodyOverflow(isVisible)
  }

  overlayVisible.value = isVisible
}

const checkActivity = () => {
  idleTimerId = setInterval(() => {
    idleTimer++

    if (idleTimer > (appVisible.value ? 4 : 1) && appActive.value) {
      appActive.value = false
      socketClose()
      clearInterval(idleTimerId)
      setOverlayVisible(true)
    }
  }, 60_000)
}

const startActivity = () => {
  idleTimer = 0
  if (!appActive.value) {
    appActive.value = true
    if (autoUpdate.value || !socketData.value) {
      socketInit()
      setOverlayVisible(false)
    }
    checkActivity()
  }
}

let focusTime = 0

const onWindowFocus = () => {
  focusTime = Date.now()
}

const openModal = (modal: 'search' | 'settings', event?: PointerEvent) => {
  if ((event?.target as HTMLElement)?.matches?.(':focus-visible')) {
    settingsButtonWithVisibleFocus = event!.target as HTMLElement
  }

  const { name, params, query, hash } = route

  router.push({
    name,
    params,
    query,
    hash,
    state: {
      modal,
      scroll: { left: window.scrollX, top: window.scrollY },
    },
    force: true,
  })
}

const closeModal = (checkFocus?: boolean) => {
  if (!checkFocus || Date.now() - focusTime > 300) {
    if (settingsButtonWithVisibleFocus) {
      settingsButtonWithVisibleFocus.focus()
      settingsButtonWithVisibleFocus = undefined
    }

    if (window.history.state.back) {
      router.go(-1)
    } else {
      router.replace({ name: 'dashboard', force: true })
    }
  }
}

const updateSyncData = (t: number) => {
  syncTimer.value = Math.trunc(Date.now() / 1000 - t)

  syncTimerId = setTimeout(() => updateSyncData(t), 1000)
}

const fetchProgressHandler = watch(fetchProgress, () => {
  const now = Date.now()

  if (now - fetchTimestamp > 500 || now - routeTimestamp > 3000) {
    fetchProgressVisible.value = true
  }

  fetchTimestamp = now
})

provide(pointerSymbol, readonly(pointer))

provide(appVisibleSymbol, readonly(appVisible))

provide(appActiveSymbol, readonly(appActive))

provide(keyDownSymbol, readonly(keyDown))

startActivity()

setBubbles()

watchEffect(() => {
  const { exchange_rate, circulating_supply } = apiTip.value

  adaPrice.value = formatPrice(exchange_rate)
  marketCap.value = formatNumber(((circulating_supply as any) / 1_000_000) * exchange_rate, 2, true)
})

watchEffect(() => {
  clearTimeout(syncTimerId)

  updateSyncData(lastSyncTime.value)
})

watch(
  isRouteLoading,
  (val) => {
    if (val) {
      routeTimestamp = Date.now()

      fetchTimestamp = routeTimestamp

      fetchProgressHandler.resume()
    } else {
      fetchProgressHandler.pause()

      fetchProgressVisible.value = false
    }

    setOverlayVisible(val)
  },
  {
    immediate: true,
  }
)

watch(
  [() => route.name as string, (): string | undefined => window.history.state.modal],
  ([name, modal]) => {
    if (name) {
      navbarItemId.value = window.history.state.modal || name
    }

    settingsVisible.value = modal == 'settings'
    searchVisible.value = modal == 'search'
    moreVisible.value = modal == 'more'

    setBodyOverflow(searchVisible.value || settingsVisible.value)

    if (moreVisible.value || searchVisible.value || settingsVisible.value) {
      window.addEventListener('focus', onWindowFocus)
    } else {
      window.removeEventListener('focus', onWindowFocus)
    }
  },
  {
    immediate: true,
  }
)

watch(
  darkMode,
  (isDark) => {
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
  },
  {
    immediate: true,
  }
)

document.addEventListener('visibilitychange', () => {
  appVisible.value = !document.hidden

  if (appVisible.value) {
    startActivity()
  }
})

document.addEventListener('pointermove', (event) => {
  pointer.x = event.clientX
  pointer.y = event.clientY

  startActivity()
})

document.addEventListener('keydown', (event) => {
  keyDown.value = {
    key: event.key,
    code: event.code,
    ctrl: event.ctrlKey || event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  }

  latestClick.value = false

  startActivity()
})

document.addEventListener('click', () => {
  if (keyDown.value.key) {
    keyDown.value = {}
  } else {
    latestClick.value = true

    startActivity()
  }
})

document.addEventListener('keyup', () => {
  const { code, ctrl, alt, shift } = keyDown.value
  if (ctrl && code == 'KeyK' && !searchVisible.value) {
    openModal('search')
  } else if (alt && shift && code == 'KeyS' && !settingsVisible.value) {
    openModal('settings')
  }

  keyDown.value = {}
})
</script>
