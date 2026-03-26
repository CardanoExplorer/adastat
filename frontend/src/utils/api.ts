import { type App, type WatchHandle, readonly, ref, watch } from 'vue'
import { type RouteLocationNormalizedGeneric, type RouteMeta, useRoute, useRouter } from 'vue-router'

import { currency } from '@/i18n'
import type { AnyObject, StringObject } from '@/utils/helper'
import { getSortDir, getSortKey, limit, setSortDir, setSortKey, toggleSortDir } from '@/utils/settings'
import { socketData } from '@/utils/socket'
import { getNormalized } from '@/utils/watchlist'

import NetworkError from '@/components/NetworkError.vue'

type FetchQuery = {
  sort?: string
  dir?: 'asc' | 'desc'
  limit?: number
  page?: number
  currency?: string
  rows?: string
  after?: string
  watchlist?: string[]
  [key: string]: any
}

type Rows = AnyObject[]

type ApiResponseSuccess = {
  code: 200
  data: AnyObject
  tip: typeof socketData.value & { exchange_rate: number; circulating_supply: `${number}` }
  rows?: Rows
  cursor?: {
    after: string
    next: boolean
  }
}

type ApiResponseError = {
  code: Exclude<number, 200>
  // error: string
}

type ApiResponse = ApiResponseSuccess | ApiResponseError

type RowsResolver = () => Promise<Rows> | Rows

type RowsHandler = (rows: Rows, newRows?: Rows) => Promise<any> | any

let socketDataHandler: WatchHandle | null

const getUnixTimestamp = () => Math.trunc(Date.now() / 1000)

const lastSyncTime = ref(getUnixTimestamp()),
  apiTip = ref<ApiResponseSuccess['tip']>({
    epoch_no: 0,
    slot_no: 0,
    epoch_slot_no: 0,
    block_no: 0,
    block_hash: '',
    exchange_rate: 0,
    circulating_supply: '0',
  }),
  apiLag = ref(false),
  fetchProgress = ref(0),
  routeUpdateTrigger = ref(false)

const viewCache: Record<
  number,
  {
    fullPath: RouteLocationNormalizedGeneric['fullPath']
    cursorAfter?: string
    rows: Rows
    rowsType?: string
    filterMap: StringObject
    sortKey: ReturnType<typeof getSortKey>
    sortDir: ReturnType<typeof getSortDir>
    sortKeyMap: NonNullable<NonNullable<RouteMeta['api']>['sortKeyMap']>
    limit: typeof limit.value
    pageCount: number
    nextPage?: number
  }
> = {}

const liveFetch: {
  id?: number
  uri?: string
  con?: AbortController
  res?: Promise<Response>
} = {}

const noApiHandler = watch(socketData, async () => {
  lastSyncTime.value = getUnixTimestamp()
})

const getApiPoint = (apiPoint: string, paramsId?: RouteLocationNormalizedGeneric['params']['id']) =>
  paramsId ? apiPoint + '/' + paramsId : apiPoint

const getSortPoint = (apiPoint: string, rowsType?: string) => (rowsType ? apiPoint + '.' + rowsType : apiPoint)

const getDataFetchQuery = (route: ReturnType<typeof useRoute>, filterMap?: StringObject): FetchQuery => {
  const { point, sortKeyMap } = route.meta.api!,
    watchlist = point == 'dashboard' ? getNormalized() : {}

  return sortKeyMap
    ? {
        rows: point,
        ...filterMap,
        sort: sortKeyMap[getSortKey(point, sortKeyMap)],
        dir: getSortDir(point),
        limit: limit.value,
        page: +route.query.page! || 1,
      }
    : {
        ...watchlist,
      }
}

const isApiResponseSuccess = (apiResponse: ApiResponse): apiResponse is ApiResponseSuccess => apiResponse.code == 200

