import { getEntry } from '@/cache.ts'
import { type ListSort, getItem, getList } from '@/models/transactions.ts'
import type { ItemHandler, ListHandler, QueryString } from '@/schema.ts'
import { getData } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'tx'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const storageData = await getData()

  const data = {
    tx: storageData.totalTxs,
    tx_out_sum: storageData.totalTxOutSum,
    tx_fee: storageData.totalTxFees,
    tx_amount: storageData.totalTxAmount,
    max_tx: storageData.maxEpochTxs,
    max_tx_epoch: storageData.maxTxsEpoch,
    min_tx: storageData.minEpochTxs,
    min_tx_epoch: storageData.minTxsEpoch,
    avg_tx: storageData.avgTxsPerEpoch,
    live_load: storageData.liveLoad,
    live_tps: storageData.liveTPS,
  }

  const rowsEntry = query.rows
    ? getEntry(`${cacheKey}List|${query.sort}|${query.dir}|${query.limit}|${query.after}|${query.page}`, () =>
        getList(query)
      )
    : ({} as ReturnType<typeof getList>)

  const { rows, cursor } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

  return {
    data,
    rows,
    cursor,
  }
}

export const item: ItemHandler = async (req) => {
  const { itemId } = req.params

  const itemEntry = getEntry(`${cacheKey}Item|${itemId.toLowerCase()}`, () => getItem(itemId))

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return {
    data,
  }
}
