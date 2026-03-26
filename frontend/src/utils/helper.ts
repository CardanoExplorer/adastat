import type { FunctionalComponent } from 'vue'

import WalletInIcon from '@/assets/icons/wallet_in.svg?component'
import WalletIntraIcon from '@/assets/icons/wallet_intra.svg?component'
import WalletOutIcon from '@/assets/icons/wallet_out.svg?component'
import WalletRewardIcon from '@/assets/icons/wallet_reward.svg?component'
import WalletSwapIcon from '@/assets/icons/wallet_swap.svg?component'
import BashoSrc from '@/assets/images/basho.webp'
import ByronSrc from '@/assets/images/byron.webp'
import GoguenSrc from '@/assets/images/goguen.webp'
import ShelleySrc from '@/assets/images/shelley.webp'
import VoltaireSrc from '@/assets/images/voltaire.webp'

import { darkMode, storage } from '@/utils/settings'

export type StringObject = Record<string, string>

export type BooleanObject = Record<string, boolean>

export type NumberObject = Record<string, number>

export type BigIntObject = Record<string, bigint>

export type AnyObject = Record<string, any>

export type HTMLElementObject = Record<string, HTMLElement>

const epochImages: Record<EpochName, string> = {
  byron: ByronSrc,
  shelley: ShelleySrc,
  goguen: GoguenSrc,
  basho: BashoSrc,
  voltaire: VoltaireSrc,
}

const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY

const arGateway = import.meta.env.VITE_ARWEAVE_GATEWAY

const localGateway = import.meta.env.VITE_LOCAL_GATEWAY || window.location.origin

const slotLength = import.meta.env.VITE_SLOT_LENGTH

const isUrlAbsolute = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {}
  return false
}

const getUrl = (url: string = '', nonce?: string) => {
  if (url.startsWith('ipfs://')) {
    const namespace = url.slice(7, 12)

    return ipfsGateway + (namespace == 'ipfs/' || namespace == 'ipns/' ? '' : '/ipfs') + url.slice(6)
  } else if (url.startsWith('ar://')) {
    return arGateway + url.slice(4)
  } else if (isUrlAbsolute(url)) {
    if (nonce) {
      return url + (url.indexOf('?') > -1 ? '&' : '?') + nonce
    }
  } else if (url.startsWith('/')) {
    return localGateway + url
  } else if (!url.startsWith('data:image/')) {
    // support for very old behavior when it's just an ipfs hash
    return ipfsGateway + '/ipfs/' + url
  }

  return url
}

const getEpochStartTime = (epoch: number | `${number}`): number => {
  return import.meta.env.VITE_NETWORK_START_TIME + (epoch as number) * import.meta.env.VITE_EPOCH_LENGTH * slotLength
}

const getEpochEndTime = (epoch: number | `${number}`) => {
  return getEpochStartTime(+epoch + 1) - slotLength
}

const getRatio = (val: number | `${number}`, maxVal: number | `${number}`, maxCap = 1) => {
  return Math.max(Math.min(maxCap, (val as number) / (maxVal as number)), 0) || 0
}

const getRatioColor = (ratio: number, isDark = darkMode.value) => {
  const factor = Math.round(ratio * 10),
    idx = factor < 2 ? 0 : factor < 8 ? 1 : factor < 9 ? 2 : factor < 10 ? 3 : 4

  return (
    isDark
      ? ([
          '--color-cyan-400',
          '--color-green-400',
          '--color-yellow-400',
          '--color-orange-400',
          '--color-red-400',
        ] as const)
      : ([
          '--color-sky-500',
          '--color-green-500',
          '--color-yellow-500',
          '--color-amber-500',
          '--color-red-500',
        ] as const)
  )[idx]!
}

const getTimeProgress = (startTime: number, endTime: number, currentTime: number) => {
  return getRatio(currentTime - startTime, endTime - startTime)
}

const getTimeLeft = (secDuration: number) => {
  let num: number, unit: 'day' | 'hour' | 'minute'

  const days = secDuration / 86400

  if (days < 1) {
    const hours = secDuration / 3600

    if (hours < 1) {
      num = Math.ceil(secDuration / 60)
      unit = 'minute'
    } else {
      num = Math.round(hours)
      unit = 'hour'
    }
  } else {
    num = Math.round(days)
    unit = 'day'
  }

  return { num: Math.max(num, 0), unit }
}

const getShortNumber = (num: number | `${number}` | `${bigint}`) => {
  let absNum = Math.abs(num as number),
    unit = ''

  if (absNum >= 999_995_000_000) {
    absNum = Math.round(absNum / 10_000_000_000) / 100
    unit = isFinite(num as number) ? 'trillion' : ''
  } else if (absNum >= 999_995_000) {
    absNum = Math.round(absNum / 10_000_000) / 100
    unit = 'billion'
  } else if (absNum >= 999_995) {
    absNum = Math.round(absNum / 10_000) / 100
    unit = 'million'
  } else if (absNum >= 999.995) {
    absNum = Math.round(absNum / 10) / 100
    unit = 'thousand'
  } else {
    absNum = Math.round((absNum || 0) * 100) / 100
  }

  return { num: (num as number) < 0 ? -absNum : absNum, unit }
}

