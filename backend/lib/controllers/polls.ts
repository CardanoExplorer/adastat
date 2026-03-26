import { networkParams } from '@/config.ts'
import { getItem, getList } from '@/models/polls.ts'
import type { ItemHandler, ListHandler } from '@/schema.ts'

export const list: ListHandler = async ({ query }) => {
  const data = {
    poll: networkParams.name === 'mainnet' || networkParams.name === 'preprod' ? 1 : 0,
    live_poll: 0,
    vote: networkParams.name === 'mainnet' ? 796 : networkParams.name === 'preprod' ? 28 : 0,
  }

  const rowsEntry = query.rows ? getList() : ({} as ReturnType<typeof getList>)

  const { rows } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

  return {
    data,
    rows,
  }
}

export const item: ItemHandler = async (req) => {
  const { itemId } = req.params

  const itemEntry = getItem(itemId)

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return {
    data,
  }
}
