<template>
  <aside
    class="top-18 bottom-0 overscroll-none lg:fixed lg:scrollbar lg:mask-[linear-gradient(to_bottom,black,black_calc(100%-1.5rem),transparent_calc(100%-0.5rem))]"
    @mousemove="setThinScrollbar"
    @mouseleave="thinScrollbar = false"
    ref="aside"
    :class="{ 'lg:scrollbar-thin': thinScrollbar }">
    <nav
      class="fixed right-2 bottom-0 left-2 z-70 h-17 rounded-t-4xl bg-fuchsia-100/50 p-1 text-2xs sm:hidden dark:bg-slate-900/70">
      <div
        class="grid grid-cols-4 overflow-hidden rounded-4xl p-1 shadow-glass inset-shadow-glass shadow-sky-50 inset-shadow-white backdrop-filter-[url(#gaussian-blur)_saturate(1.2)] dark:shadow-gray-900 dark:inset-shadow-gray-800">
        <RouterLink
          :to="
            navbarItem.link
              ? { name: navbarItem.id }
              : { name: route.name, force: true, state: { modal: navbarItem.id } }
          "
          :key="navbarItem.id"
          v-for="navbarItem of navbarItems"
          v-slot="{ href, navigate }"
          custom>
          <component
            :is="navbarItem.link ? 'a' : 'button'"
            :href="navbarItem.link ? href : null"
            class="relative z-1 flex flex-col items-center pt-1 text-center leading-5"
            @click="
              (e: MouseEvent) => {
                setNavbarItem(navbarItem.id)
                navigate(e)
              }
            "
            :ref="
              (item: HTMLElement) => {
                navbarItemRefs[navbarItem.id] = item
              }
            ">
            <div
              v-if="navbarItemId == navbarItem.id"
              class="absolute top-0 h-11 animate-navbar-indicator rounded-[1.25rem] bg-white/70 dark:bg-gray-800/70"
              :style="navbarIndicatorStyle"
              @animationend="navbarIndicatorStyle = null"></div>

            <component :is="navbarItem.id + '-icon'" class="z-1 size-5 text-sky-500 dark:text-cyan-400" />
            <div
              class="z-1 max-w-full truncate px-2"
              :class="{ 'text-sky-500 dark:text-cyan-400': navbarItemId == navbarItem.id }">
              {{ t(navbarItem.name || navbarItem.id) }}
            </div>
          </component>
        </RouterLink>
      </div>
    </nav>

    <nav
      class="fixed top-0 bottom-0 left-0 z-70 grid w-full animate-fade-in-scale-down auto-rows-max grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] justify-evenly gap-2 overflow-auto overscroll-none bg-sky-50/90 px-2 pb-6 text-xs shadow-sky-50 backdrop-blur-xs sm:top-auto sm:flex sm:h-14 sm:animate-none sm:overflow-visible sm:bg-transparent sm:bg-linear-to-b sm:from-sky-50/90 sm:to-fuchsia-50/90 sm:p-0 sm:text-2xs sm:shadow-blur sm:backdrop-filter-[url(#gaussian-blur)_saturate(1.2)] lg:relative lg:h-auto lg:min-h-full lg:w-64 lg:flex-col lg:justify-start lg:bg-none lg:py-8 lg:text-s lg:shadow-none lg:backdrop-blur-none dark:bg-gray-900/90 dark:shadow-gray-900 dark:sm:bg-transparent dark:sm:from-gray-900/90 dark:sm:to-gray-800/90"
      :class="{ hidden: !isMore }">
      <div
        v-if="isMore"
        class="sticky top-0 z-1 col-span-full -mx-2 mb-4 bg-sky-50 pt-6 shadow-blur shadow-sky-50 sm:hidden dark:bg-gray-900 dark:shadow-gray-900">
        <div
          class="absolute top-0 left-0 h-11 w-full bg-linear-to-b from-fuchsia-100/80 to-sky-50 dark:from-sky-950/80 dark:to-gray-900"></div>
        <div class="relative mx-6 flex items-center">
          <button
            class="size-10 rotate-180 rounded-md bg-sky-100 p-3 text-slate-700 dark:bg-gray-800/50 dark:text-gray-300"
            @click="emit('close')">
            <ChevronIcon />
          </button>
          <div class="ml-auto flex items-center gap-2 text-slate-600 dark:text-gray-400">
            <InfoIcon class="size-4" stroke-width="1.5" />
            <RouterLink :to="{ name: 'about' }" class="underline">{{ t('about.adastat') }}</RouterLink>
          </div>
        </div>
      </div>

      <RouterLink
        :key="menuItem.id + isMore"
        :to="{ name: menuItem.id }"
        v-for="menuItem of menuItems"
        v-slot="{ href, navigate, isExactActive }"
        custom>
        <a
          :href="href"
          @click="navigate"
          class="items-center gap-3 overflow-hidden rounded-xl border border-sky-100 bg-white py-5 text-center whitespace-nowrap sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 lg:m-2 lg:mx-6 lg:flex lg:rounded-xl lg:p-2 lg:text-left lg:whitespace-normal dark:border-gray-800 dark:bg-gray-800 dark:sm:bg-transparent"
          :class="[
            { 'hidden sm:block': menuItem.id == 'dashboard' },
            isExactActive || menuItem.isActive
              ? 'sm:text-sky-600 lg:bg-sky-500 lg:text-white dark:sm:text-cyan-400 dark:lg:bg-sky-500 dark:lg:text-white'
              : 'lg:hover:bg-sky-300/10 dark:lg:hover:bg-gray-800/50',
          ]"
          :ariaCurrent="isExactActive ? 'page' : null">
          <component
            :is="'menu-' + menuItem.id + '-icon'"
            class="mx-auto mb-1 size-8 text-blue-500 sm:my-0.5 lg:m-0 lg:ml-4 lg:size-8 dark:text-sky-500"
            :class="
              isExactActive || menuItem.isActive
                ? 'sm:size-8 sm:text-sky-500 lg:text-white dark:sm:text-cyan-400 dark:lg:text-white'
                : 'sm:mt-1.5 sm:size-7 lg:p-px'
            " />
          {{ $t(menuItem.name) }}
          <Transition enter-from-class="scale-0" enter-active-class="transition duration-300">
            <div
              v-if="isExactActive || menuItem.isActive"
              class="mt-0.5 hidden h-1 bg-sky-500 sm:block lg:hidden dark:bg-cyan-400"></div>
          </Transition>
        </a>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import ChevronIcon from '@/assets/icons/chevron.svg?component'
