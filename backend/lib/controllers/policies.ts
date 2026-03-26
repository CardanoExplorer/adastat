import { getEntry } from '@/cache.ts'
import { type ListSort, type RowSortFieldMap, getItem, getItemRows, getList } from '@/models/policies.ts'
import { getList as getTokenList } from '@/models/tokens.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import { getData } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'policy'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const storageData = await getData()

  const data = {
    token: storageData.token,
    tx: storageData.totalTokenTxs,
    holder: storageData.tokenHolder,
    policy: storageData.tokenPolicy,
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
    { dir, limit, after } = query

  const itemEntry = getEntry(`${cacheKey}Item|${itemId}`, () => getItem(itemId))

  const { data, policyId, firstTx, lastTx, tokenIds } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  const rowsEntry = query.rows
    ? await getEntry(`${cacheKey}Rows|${policyId}|${query.rows}|${query.sort}|${dir}|${limit}|${after}`, () =>
        query.rows === 'tokens'
          ? getTokenList(query, { type: 'policy', id: policyId })
          : getItemRows({
              rows: query.rows,
              sort: query.sort,
              dir,
              limit,
              after,
              policyId,
              data,
              firstTx,
              lastTx,
              tokenIds,
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
