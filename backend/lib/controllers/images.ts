import { getEntry } from '@/cache.ts'
import { getItem as getDRepItem } from '@/models/dreps.ts'
import { getDRepImage, getPoolImage, getTokenImage } from '@/models/images.ts'
import { getItem as getPoolItem } from '@/models/pools.ts'
import { getItem as getTokenItem } from '@/models/tokens.ts'
import type { ImageHandler } from '@/schema.ts'

export const pool: ImageHandler = async ({ params }) => {
  const itemId = params.itemId.toLowerCase()

  const itemEntry = getEntry(`poolItem|${itemId}`, () => getPoolItem(itemId))

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return await getPoolImage(itemId, data.extended_data)
}

export const token: ImageHandler = async ({ params }) => {
  const itemId = params.itemId.toLowerCase()

  const itemEntry = getEntry(`tokenItem|${itemId}`, () => getTokenItem(itemId))

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return await getTokenImage(itemId, data.image)
}

export const drep: ImageHandler = async ({ params }) => {
  const itemId = params.itemId.toLowerCase()

  const itemEntry = getEntry(`drepItem|${itemId}`, () => getDRepItem(itemId))

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return await getDRepImage(itemId, data.image, data.given_name)
}