import DashboardIcon from '@/assets/icons/home.svg?component'
import InfoIcon from '@/assets/icons/info.svg?component'
import MenuGov_actionsIcon from '@/assets/icons/menu_actions.svg?component'
import MenuBlocksIcon from '@/assets/icons/menu_blocks.svg?component'
import MenuDashboardIcon from '@/assets/icons/menu_dashboard.svg?component'
import MenuDrepsIcon from '@/assets/icons/menu_dreps.svg?component'
import MenuEpochsIcon from '@/assets/icons/menu_epochs.svg?component'
import MenuAccountsIcon from '@/assets/icons/menu_holders.svg?component'
import MenuPoolsIcon from '@/assets/icons/menu_pools.svg?component'
import MenuTokensIcon from '@/assets/icons/menu_tokens.svg?component'
import MenuTransactionsIcon from '@/assets/icons/menu_transactions.svg?component'
import MoreIcon from '@/assets/icons/more.svg?component'
import SearchIcon from '@/assets/icons/search.svg?component'
import SettingsIcon from '@/assets/icons/settings.svg?component'
import WatchlistIcon from '@/assets/icons/watchlist.svg?component'

import { t } from '@/i18n'
import type { HTMLElementObject } from '@/utils/helper'

defineOptions({
  components: {
    DashboardIcon,
    WatchlistIcon,
    MoreIcon,
    SearchIcon,
    SettingsIcon,
    MenuAccountsIcon,
    MenuGov_actionsIcon,
    MenuBlocksIcon,
    MenuDashboardIcon,
    MenuDrepsIcon,
    MenuEpochsIcon,
    MenuPoolsIcon,
    MenuTokensIcon,
    MenuTransactionsIcon,
  },
})

const { itemId } = defineProps<{
  itemId?: string
  isMore?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

const navbarItems = [
  { id: 'dashboard', name: 'home', link: true },
  { id: 'watchlist', link: true },
  { id: 'search' },
  { id: 'more' },
]

const menuItems = ref<
    {
      id: string
      name: string
      isActive?: boolean
    }[]
  >([]),
  navbarItemId = ref<string>(),
  navbarItemRefs: HTMLElementObject = {},
  navbarIndicatorStyle = ref<{
    '--from-left'?: string
    '--from-right'?: string
    '--via-left'?: string
    '--via-right'?: string
  } | null>()

const setNavbarItem = (id: string): void => {
  if (id != navbarItemId.value) {
    const newNavbarItem = navbarItemRefs[id],
      navbarItem = navbarItemRefs[navbarItemId.value!]

    if (newNavbarItem && navbarItem) {
      const { left: newLeft, right: newRight } = newNavbarItem.getBoundingClientRect(),
        { left, right } = navbarItem.getBoundingClientRect(),
        leftOffset = left - newLeft + 'px',
        rightOffset = newRight - right + 'px'

      navbarIndicatorStyle.value =
        left < newLeft
          ? {
              '--from-left': leftOffset,
              '--from-right': rightOffset,
              '--via-left': leftOffset,
            }
          : {
              '--from-left': leftOffset,
              '--from-right': rightOffset,
              '--via-right': rightOffset,
            }
    } else {
      navbarIndicatorStyle.value = null
    }

    navbarItemId.value = id
  }
}

const aside = useTemplateRef('aside')

const thinScrollbar = ref(false)

const setThinScrollbar = (event: MouseEvent) => {
  const asideEl = aside.value!
  thinScrollbar.value =
    event.clientX - asideEl.offsetLeft >= asideEl.clientWidth || asideEl.clientWidth == asideEl.offsetWidth
}

watch(
  () => itemId,
  () => {
    const name = route.name as string

    if (name) {
      menuItems.value = [
        { id: 'dashboard', name: 'dashboard' },
        { id: 'pools', name: 'pools.stake', isActive: name == 'pool' },
        { id: 'accounts', name: 'holders', isActive: ['account', 'addresses', 'address'].includes(name) },
        { id: 'tokens', name: 'tokens', isActive: ['token', 'policies', 'policy'].includes(name) },
        { id: 'epochs', name: 'epochs', isActive: name == 'epoch' },
        { id: 'blocks', name: 'blocks', isActive: name == 'block' },
        { id: 'transactions', name: 'transactions', isActive: name == 'transaction' },
        { id: 'gov_actions', name: 'gov_actions', isActive: name == 'gov_action' },
        { id: 'dreps', name: 'dreps', isActive: name == 'drep' },
      ]

      const id = itemId || name

      setNavbarItem(navbarItemRefs[id] ? id : '')
    }
  },
  {
    immediate: true,
  }
)

// watch(
//   () => hideNavbar,
//   (_hideNavbar) => {
//     const _id = (_hideNavbar ? window.history.state.modal : route.name) as string,
//       id = navbarItemRefs[_id] ? _id : ''

//     setNavbarItem(id)
//   }
// )
</script>
