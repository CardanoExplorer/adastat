import { getEntry } from '@/cache.ts'
import { type ListSort, type RowSortFieldMap, getItem, getItemRows, getList } from '@/models/addresses.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import { getData } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'address'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const storageData = await getData()

  const data = {
    account: storageData.account,
    account_with_amount: storageData.holder,
    delegator: storageData.delegator,
    delegator_with_stake: storageData.stakeHolder,
    shelley_amount: storageData.circulatingSupply - storageData.byronAmount,
    stake: storageData.stake,
    byron: storageData.byron,
    byron_with_amount: storageData.byronHolder,
    byron_amount: storageData.byronAmount,
    account_types: storageData.holderRange.byron,
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

export const item: ItemHandler<AnyObject, AnyObject, RowsQueryString<RowSortFieldMap>> = async ({ query, params }) => {
  const itemId = params.itemId.toLowerCase(),
    { dir, limit, after, policy } = query

  const itemEntry = getEntry(`${cacheKey}Item|${itemId}`, () => getItem(itemId))

  const { data, addressId, firstTx, lastTx } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  const rowsEntry = query.rows
    ? await getEntry(
        `${cacheKey}Rows|${addressId}|${query.rows}|${query.sort}|${dir}|${limit}|${after}|${policy}`,
        () =>
          getItemRows({
            rows: query.rows,
            sort: query.sort,
            dir,
            limit,
            after,
            addressId,
            firstTx,
            lastTx,
            policy,
            data,
          } as any)
      )
    : ({} as ReturnType<typeof getItemRows>)

  const { rows, cursor } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

  return {
    data,
    rows,
    cursor,
  }
}
