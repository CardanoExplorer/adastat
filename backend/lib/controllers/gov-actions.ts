import { getEntry } from '@/cache.ts'
import { type GovActionTypes, totalData } from '@/helpers/gov-actions.ts'
import {
  type ListSort,
  type RowFilterFieldMap,
  type RowSortFieldMap,
  getItem,
  getItemRows,
  getList,
  rowFilterFieldMap,
} from '@/models/gov-actions.ts'
import type { ItemHandler, ListHandler, QueryString, RowsQueryString } from '@/schema.ts'
import type { AnyObject } from '@/types/shared.js'

const cacheKey = 'govAction'

export const list: ListHandler<
  AnyObject,
  AnyObject,
  QueryString<ListSort, keyof GovActionTypes | 'gov_actions'>
> = async ({ query }) => {
  const data = {
    total: totalData.actions,
    active: totalData.active,
    ratified: totalData.ratified,
  }

  const rowsEntry = query.rows
    ? getEntry(
        `${cacheKey}List|${query.sort}|${query.dir}|${query.limit}|${query.after}|${query.page}|${query.rows}`,
        () => getList(query)
      )
    : ({} as ReturnType<typeof getList>)

  const { rows, cursor } = rowsEntry instanceof Promise ? await rowsEntry : rowsEntry

  return {
    data,
    rows,
    cursor,
  }
}

export const item: ItemHandler<AnyObject, AnyObject, RowsQueryString<RowSortFieldMap, RowFilterFieldMap>> = async ({
  query,
  params,
}) => {
  const itemId = params.itemId.toLowerCase(),
    { dir, limit, after, meta_format } = query

  const itemEntry = getEntry(`${cacheKey}Item|${itemId}|${meta_format}`, () => getItem(itemId, meta_format !== 'md'))

  const { data, govActionId } = itemEntry instanceof Promise ? await itemEntry : itemEntry

  const filters = []

  if (query.rows) {
    for (const filterKey of Object.keys(rowFilterFieldMap[query.rows as keyof RowFilterFieldMap] ?? {})) {
      filters.push(query[filterKey as keyof typeof query] ?? '')
    }
  }

  const rowsEntry = query.rows
    ? await getEntry(
        `${cacheKey}Rows|${govActionId}|${query.rows}|${query.sort}|${dir}|${limit}|${after}|${filters.join('|')}`,
        () =>
          getItemRows({
            ...query,
            govActionId,
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
