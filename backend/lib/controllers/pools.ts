import { getEntry } from '@/cache.ts'
import { getList as getBlockList } from '@/models/blocks.ts'
import { type ListSort, type RowSortFieldMap, getItem, getItemRows, getList } from '@/models/pools.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import { getData } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'pool'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const storageData = await getData()

  const data = {
    pool: storageData.pool,
    pool_with_stake: storageData.stakePool,
    pool_with_block: storageData.blockProducer,
    pool_retired: storageData.totalRetiredPools,

    delegator: storageData.delegator,
    delegator_with_stake: storageData.stakeHolder,
    stake: storageData.stake,

    rewarded_account: storageData.totalRewardedAccounts,
    reward_amount: storageData.totalDelegatorRewards + storageData.totalOrphanedRewards,
    pool_fee: storageData.totalPoolFees,

    saturation_point: storageData.liveSaturationPoint,
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

  const { data, poolId, slotLeaderId } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  const rowsEntry = query.rows
    ? await getEntry(`${cacheKey}Rows|${poolId}|${query.rows}|${query.sort}|${dir}|${limit}|${after}`, () =>
        query.rows === 'blocks'
          ? getBlockList(query, { type: 'pool', id: poolId })
          : getItemRows({
              rows: query.rows,
              sort: query.sort,
              dir,
              limit,
              after,
              poolId,
              slotLeaderId,
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
