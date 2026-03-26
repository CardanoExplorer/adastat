import { readonly, ref } from 'vue'

const base62Charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const base62Decode = (base62: string) => {
  let hash = ''
  for (let i = 0; i < base62.length; i += 5) {
    const s = base62.slice(i, i + 5)

    let n = 0

    for (let j = 0; j < s.length; j++) {
      n += base62Charset.indexOf(s[j]!) * 62 ** j
    }

    hash += n.toString(16).padStart(7, '0')
  }
  return hash
}

export type WatchlistType = 'account' | 'address' | 'token' | 'pool' | 'drep'

const watchlist = ref<Record<WatchlistType, Record<string, 1>>>({
  account: {},
  pool: {},
  token: {},
  address: {},
  drep: {},
})

const get = (): Readonly<typeof watchlist> => {
  return readonly(watchlist)
}

const getNormalized = () => {
  const _watchlist = {} as Record<WatchlistType, string[]>

  for (const type of Object.keys(watchlist.value) as WatchlistType[]) {
    _watchlist[type] = Object.keys(watchlist.value[type])
  }

  return _watchlist
}

const store = () => {
  localStorage.setItem('watchlist', JSON.stringify(getNormalized()))
}

const toggle = (type: WatchlistType, data: string) => {
  if (watchlist.value[type][data]) {
    delete watchlist.value[type][data]
  } else {
    watchlist.value[type][data] = 1
  }

  store()
}

const checkLegacy = (type: WatchlistType, data: string, legacyData?: string) => {
  if (legacyData && watchlist.value[type][legacyData]) {
    delete watchlist.value[type][legacyData]

    watchlist.value[type][data] = 1

    store()
  }
}

const storageWatchlist = localStorage.getItem('watchlist'),
  storageFavorites = localStorage.getItem('favorites')

if (storageWatchlist) {
  try {
    const _watchlist = JSON.parse(storageWatchlist!)

    for (const type of Object.keys(watchlist.value) as (keyof typeof watchlist.value)[]) {
      for (const bech32 of _watchlist[type]) {
        watchlist.value[type][bech32] = 1
      }
    }
  } catch {}
} else if (storageFavorites) {
  // legacy migration
  try {
    const favorites = JSON.parse(storageFavorites)

    for (const type of ['pool', 'account'] as const) {
      for (const base62 of favorites[type + 's']) {
        const hash = base62Decode(base62)
        if (/^[0-9A-Fa-f]{56}$/.test(hash)) {
          watchlist.value[type][hash] = 1
        }
      }
    }
  } catch {}

  store()
}

export { get, toggle, getNormalized, checkLegacy }
