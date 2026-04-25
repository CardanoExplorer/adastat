import { getEntry } from '@/cache.ts'
import { type ListSort, getItem, getList } from '@/models/blocks.ts'
import { getList as getTxList } from '@/models/transactions.ts'
import type { ItemHandler, ListHandler, QueryString } from '@/schema.ts'
import { getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'block'

export const list: ListHandler<AnyObject, AnyObject, QueryString<ListSort>> = async ({ query }) => {
  const storageData = await getData()

  const data = {
    block_height: latestBlock.block_no,
    min_block: storageData.minEpochBlocks,
    max_block: storageData.maxEpochBlocks,
    avg_block: storageData.avgBlocksPerEpoch,
    min_block_epoch: storageData.minBlocksEpoch,
    max_block_epoch: storageData.maxBlocksEpoch,
    min_block_size: storageData.minBlockSize,
    max_block_size: storageData.maxBlockSize,
    sum_block_size: storageData.totalBlockSize,
    block: storageData.totalBlocks,
    block_with_tx: storageData.totalBlocksWithTxs,
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

export const item: ItemHandler<AnyObject, AnyObject, QueryString, string | number> = async ({ params }) => {
  const { itemId } = params

  const itemEntry = getEntry(`${cacheKey}Item|${String(itemId).toLowerCase()}`, () => getItem(itemId))

  const { blockId, data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  if (!data.transactions) {
    const rowsEntry =
      data.tx > 0
        ? getEntry(`${cacheKey}Rows|${blockId}`, () =>
            getTxList({ sort: 'time', dir: 'desc', limit: data.tx, after: '', page: 1 } as QueryString<any>, {
              type: 'block',
              id: blockId,
            })
          )
        : { rows: [] }

    const { rows } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

    data.transactions = {
      rows,
    }
  }

  return {
    data,
  }
}
