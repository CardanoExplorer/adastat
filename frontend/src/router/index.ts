import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

// import type { RouteLocationNormalizedGeneric } from 'vue-router'

// import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import { defaultLocale, routeMiddleware as i18nRouteMiddleware, locales } from '@/i18n'
import { type ApiResponse, routeMiddleware as apiRouteMiddleware, routeUpdateTrigger } from '@/utils/api'
import type { StringObject } from '@/utils/helper'

declare module 'vue-router' {
  interface RouteMeta {
    api?: {
      point: string
      sortKeyMap?: StringObject
      response?: ApiResponse
      pageCount?: number
      navigation?: {
        history: boolean | undefined
        position: number
      }
      scrollPosition?: {
        left: number
        top: number
      }
      // routeMiddlewarePromise?: Promise<void>
    }
  }
}

const isRouteLoading = ref(false)

const loadView = (view: string) => () => import(`@/views/${view}.vue`)

// const UnderlyingView = defineComponent({
//   setup() {
//     const HomePage = defineAsyncComponent(loadView('HomePage')),
//       route = useRoute(),
//       isApiLoaded = ref<boolean>()

//     watch(
//       () => route.name,
//       async () => {
//         isApiLoaded.value = false

//         await route.meta.api!.routeMiddlewarePromise

//         isApiLoaded.value = true
//       },
//       { immediate: true }
//     )

//     return () => (isApiLoaded.value ? h(HomePage) : null)
//   },
// })

const nonDefaultLocales: string[] = []
for (const locale of Object.keys(locales)) {
  if (locale != defaultLocale) {
    nonDefaultLocales.push(locale)
  }
}

// const emptyComponent = {
//   setup: () => () => null,
// }

let historyNavigation: undefined | boolean

const routerHistory = createWebHistory(import.meta.env.BASE_URL)

routerHistory.listen(() => {
  historyNavigation = true
})