const fetchApiData = async (apiPoint: string, query?: FetchQuery) => {
  let apiResponse: ApiResponse

  if (query?.page == 1) {
    delete query.page
  }

  const id = Date.now(),
    uri =
      import.meta.env.VITE_API_PATH +
      '/' +
      apiPoint +
      '.json?' +
      new URLSearchParams({
        currency: currency.value,
        ...(query as StringObject),
      })

  liveFetch.id = id

  if (liveFetch.uri != uri) {
    liveFetch.uri = uri

    liveFetch.con?.abort()

    liveFetch.con = new AbortController()

    liveFetch.res = fetch(uri, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
      },
      signal: liveFetch.con.signal,
    })

    fetchProgress.value = 0
  }

  try {
    const { body, headers } = (await liveFetch.res!).clone(),
      reader = body!.getReader(),
      contentLength = (headers.get('x-decompressed-content-length') || headers.get('Content-Length')) as any as number,
      chunks = []

    let receivedLength = 0,
      position = 0

    while (true) {
      const { done, value } = await reader.read()

      if (liveFetch.id != id) {
        reader.cancel()

        throw ''
      }

      if (done) {
        break
      }

      chunks.push(value)
      receivedLength += value.length

      if (receivedLength < contentLength) {
        fetchProgress.value = receivedLength / contentLength
      }
    }

    const res = new Uint8Array(receivedLength)

    for (const chunk of chunks) {
      res.set(chunk, position)
      position += chunk.length
    }

    const json = JSON.parse(new TextDecoder('utf-8').decode(res))

    if (json.code == 200) {
      apiLag.value = false
    } else if (json.code == 203) {
      json.code = 200
      apiLag.value = true
    } else if (!json.code || !json.error) {
      throw ''
    }

    apiResponse = json
  } catch {
    apiResponse = {
      code: liveFetch.uri == uri ? 520 : 499,
    }
  }

  if (liveFetch.id == id) {
    if (isApiResponseSuccess(apiResponse)) {
      lastSyncTime.value = getUnixTimestamp()
    }

    for (const key of Object.keys(liveFetch)) {
      delete liveFetch[key as keyof typeof liveFetch]
    }
    // liveFetch.id = liveFetch.uri = liveFetch.con = liveFetch.res = undefined

    fetchProgress.value = 1
  }

  return apiResponse
}

const routeMiddleware = async (to: RouteLocationNormalizedGeneric) => {
  socketDataHandler?.stop()

  socketDataHandler = null

  if (to.meta.api) {
    noApiHandler.pause()

    const { history: historyNavigation, position: historyPosition } = to.meta.api.navigation!,
      minCachedPos = historyPosition - 5, // we keep a maximum of 5 cached views up to the current one
      viewData = viewCache[historyPosition]

    let maxCachedPos = historyPosition - 1,
      dataFetchQuery = getDataFetchQuery(to)

    if (historyNavigation && viewData?.fullPath == to.fullPath) {
      // we already have cachedData
      maxCachedPos = Infinity

      const sortPoint = to.meta.api!.point,
        sortKey = viewData.sortKeyMap ? getSortKey(sortPoint, viewData.sortKeyMap) : '',
        sortDir = getSortDir(sortPoint)

      if (
        viewData.pageCount > 1 ||
        (to.query.page as any as number) > 1 ||
        viewData.limit != limit.value ||
        viewData.sortKey != sortKey ||
        viewData.sortDir != sortDir
      ) {
        dataFetchQuery = {}
      }
    }

    // console.log('routeMiddleware before', minCachedPos, maxCachedPos, Object.keys(viewCache))

    for (const key of Object.keys(viewCache) as any as number[]) {
      if (key < minCachedPos || key > maxCachedPos) {
        delete viewCache[key]
      }
    }

    // await new Promise((r) => setTimeout(r, 5000)) // testing the long response

    to.meta.api.response = await fetchApiData(getApiPoint(to.meta.api!.point, to.params.id), dataFetchQuery)

    // console.log('routeMiddleware after', minCachedPos, maxCachedPos, Object.keys(viewCache))
  } else {
    noApiHandler.resume()
  }
}

