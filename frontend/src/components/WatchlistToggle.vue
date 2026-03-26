<template>
  <button
    class="shrink-0 transition-transform hover:scale-115 hover:text-amber-500 dark:hover:text-yellow-400"
    :title="t(`watchlist.${watchlist[type][data] ? 'remove' : 'add'}`)"
    @click.stop.prevent="toggle(type, data)">
    <WatchlistIcon
      class="h-full w-full"
      :class="{
        'fill-current text-yellow-500 dark:text-amber-400': watchlist[type][data],
      }" />
  </button>
</template>

<script setup lang="ts">
import WatchlistIcon from '@/assets/icons/watchlist.svg?component'

import { t } from '@/i18n'
import { type WatchlistType, checkLegacy, get, toggle } from '@/utils/watchlist'

const { type, data, legacyData } = defineProps<{
  type: WatchlistType
  data: string
  legacyData?: string
}>()

checkLegacy(type, data, legacyData)

const watchlist = get()
</script>