export type EpochName = 'byron' | 'shelley' | 'goguen' | 'basho' | 'voltaire'

const getEpochName = (epoch_no: number): EpochName => {
  let epochName!: EpochName

  if (epoch_no >= import.meta.env.VITE_VOLTAIRE_EPOCH) {
    epochName = 'voltaire'
  } else if (epoch_no >= import.meta.env.VITE_BASHO_EPOCH) {
    epochName = 'basho'
  } else if (epoch_no >= import.meta.env.VITE_GOGUEN_EPOCH) {
    epochName = 'goguen'
  } else if (epoch_no >= import.meta.env.VITE_SHELLEY_EPOCH) {
    epochName = 'shelley'
  }

  return epochName || 'byron'
}

const getEpochImage = (epoch_no: number): string => {
  return epochImages[getEpochName(epoch_no)]
}

const getTokenName = (tokenData: any) => {
  return tokenData.ticker || tokenData.name || tokenData.asset_name || tokenData.asset_name_hex || tokenData.fingerprint
}

const getGovActionStatus = (
  type: string,
  enacted_epoch?: number,
  ratified_epoch?: number,
  dropped_epoch?: number,
  expired_epoch?: number
) => {
  if (ratified_epoch) {
    return enacted_epoch ? 'enacted' : 'ratified'
  } else if (expired_epoch) {
    return type == 'infoaction' ? (dropped_epoch ? 'completed' : 'closed') : dropped_epoch ? 'failed' : 'expired'
  } else if (dropped_epoch) {
    return 'invalidated'
  }

  return 'active'
}

export type ColList = {
  id: string
  slot?: string
}[]

export type TableCol = {
  id: string
  name: string
  slot: string
  sort: boolean
  hidden?: boolean
}

const getTableCols = (point: string, allCols: (Omit<TableCol, 'sort'> & { sort?: any })[]): TableCol[] => {
  const cols: TableCol[] = [],
    colMap: Record<string, TableCol> = {}

  for (const col of allCols) {
    if (col.name) {
      col.name += '.' + col.id
    }
    col.sort = Boolean(col.sort)
    colMap[col.id] = col as TableCol
  }

  try {
    for (const storedCol of JSON.parse(storage.getItem(point + '.cols')!)) {
      const col = colMap[storedCol.k]
      if (col) {
        col.hidden = storedCol.v == 0
        cols.push(col)
        delete colMap[storedCol.k]
      }
    }
  } catch {}

  for (const col of allCols) {
    if (colMap[col.id]) {
      cols.push(col as TableCol)
    }
  }

  return cols
}

type TabData<T> = {
  [K in keyof T]: {
    icon: T[K] extends { icon: infer I } ? I : never
    name: T[K] extends { name: infer N } ? N : undefined
    contentClass: T[K] extends { contentClass: infer C } ? C : undefined
    colList: T[K] extends { colList: infer L }
      ? L extends readonly (infer U)[]
        ? (U & NonNullable<TabConfig['colList']>[number])[]
        : L
      : undefined
    sortKeyMap: T[K] extends { sortKeyMap: infer M } ? M & StringObject : undefined
  }
}

type TabConfig = {
  icon: FunctionalComponent
  name?: string
  contentClass?: string
  colList?: {
    id: string
    slot?: string
  }[]
  sortKeyMap?: StringObject
}

const getTabData = <T extends Record<string, TabConfig>>(data: T) => {
  return data as unknown as TabData<T>
}

const txTypeData = {
  in: {
    class: 'text-up-600 dark:text-up-400',
    icon: WalletInIcon,
  },
  out: {
    class: 'text-down-600 dark:text-down-400',
    icon: WalletOutIcon,
  },
  intra: {
    class: 'text-up-600 *:last:text-down-600 dark:text-up-500 dark:*:last:text-down-500',
    icon: WalletIntraIcon,
  },
  swap: {
    class: 'text-up-600 *:last:text-down-600 dark:text-up-500 dark:*:last:text-down-500',
    icon: WalletSwapIcon,
  },
  reward: {
    class: 'text-yellow-600',
    icon: WalletRewardIcon,
  },
}

const getTxTypeDataClass = (type: keyof typeof txTypeData) => {
  return txTypeData[type].class
}

const getTxTypeDataIcon = (type: keyof typeof txTypeData) => {
  return txTypeData[type].icon
}

export {
  getUrl,
  getEpochStartTime,
  getEpochEndTime,
  getRatio,
  getRatioColor,
  getTimeProgress,
  getTimeLeft,
  getShortNumber,
  getEpochName,
  getEpochImage,
  getTokenName,
  getGovActionStatus,
  getTableCols,
  getTabData,
  getTxTypeDataClass,
  getTxTypeDataIcon,
  isUrlAbsolute,
}
