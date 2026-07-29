<template>
  <div class="h-12 sm:h-16 lg:h-20"></div>
  <div class="mt-auto h-px bg-linear-to-r via-slate-300 dark:via-gray-700"></div>
  <div class="z-1 mx-2 mt-4 flex flex-wrap-reverse gap-x-2 text-s sm:mt-6">
    <div class="text-slate-700 dark:text-gray-300">
      <I18nT keypath="promo.love" tag="div">
        <template #love>
          <svg viewBox="0 0 30 30" fill="none" class="mx-0.5 inline-block size-5">
            <path d="M9.5602 2.63745L2.9668 3.95613L7.91185 8.90119L9.5602 2.63745Z" fill="#FB2C36" />
            <path d="M7.2521 0.65926L2.63672 3.62629L9.5598 2.30761L11.2081 0.32959L7.2521 0.65926Z" fill="#E7000B" />
            <path
              d="M14.8357 7.91201L9.89062 2.30761L11.539 0.32959L15.1653 4.94497L20.1104 1.97794L14.8357 7.91201Z"
              fill="#C10007" />
            <path d="M24.0654 0L20.1094 1.97802L26.7028 3.95604L28.6808 2.63736L24.0654 0Z" fill="#E7000B" />
            <path d="M28.6816 2.96704L27.0332 4.28572L30.0002 11.8681L28.6816 2.96704Z" fill="#C10007" />
            <path d="M15.1641 8.24168L20.1091 2.30762L22.0871 9.23069L15.1641 8.24168Z" fill="#FB2C36" />
            <path d="M26.3735 4.28564L20.4395 2.30762L22.4175 8.90102L26.3735 4.28564Z" fill="#FFC9C9" />
            <path d="M30.0004 12.5276L22.418 9.23086L26.7037 4.61548L30.0004 12.5276Z" fill="#FFA2A2" />
            <path d="M0 12.5275L2.63736 3.95605L7.58242 9.23078L0 12.5275Z" fill="#FF6467" />
            <path d="M14.5059 8.24185L8.24219 8.90119L9.89054 2.63745L14.5059 8.24185Z" fill="#E7000B" />
            <path d="M11.8689 15.4946L0.660156 12.5276L7.58323 9.56055L11.8689 15.4946Z" fill="#FFA2A2" />
            <path d="M14.5055 8.57153L7.91211 9.23087L12.1978 15.1649L14.5055 8.57153Z" fill="#FF6467" />
            <path d="M17.4724 15.4945H12.5273L14.835 8.90112L17.4724 15.4945Z" fill="#FFC9C9" />
            <path
              d="M15.1641 8.57153C16.0981 10.8792 17.6696 14.9012 17.8014 15.1649L22.0871 9.56054L15.1641 8.57153Z"
              fill="#E7000B" />
            <path d="M18.1328 15.4946L22.4185 9.56055L29.3416 12.5276L18.1328 15.4946Z" fill="#FB2C36" />
            <path d="M8.24176 21.0989L0 12.8572L11.8681 15.8242L8.24176 21.0989Z" fill="#FB2C36" />
            <path d="M21.4295 21.0989L18.1328 15.8242L30.0009 12.8572L21.4295 21.0989Z" fill="#C10007" />
            <path d="M14.5063 27.6923L8.57227 21.4285L12.1986 16.1538L14.5063 27.6923Z" fill="#FF6467" />
            <path d="M17.8014 16.1538L15.1641 27.6923L21.0981 21.4285L17.8014 16.1538Z" fill="#FB2C36" />
            <path d="M12.5273 15.8242L14.835 27.6924L17.4724 15.8242H12.5273Z" fill="#FFA2A2" />
          </svg>
        </template>
      </I18nT>
      <I18nT keypath="promo.pool" tag="div">
        <template #pool>
          <RouterLink
            v-if="networkId === 'mainnet'"
            :to="{ name: 'pool', params: { id: poolId } }"
            class="font-medium text-blue-500 underline dark:text-sky-400">
            {{ poolTicker }}
          </RouterLink>
          <a
            v-else
            :href="`https://adastat.net/pools/${poolId}`"
            class="font-medium text-blue-500 underline dark:text-sky-400"
            target="_blank">
            {{ poolTicker }}
          </a>
        </template>
      </I18nT>
    </div>
    <div class="ml-auto flex gap-2">
      <template v-for="(link, id) of socialLinks">
        <a
          v-if="link"
          :key="id"
          :href="link"
          :title="t(`social.${id}`)"
          class="w-10 p-2 opacity-80 transition-transform hover:scale-110 hover:opacity-100"
          target="_blank">
          <component :is="socialIcons[id]" />
        </a>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import GithubIcon from '@/assets/icons/github.svg?component'
import TelegramIcon from '@/assets/icons/telegram.svg?component'
import XIcon from '@/assets/icons/x.svg?component'
import YoutubeIcon from '@/assets/icons/youtube.svg?component'

import { t } from '@/i18n'

const networkId = import.meta.env.VITE_NETWORK_ID,
  poolId = '77b0a93c26ac65be36e9a9f220f9a43cbc57d705fc5d8f1de5fdeea1',
  poolTicker = 'STAT',
  socialIcons = {
    github: GithubIcon,
    x: XIcon,
    telegram: TelegramIcon,
    youtube: YoutubeIcon,
  },
  socialLinks = {
    github: 'https://github.com/CardanoExplorer',
    x: 'https://x.com/ada_stat',
    telegram: 'https://t.me/CardanoExplorer',
    youtube: 'https://www.youtube.com/@CardanoExplorer',
  }
</script>