const router = createRouter({
  history: routerHistory,
  // strict: true,
  // sensitive: true,
  linkActiveClass: '',
  linkExactActiveClass: '',
  routes: [
    {
      path: '/:lang(' + nonDefaultLocales.join('|') + ')?/',
      children: [
        {
          path: '',
          name: 'dashboard',
          component: loadView('HomePage'),
          meta: {
            api: {
              point: 'dashboard',
              // viewMiddleware: async (to: RouteLocationNormalizedGeneric, from: RouteLocationNormalizedGeneric) => {
              //   console.log('beforeEnter dashboard', to, from)
              // },
            },
          },
        },
        {
          path: 'pools',
          children: [
            {
              path: '',
              name: 'pools',
              component: loadView('PoolList'),
              meta: {
                api: {
                  point: 'pools',
                  sortKeyMap: {
                    active_stake: 'active_stake',
                    live_stake: 'live_stake',
                    delegator: 'delegator',
                    total_block: 'total_block',
                    block: 'block',
                    margin: 'margin',
                    fixed_cost: 'fixed_cost',
                    pledge: 'pledge',
                    reward_amount: 'reward_amount',
                    pool_fee: 'pool_fee',
                    leverage: 'leverage',
                    apr: 'apr',
                  },
                },
              },
            },
            {
              path: ':id(pool[a-z0-9]{52}|[a-fA-F0-9]{56})',
              name: 'pool',
              component: loadView('PoolItem'),
              meta: {
                api: {
                  point: 'pools',
                },
              },
            },
          ],
        },
        {
          path: 'polls',
          children: [
            {
              path: '',
              name: 'polls',
              component: loadView('PollList'),
              meta: {
                api: {
                  point: 'polls',
                  sortKeyMap: {
                    submission_time: 'submission_time',
                    expiry_epoch: 'expiry_epoch',
                    vote: 'vote',
                    stake: 'stake',
                    pledge: 'pledge',
                    delegator: 'delegator',
                  },
                },
              },
            },
            {
              path: ':id([a-fA-F0-9]{64})',
              name: 'poll',
              component: loadView('PollItem'),
              meta: {
                api: {
                  point: 'polls',
                },
              },
            },
          ],
        },
        {
          path: 'governances',
          children: [
            {
              path: '',
              name: 'gov_actions',
              component: loadView('GovActionList'),
              meta: {
                api: {
                  point: 'gov_actions',
                  sortKeyMap: {
                    submission_time: 'submission_time',
                    expiry_epoch: 'expiry_epoch',
                  },
                },
              },
            },
            {
              path: ':id(gov_action[a-z0-9]{60}|[a-fA-F0-9]{66})',
              name: 'gov_action',
              component: loadView('GovActionItem'),
              meta: {
                api: {
                  point: 'gov_actions',
                },
              },
            },
          ],
        },
        {
          path: 'dreps',
          children: [
            {
              path: '',
              name: 'dreps',
              component: loadView('DRepList'),
              meta: {
                api: {
                  point: 'dreps',
                  sortKeyMap: {
                    reg_time: 'reg_time',
                    delegator: 'delegator',
                    live_stake: 'live_stake',
                    active_until: 'active_until',
                  },
                },
              },
            },
            {
              path: ':id(drep[a-z0-9]{52}|drep[a-z0-9]{54}|drep_always_abstain|drep_always_no_confidence|2[23][a-fA-F0-9]{56})',
              name: 'drep',
              component: loadView('DRepItem'),
              meta: {
                api: {
                  point: 'dreps',
                },
              },
            },
          ],
        },
        {
          path: 'accounts',
          children: [
            {
              path: '',
              name: 'accounts',
              component: loadView('AccountList'),
              meta: {
                api: {
                  point: 'accounts',
                  sortKeyMap: {
                    balance: 'balance',
                    total_reward_amount: 'total_reward_amount',
                    token: 'token',
                    first_tx: 'first_tx',
                    last_tx: 'last_tx',
                    tx: 'tx',
                  },
                },
              },
            },
            {
              path: ':id(stake[a-z0-9]{54}|stake_test[a-z0-9]{54}|[ef][01][a-fA-F0-9]{56}|[a-fA-F0-9]{56})',
              name: 'account',
              component: loadView('AccountItem'),
              meta: {
                api: {
                  point: 'accounts',
                },
              },
            },
          ],
        },
        {
          path: 'addresses',
          children: [
            {
              path: '',
              name: 'addresses',
              component: loadView('AddressList'),
              meta: {
                api: {
                  point: 'addresses',
                  sortKeyMap: {
                    balance: 'balance',
                    token: 'token',
                    first_tx: 'first_tx',
                    last_tx: 'last_tx',
                    tx: 'tx',
                  },
                },
              },
            },
            {
              path: ':id(\\$?\\w+)',
              name: 'address',
              component: loadView('AddressItem'),
              meta: {
                api: {
                  point: 'addresses',
                },
              },
            },
          ],
        },
        {
          path: 'epochs',
          children: [
            {
              path: '',
              name: 'epochs',
              component: loadView('EpochList'),
              meta: {
                api: {
                  point: 'epochs',
                  sortKeyMap: {
                    no: 'no',
                    tx_amount: 'tx_amount',
                    circulating_supply: 'circulating_supply',
                    pool_with_block: 'pool_with_block',
                    pool_with_stake: 'pool_with_stake',
                    pool_fee: 'pool_fee',
                    reward_amount: 'reward_amount',
                    stake: 'stake',
                    holder: 'holder',
                    account_with_reward: 'account_with_reward',
                    pool_register: 'pool_register',
                    pool_retire: 'pool_retire',
                    block_with_tx: 'block_with_tx',
                    delegator_with_stake: 'delegator_with_stake',
                    token: 'token',
                    token_policy: 'token_policy',
                    token_holder: 'token_holder',
                    token_tx: 'token_tx',
                    tx_out_sum: 'tx_out_sum',
                    tx_fee: 'tx_fee',
                    tx: 'tx',
                    block: 'block',
                    start: 'no',
                    end: 'no',
                    market_cap: 'market_cap',
                    exchange_rate: 'exchange_rate',
                    block_size: 'block_size',
                  },
                },
              },
            },
            {
              path: ':id(0|[1-9]\\d*)',
              name: 'epoch',
              component: loadView('EpochItem'),
              meta: {
                api: {
                  point: 'epochs',
                },
              },
            },
          ],
        },
        {
          path: 'blocks',
          children: [
            {
              path: '',
              name: 'blocks',
              component: loadView('BlockList'),
              meta: {
                api: {
                  point: 'blocks',
                  sortKeyMap: {
                    block: 'no',
                    time: 'no',
                    tx: 'tx',
                    size: 'size',
                    slot_no: 'no',
                    epoch_slot: 'no',
                    tx_amount: 'tx_amount',
                    tx_out_sum: 'tx_out_sum',
                    tx_fee: 'tx_fee',
                  },
                },
              },
            },
            {
              path: ':id([1-9]\\d*|0|[a-fA-F0-9]{64}|genesis)',
              name: 'block',
              component: loadView('BlockItem'),
              meta: {
                api: {
                  point: 'blocks',
                },
              },
            },
          ],
        },
        {
          path: 'transactions',
          children: [
            {
              path: '',
              name: 'transactions',
              component: loadView('TransactionList'),
              meta: {
                api: {
                  point: 'transactions',
                  sortKeyMap: {
                    transaction: 'time',
                    time: 'time',
                    amount: 'amount',
                    out_sum: 'out_sum',
                    fee: 'fee',
                    deposit: 'deposit',
                    token: 'token',
                    size: 'size',
                    script_size: 'script_size',
                    block_index: 'time',
                    slot_no: 'time',
                    epoch_slot: 'time',
                  },
                },
              },
            },
            {
              path: ':id([a-fA-F0-9]{64})',
              name: 'transaction',
              component: loadView('TransactionItem'),
              meta: {
                api: {
                  point: 'transactions',
                },
              },
            },
          ],
        },
        {
          path: 'tokens',
          children: [
            {
              path: '',
              name: 'tokens',
              component: loadView('TokenList'),
              meta: {
                api: {
                  point: 'tokens',
                  sortKeyMap: {
                    holder: 'holder',
                    supply: 'supply',
                    first_tx: 'first_tx',
                    last_tx: 'last_tx',
                    tx: 'tx',
                  },
                },
              },
            },
            {
              path: ':id(asset[a-z0-9]{39}|[a-fA-F0-9]{56,120})',
              name: 'token',
              component: loadView('TokenItem'),
              meta: {
                api: {
                  point: 'tokens',
                },
              },
            },
          ],
        },
        {
          path: 'policies',
          children: [
            {
              path: '',
              name: 'policies',
              component: loadView('PolicyList'),
              meta: {
                api: {
                  point: 'policies',
                  sortKeyMap: {
                    holder: 'holder',
                    supply: 'token',
                    first_tx: 'first_tx',
                    last_tx: 'last_tx',
                    tx: 'tx',
                  },
                },
              },
            },
            {
              path: ':id([a-fA-F0-9]{56})',
              name: 'policy',
              component: loadView('PolicyItem'),
              meta: {
                api: {
                  point: 'policies',
                },
              },
            },
          ],
        },
        {
          path: 'about',
          name: 'about',
          component: loadView('AboutUs'),
        },
        {
          path: 'watchlist',
          name: 'watchlist',
          component: loadView('WatchList'),
          meta: {
            api: {
              point: 'dashboard',
            },
          },
        },
        {
          path: ':pathMatch(.*)*',
          component: loadView('NotFound'),
        },
      ],
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    // console.log('Router scrollBehavior event', savedPosition)

    const scrollPosition = savedPosition || { left: 0, top: 0 }

    if (savedPosition && to.meta.api) {
      to.meta.api.scrollPosition = savedPosition
    }

    return scrollPosition
  },
})

router.beforeEach(async (to, from) => {
  console.log('router.beforeEach', to, from, window.history.state.modal)

  isRouteLoading.value = to.fullPath.replace(to.hash, '') != from.fullPath.replace(from.hash, '') || historyNavigation == undefined

  const i18nRoute = await i18nRouteMiddleware(to)

  if (i18nRoute) {
    return i18nRoute
  } else if (to.query.page == '1') {
    delete to.query.page
    return to
  }

  if (to.meta.api) {
    to.meta.api.navigation = {
      history: historyNavigation,
      position: (historyNavigation == false ? 1 : 0) + window.history.state.position,
    }
  }

  if (isRouteLoading.value) {
    await apiRouteMiddleware(to)
  } else if (from.meta.api && to.meta.api) {
    to.meta.api.response = from.meta.api.response
  }
  // const apiRouteMiddlewarePromise = apiRouteMiddleware(to)

  // if (to.meta.api) {
  //   to.meta.api.routeMiddlewarePromise = apiRouteMiddlewarePromise

  //   await apiRouteMiddlewarePromise
  // }

  historyNavigation = false
})

// router.beforeResolve(async (to) => {
//   console.log('router.beforeResolve')
//   console.log(Object.keys(to.matched[to.matched.length - 1].components!.default!))
// })

router.afterEach(async (to, from) => {
  console.log('router.afterEach', to, from, window.history.state.modal)
  // console.log('to.meta.api?.pageCount', to.meta.api?.pageCount, to.meta.api?.navigation)

  if (!isRouteLoading.value) {
    if (to.meta.api?.navigation && to.meta.api.navigation.history == undefined) {
      to.meta.api.navigation.history = historyNavigation
    }

    if ((to.meta.api?.pageCount as number) > 1) {
      isRouteLoading.value = true

      await apiRouteMiddleware(to)

      routeUpdateTrigger.value = !routeUpdateTrigger.value
    }
  }

  isRouteLoading.value = false
  // console.log(router.currentRoute.value.name)
  document.body.classList.remove('loading')
})

// for (const methodName of ['push', 'replace'] as const) {
//   // ['push', 'replace', 'go', 'back', 'forward']
//   const method = router[methodName].bind(router)
//   router[methodName] = (...args) => {
//     historyNavigation = false

//     return method(...args)
//   }
// }

// const matcher = router.matcher
// router.currentRoute.value.name = (router.currentRoute as any)._value.name = (router.currentRoute as any)._rawValue.name = 'more'

// console.log(router)

// const originalResolve = router.resolve.bind(router)

// router.resolve = (...args: Parameters<typeof originalResolve>) => {
//   const resolved = originalResolve(...args)

//   console.log('resolved', ...args, resolved)

//   return resolved
// }

export default router

export { isRouteLoading }
