import { getEntry } from '@/cache.ts'
import { totalData } from '@/helpers/dreps.ts'
import { type ListSort, type RowSortFieldMap, getItem, getItemRows, getList } from '@/models/dreps.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'drep'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const data = {
    total: totalData.dreps,
    active_total: totalData.activeDReps,
    live_stake: totalData.liveStake,
    inactive_stake: totalData.inactiveStake,
    abstain_stake: totalData.alwaysAbstainStake,
    delegator: totalData.delegators,
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

  const { data, drepId } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  const rowsEntry = query.rows
    ? await getEntry(`${cacheKey}Rows|${drepId}|${query.rows}|${query.sort}|${dir}|${limit}|${after}`, () =>
        getItemRows({
          rows: query.rows,
          sort: query.sort,
          dir,
          limit,
          after,
          drepId,
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
