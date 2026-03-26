import { getEntry } from '@/cache.ts'
import { getSearch } from '@/models/search.ts'
import type { Handler } from '@/schema.ts'
import { type Currency } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const search: Handler<
  AnyObject,
  AnyObject,
  {
    currency: Currency
    query: string
  }
> = async ({ query }) => {
  const itemEntry = getEntry(`search|${query.query}`, () => getSearch(query.query))

  const { data } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  return {
    data,
  }
}

export default search
