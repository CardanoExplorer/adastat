<template>
  <div>
    <component
      v-if="activeIcon"
      :is="activeIcon"
      class="pointer-events-none fixed top-1/4 right-4 z-10 h-1/2 text-slate-700 opacity-1 sm:right-8 md:right-10 lg:right-[max(5rem,50%-55rem)] dark:text-gray-400"
      :style="{ fontSize: '50vh', fontWeight: 500, lineHeight: '50vh', strokeWidth: 1.4 }" />
    <nav ref="tRef" class="-mx-2 -mt-2 mb-4 overflow-x-auto scroll-mask-x px-2 sm:mb-5 md:mb-6">
      <TransitionGroup
        enter-from-class=""
        enter-active-class=""
        enter-to-class=""
        move-class="duration-500"
        leave-from-class=""
        leave-active-class=""
        leave-to-class=""
        tag="ul"
        class="flex min-w-max border-b border-sky-200 pt-2 select-none dark:border-gray-800">
        <li
          :key="tab.id"
          v-for="(tab, i) of tabs"
          class="relative rounded-t-md hover:bg-sky-300/10 dark:hover:bg-gray-800/50 [&:hover]:*:last:block"
          :class="[
            { 'text-slate-600 dark:text-gray-400': tab.id != tabId && tab.id != tabHandling },
            tabDnd.getDropZoneClass(i),
          ]">
          <a
            :ref="(el) => tabDnd.registerDropZone(i, el as HTMLElement)"
            :href="'#' + tab.id"
            @click.prevent="selectTab(tab)"
            class="peer flex flex-col items-center gap-0.5 rounded-t-md p-2 text-s -outline-offset-2 sm:flex-row sm:gap-2 sm:p-3 md:p-4">
            <div class="size-5">
              <component
                v-show="tab.id != tabHandling"
                :is="tab.icon"
                :class="{ 'text-blue-500 dark:text-gray-100': tab.id == tabId }" />
              <SpinnerIcon
                v-if="tab.id == tabHandling"
                class="animate-spin stroke-2 p-0.5 text-blue-500 dark:text-gray-100" />
            </div>
            {{ t(tab.name || tab.id) }}
          </a>
          <div
            class="pointer-events-none h-0.5 rounded-full bg-blue-400 transition-transform dark:bg-sky-600"
            :class="{ 'scale-x-0 peer-hover:scale-x-60': tab.id != tabId }"></div>
          <DragButton v-bind="tabDnd.getDragHandleProps(i)" />
        </li>
      </TransitionGroup>
    </nav>
    <Transition
      :duration="{ enter: 500, leave: 0 }"
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
import { type FunctionalComponent, ref, useTemplateRef, watch } from 'vue'

// import { useRoute, useRouter } from 'vue-router'

import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import { useDragAndDrop } from '@/utils/dnd'

import DragButton from '@/components/DragButton.vue'

export interface Tab {
  id: string
  icon: FunctionalComponent
  name?: string
  contentClass?: string
  // resolved?: boolean
}

const {
  tabs: unsortedTabs,
  tab: tabId,
  view,
} = defineProps<{
  tabs: Tab[]
  tab: string | undefined
  view: string
}>()

const emit = defineEmits(['resolve', 'change'])

const // router = useRouter(),
  // route = useRoute(),
  activeSlotName = ref<Tab['id']>(),
  tabHandling = ref<string>(),
  activeIcon = ref(),
  activeClass = ref(),
  tabs = ref<Tab[]>([]),
  tRef = useTemplateRef('tRef')

// let oldTabId: typeof activeTabId.value

const tabDnd = useDragAndDrop({
  scrollContainer: tRef,
  onReorder: (from: number, to: number) => {
    tabDnd.reorder(tabs.value, from, to)

    localStorage.setItem(`${view}.tabs`, JSON.stringify(tabs.value.map(({ id }) => id)))
  },
})

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
    for (const tab of tabs.value) {
      if (tab.id == tabId) {
        activeIcon.value = tab.icon
        activeClass.value = tab.contentClass
        break
      }
    }
  }
}

watch(
  () => unsortedTabs,
  () => {
    tabs.value = unsortedTabs

    try {
      const tabsOrder: string[] = JSON.parse(localStorage.getItem(`${view}.tabs`)!)

      if (Array.isArray(tabsOrder)) {
        const orderMap = new Map(tabsOrder.map((id, idx) => [id, idx]))

        tabs.value.sort((a, b) => (orderMap.get(a.id) ?? -1) - (orderMap.get(b.id) ?? -1))
      }
    } catch {}

    if (tabId) {
      activeSlotName.value = tabId
    } else if (tabs.value[0]) {
      const hash = window.location.hash.slice(1)

      if (hash) {
        for (const tab of tabs.value) {
          if (hash == tab.id) {
            selectTab(tab)

            return
          }
        }
      }

      selectTab(tabs.value[0]!)
    }
  },
  {
    immediate: true,
  }
)
</script>
