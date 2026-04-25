import { getEntry } from '@/cache.ts'
import { throwError } from '@/helper.ts'
import { getList as getBlockList } from '@/models/blocks.ts'
import { type ListSort, getItem, getList } from '@/models/epochs.ts'
import { getList as getTxList } from '@/models/transactions.ts'
import { type RowSortFieldMap } from '@/routes/epochs.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'epoch'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const data = {
    epoch_no: latestBlock.epoch_no,
    epoch_slot_no: latestBlock.epoch_slot_no,
    slot_no: latestBlock.slot_no,
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

export const item: ItemHandler<AnyObject, AnyObject, RowsQueryString<RowSortFieldMap>, number> = async ({
  query,
  params,
}) => {
  const { itemId } = params

  const itemEntry = getEntry(`${cacheKey}Item|${itemId}`, () => getItem(itemId))

  const { data, exchangeRates } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  data.exchange_rate = exchangeRates?.[query.currency] || 0

  const rowsEntry = query.rows
    ? getEntry(
        `${cacheKey}Rows|${itemId}|${query.rows}|${query.sort}|${query.dir}|${query.limit}|${query.after}`,
        () => {
          if (query.rows === 'blocks') {
            return getBlockList(query, { type: 'epoch', id: data.no })
          } else if (query.rows === 'transactions') {
            return getTxList(query, { type: 'epoch', id: data.no })
          } else {
            return throwError(400)
          }
        }
      )
    : ({} as ReturnType<typeof getBlockList | typeof getTxList>)

  const { rows, cursor } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

  return {
    data,
    rows,
    cursor,
  }
}
