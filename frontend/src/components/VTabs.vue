<template>
  <div>
    <component
      v-if="activeIcon"
      :is="activeIcon"
      class="pointer-events-none fixed top-1/4 right-4 z-10 h-1/2 text-slate-700 opacity-1 sm:right-8 md:right-10 lg:right-[max(5rem,50%-55rem)] dark:text-gray-400"
      :style="{ fontSize: '50vh', fontWeight: 500, lineHeight: '50vh', strokeWidth: 1.4 }" />
    <nav class="-mx-2 mb-4 overflow-x-auto scroll-mask-x px-2 sm:mb-5 md:mb-6">
      <ul class="flex min-w-max select-none">
        <li :key="tab.id" v-for="tab of tabs" class="rounded-t-md border-b border-blue-300 hover:bg-sky-300/10 dark:border-gray-700 dark:hover:bg-gray-800/50">
          <a
            :href="'#' + tab.id"
            @click.prevent="selectTab(tab)"
            class="peer flex flex-col items-center gap-0.5 rounded-t-md p-2 text-s -outline-offset-2 sm:flex-row sm:gap-2 sm:p-3 md:p-4"
            :class="{ 'text-slate-600 dark:text-gray-400': tab.id != tabId && tab.id != tabHandling }">
            <component v-show="tab.id != tabHandling" :is="tab.icon" class="size-5" :class="{ 'text-blue-500 dark:text-gray-100': tab.id == tabId }" />
            <SpinnerIcon v-if="tab.id == tabHandling" class="size-5 animate-spin stroke-2 p-0.5 text-blue-500 dark:text-gray-100" />
            {{ t(tab.name || tab.id) }}
          </a>
          <div
            class="pointer-events-none h-0.5 rounded-full bg-blue-400 transition-transform dark:bg-sky-600"
            :class="{ 'scale-x-0 peer-hover:scale-x-60': tab.id != tabId }"></div>
        </li>
        <li
          class="flex-1 border-b [border-image:linear-gradient(to_right,var(--color-blue-300),var(--color-fuchsia-200))_5] dark:[border-image:linear-gradient(to_right,var(--color-gray-700),var(--color-gray-800))_5]"></li>
      </ul>
    </nav>
    <Transition
      :duration="{ enter: 500, leave: 0 }"
      mode="out-in"
      leave-from-class=""
      leave-active-class=""
      leave-to-class=""
      enter-from-class="opacity-0"
      enter-active-class="transition-opacity duration-500"
      enter-to-class=""
      @after-leave="onAfterLeave"
      @before-enter="tabHandling = ''">
      <div :key="tabId" :class="activeClass">
        <slot v-if="tabId == activeSlotName" :name="activeSlotName" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { type FunctionalComponent, ref, watch } from 'vue'

// import { useRoute, useRouter } from 'vue-router'

import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'

export interface Tab {
  id: string
  icon: FunctionalComponent
  name?: string
  contentClass?: string
  // resolved?: boolean
}

const { tabs, tab: tabId } = defineProps<{
  tabs: Tab[]
  tab: string | undefined
}>()

const emit = defineEmits(['resolve', 'change'])

const // router = useRouter(),
  // route = useRoute(),
  activeSlotName = ref<Tab['id']>(),
  tabHandling = ref<string>(),
  activeIcon = ref(),
  activeClass = ref()

// let oldTabId: typeof activeTabId.value

const selectTab = (tab: Tab) => {
  if (tab.id != tabId) {
    tabHandling.value = tab.id

    emit('resolve', tab.id)
  }
}

const onAfterLeave = () => {
  if (tabId) {
    emit('change')

    // if (activeSlotName.value) {
    //   const uri = router.resolve(route.fullPath)

    //   uri.hash = '#' + tabId

    //   router.replace(uri)
    // }

    activeSlotName.value = tabId

    // activeIcon.value = ''
    for (const tab of tabs) {
      if (tab.id == tabId) {
        activeIcon.value = tab.icon
        activeClass.value = tab.contentClass
        break
      }
    }
  }
}

watch(
  () => tabs,
  () => {
    if (tabId) {
      activeSlotName.value = tabId
    } else if (tabs[0]) {
      const hash = window.location.hash.slice(1)

      if (hash) {
        for (const tab of tabs) {
          if (hash == tab.id) {
            selectTab(tab)

            return
          }
        }
      }

      selectTab(tabs[0])
    }
  },
  {
    immediate: true,
  }
)
</script>
