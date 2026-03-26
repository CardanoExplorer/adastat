<template>
  <div v-if="isNextPage || moreHandling || !moreOnly" class="grid gap-x-5 gap-y-8 text-s sm:px-2 md:px-4">
    <div
      v-if="isNextPage || moreHandling"
      class="z-1 col-start-1 row-start-1 mx-auto w-fit rounded-md bg-linear-to-l from-cyan-400 to-blue-600 opacity-90 transition-opacity hover:opacity-100 dark:to-blue-400">
      <button
        class="group flex h-10 items-center gap-3 rounded-md border border-transparent bg-sky-50 bg-clip-padding px-3 text-blue-500 dark:bg-gray-900 dark:text-cyan-400"
        @click="showMore">
        <SpinnerIcon v-if="moreHandling" class="size-4 animate-spin stroke-2" />
        <ShowMoreIcon v-else class="size-4 group-hover:animate-pulse" />
        {{ t('show.more') }}
      </button>
    </div>

    <div v-if="!moreOnly" class="flex items-center justify-between gap-6 md:col-start-1 md:row-start-1">
      <div class="row-start-2 flex items-center sm:row-start-1">
        <div class="mr-2 leading-none font-light">{{ t('items_per_page') }}</div>
        <div class="relative">
          <select
            class="peer h-9 appearance-none rounded-md border border-sky-100 bg-white py-2 pr-6 pl-2 dark:border-gray-800 dark:bg-gray-800"
            v-model="limit"
            @change="emit('limit')"
            :disabled="limitHandling">
            <option :key="v" :value="v" v-for="v of limitList">
              {{ v }}
            </option>
          </select>
          <SpinnerIcon v-if="limitHandling" class="absolute top-3 right-2 z-1 size-3 animate-spin stroke-2" />
          <ChevronIcon
            v-else
            class="pointer-events-none absolute top-3 right-2 z-1 size-3 scale-x-75 rotate-90 stroke-2 transition-transform duration-300 peer-open:rotate-270" />
        </div>
      </div>
      <div class="flex items-center">
        <RouterLink
          v-if="page > 1"
          :to="routeTo(prevPage)"
          :title="t('page') + ' ' + prevPage"
          class="rounded-md bg-sky-100 p-2.5 text-gray-400 hover:*:animate-chevron dark:bg-gray-800">
          <ChevronIcon class="size-4 rotate-180 stroke-2" />
        </RouterLink>
        <div v-else class="rounded-md p-2.5 px-1 opacity-30">
          <ChevronIcon class="size-4 rotate-180 stroke-2" />
        </div>
        <div class="mx-2 whitespace-nowrap">
          <b class="text-base font-medium text-sky-500 dark:text-cyan-400">
            {{ formatNumber(page) + (lastShowedPage == page ? '' : ' - ' + formatNumber(lastShowedPage)) }}
          </b>
          {{ '  /  ' + formatNumber(totalPage) }}
        </div>
        <RouterLink
          v-if="isNextPage"
          :to="routeTo(nextPage)"
          :title="t('page') + ' ' + nextPage"
          class="rounded-md bg-sky-100 p-2.5 text-gray-400 hover:*:animate-chevron dark:bg-gray-800">
          <ChevronIcon class="size-4 stroke-2" />
        </RouterLink>
        <div v-else class="rounded-md p-2.5 px-1 opacity-30">
          <ChevronIcon class="size-4 stroke-2" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type RouteLocationRaw, useRoute } from 'vue-router'

import ChevronIcon from '@/assets/icons/chevron.svg?component'
import ShowMoreIcon from '@/assets/icons/show_more.svg?component'
import SpinnerIcon from '@/assets/icons/spinner.svg?component'

import { t } from '@/i18n'
import { formatNumber } from '@/utils/formatter'
import { limit, limitList } from '@/utils/settings'

// const emit = defineEmits(['showMore', 'changeLimit'])

type Props =
  | {
      page: number
      pageCount: number
      total: number
      moreHandling: boolean
      moreOnly?: false
      limitHandling: boolean
    }
  | {
      page?: number
      pageCount?: number
      total: number
      moreHandling: boolean
      moreOnly: true
      limitHandling?: never
    }

const { total, page = 1, pageCount, moreHandling } = defineProps<Props>()

const emit = defineEmits(['more', 'limit'])

const totalPage = computed(() => Math.ceil(total / limit.value))

const lastShowedPage = computed(() => page + pageCount - 1)

const prevPage = computed(() => page - 1)

const nextPage = computed(() => lastShowedPage.value + 1)

const isNextPage = computed(() => lastShowedPage.value < totalPage.value)

const showMore = () => {
  if (!moreHandling) {
    emit('more')
  }
}

const routeTo = (page: number) => {
  const route: RouteLocationRaw = {
    name: useRoute().name,
  }

  if (page > 1) {
    route.query = {
      page,
    }
  }

  return route
}
</script>