const useViewApi = (newRowsCB?: (newRows: Rows) => any) => {
  const router = useRouter(),
    route = useRoute()

  let sortKeyMap = route.meta.api!.sortKeyMap!,
    cursorAfter: (typeof viewCache)[number]['cursorAfter'],
    { position: historyPosition } = route.meta.api!.navigation!,
    apiPoint: string,
    filterMap: StringObject = {}

  const errorCode = ref(0),
    data = ref<AnyObject>(),
    rows = ref<Rows>([]),
    rowsType = ref<(typeof viewCache)[number]['rowsType']>(),
    sortPoint = ref(getSortPoint(route.meta.api!.point)),
    sortKey = ref(sortKeyMap ? getSortKey(sortPoint.value, sortKeyMap) : ''),
    sortDir = ref(getSortDir(sortPoint.value)),
    page = ref(1),
    pageCount = ref(1),
    nextPage = ref<(typeof viewCache)[number]['nextPage']>(),
    limitHandling = ref(false),
    sortHandling = ref(''),
    filterHandling = ref(false),
    moreHandling = ref(false)

  const setApiData = (apiResponse: ApiResponse, forceError = false) => {
    if (route.meta.api) {
      route.meta.api.response = apiResponse

      if (isApiResponseSuccess(apiResponse)) {
        errorCode.value = 0
        data.value = apiResponse.data

        apiTip.value = apiResponse.tip

        if (apiResponse.rows) {
          if (moreHandling.value) {
            if (apiResponse.rows.length) {
              rows.value = rows.value.concat(apiResponse.rows)

              pageCount.value++
            }
          } else {
            rows.value = apiResponse.rows

            pageCount.value = 1
          }

          if (route.meta.api.sortKeyMap) {
            route.meta.api.pageCount = pageCount.value
          }

          cursorAfter = apiResponse.cursor?.after
          nextPage.value = apiResponse.cursor?.next ? page.value + 1 : undefined
        }

        // console.log('setApiData', historyPosition)

        viewCache[historyPosition] = {
          fullPath: route.fullPath,
          cursorAfter: cursorAfter,
          rows: rows.value,
          rowsType: rowsType.value,
          filterMap: filterMap,
          sortKey: sortKey.value,
          sortDir: sortDir.value,
          sortKeyMap: sortKeyMap,
          limit: limit.value,
          pageCount: pageCount.value,
          nextPage: nextPage.value,
        }

        return apiResponse.rows
      } else if (forceError) {
        errorCode.value = apiResponse.code
        data.value = undefined
      }
    }
  }

  const fetchRows = (fetchQuery?: FetchQuery) => {
    const sort = sortKeyMap[sortKey.value]

    return fetchApiData(apiPoint, {
      rows: rowsType.value || apiPoint,
      ...filterMap,
      ...fetchQuery,
      ...(sort && { sort, dir: sortDir.value }),
      limit: limit.value,
    })
  }

  const setApiRows = async (
    resolveRows?: RowsResolver,
    handleRows?: RowsHandler,
    fetchQuery?: FetchQuery
  ): Promise<any> => {
    const waiter = new Promise((r) => setTimeout(r, 300))

    // await new Promise((r) => setTimeout(r, 3000))

    const newRows = setApiData(
      resolveRows
        ? {
            data: data.value,
            tip: apiTip.value,
            rows: await resolveRows(),
            code: 200,
          }
        : await fetchRows(fetchQuery)
    )

    await handleRows?.(rows.value, newRows)

    await waiter
  }

  const setRowsType = (type: string, _sortKeyMap: StringObject) => {
    rowsType.value = type

    sortPoint.value = getSortPoint(route.meta.api!.point, type)
    sortKeyMap = _sortKeyMap

    sortKey.value = getSortKey(sortPoint.value, sortKeyMap)
    sortDir.value = getSortDir(sortPoint.value)
    pageCount.value = 1
  }

  const updateRows = async (handleRows?: RowsHandler) => {
    if (pageCount.value == 1) {
      await setApiRows(undefined, handleRows)
    }
  }

  const redirectToFirstPage = () => {
    if (page.value > 1) {
      router.push({
        name: route.name,
      })

      return true
    }
  }

  const limitHandler = async (resolveRows?: RowsResolver, handleRows?: RowsHandler) => {
    if (!redirectToFirstPage()) {
      limitHandling.value = true

      await setApiRows(resolveRows, handleRows)

      limitHandling.value = false
    }
  }

  const sortHandler = async (newKey: string, resolveRows?: RowsResolver, handleRows?: RowsHandler) => {
    const oldKey = sortKey.value

    if (oldKey == newKey) {
      sortDir.value = toggleSortDir(sortPoint.value, sortDir.value)
    } else {
      sortKey.value = setSortKey(sortPoint.value, newKey)
    }

    if (
      !redirectToFirstPage() &&
      (sortKeyMap[oldKey] != sortKeyMap[newKey] || oldKey == newKey || pageCount.value > 1)
    ) {
      sortHandling.value = newKey

      await setApiRows(resolveRows, handleRows)

      sortHandling.value = ''
    }
  }

  const filterHandler = async (filter: StringObject, resolveRows?: RowsResolver, handleRows?: RowsHandler) => {
    filterMap = filter

    if (!redirectToFirstPage()) {
      filterHandling.value = true

      await setApiRows(resolveRows, handleRows)

      filterHandling.value = false
    }
  }

  const moreHandler = async (resolveRows?: RowsResolver, handleRows?: RowsHandler) => {
    moreHandling.value = true

    await setApiRows(resolveRows, handleRows, { after: cursorAfter })

    moreHandling.value = false
  }

  watch(
    [() => route.fullPath, routeUpdateTrigger],
    () => {
      // new url within view (i.e. next page / block / tx / etc), exclude hash (tab) change
      ;({ position: historyPosition } = route.meta.api!.navigation!)

      page.value = +route.query.page! || 1

      apiPoint = getApiPoint(route.meta.api!.point, route.params.id)

      const apiResponse = route.meta.api!.response!,
        viewData = viewCache[historyPosition]

      if (isApiResponseSuccess(apiResponse) && viewData?.fullPath == route.fullPath) {
        cursorAfter = viewData.cursorAfter
        sortKeyMap = viewData.sortKeyMap

        errorCode.value = 0
        data.value = apiResponse.data
        apiTip.value = apiResponse.tip
        rows.value = viewData.rows
        rowsType.value = viewData.rowsType
        filterMap = viewData.filterMap
        limit.value = viewData.limit
        pageCount.value = viewData.pageCount
        nextPage.value = viewData.nextPage

        sortPoint.value = getSortPoint(route.meta.api!.point, rowsType.value)
        sortKey.value = setSortKey(sortPoint.value, viewData.sortKey)
        sortDir.value = setSortDir(sortPoint.value, viewData.sortDir)
      } else {
        rowsType.value = undefined

        setApiData(apiResponse, true)
      }

      if (!socketDataHandler) {
        socketDataHandler = watch(socketData, async (newSocketData, oldSocketData) => {
          // new block has arrived - we should fetch potentially new data
          // console.log('from watch useViewApi socketData', newSocketData, liveFetch.id)
          if (oldSocketData && !liveFetch.id) {
            const newRows = setApiData(
              await fetchApiData(
                apiPoint,
                pageCount.value > 1 || page.value > 1 ? {} : getDataFetchQuery(route, filterMap)
              )
            )

            if (newRows && newRowsCB) {
              newRowsCB(newRows)
            }
          }
        })
      }
    },
    {
      immediate: true,
    }
  )

  return {
    router,
    route,
    errorCode: readonly(errorCode),
    data,
    rows,
    filterMap,
    rowsType: readonly(rowsType),
    sortPoint: readonly(sortPoint),
    sortKey: readonly(sortKey),
    sortDir: readonly(sortDir),
    // limit: readonly(limit),
    page: readonly(page),
    pageCount: readonly(pageCount),
    nextPage: readonly(nextPage),
    socketDataHandler: Object.freeze({
      pause: () => {
        socketDataHandler?.pause()
        noApiHandler.resume()
      },
      resume: () => {
        if (socketDataHandler) {
          socketDataHandler.resume()
          noApiHandler.pause()
        }
      },
    }),
    setRowsType,
    setApiRows,
    updateRows,
    limitHandler,
    limitHandling,
    sortHandler,
    sortHandling,
    filterHandler,
    moreHandler,
    filterHandling,
    moreHandling,
  }
}

export default {
  install: (app: App) => {
    app.component('NetworkError', NetworkError)
  },
}

export { routeMiddleware, routeUpdateTrigger, useViewApi, apiTip, apiLag, lastSyncTime, fetchProgress }

export type { ApiResponse, ApiResponseError, ApiResponseSuccess, FetchQuery }
