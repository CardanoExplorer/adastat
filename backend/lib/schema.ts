import { type Currency, exchangeRate } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'
import type { FastifyReply, FastifyRequest } from 'fastify'

export interface QueryString<S extends string = string, R extends string = string> {
  sort: S
  dir: 'asc' | 'desc'
  limit: number
  after: string
  page: number
  currency: Currency
  rows?: R
  meta_format: 'html' | 'md'
  policy?: string
}

export type RowsQueryString<M extends Record<string, Record<string, unknown>>> = {
  [R in keyof M]: QueryString<keyof M[R] & string, R & string>
}[keyof M]

export type Handler<
  D extends object = AnyObject,
  R extends object = AnyObject,
  Q extends object = QueryString<any>,
  P extends object = Record<string, never>,
> = (
  req: FastifyRequest<{
    Params: P
    Querystring: Q
  }>,
  rep: FastifyReply
) => Promise<{
  data: D
  rows?: R[]
  cursor?: {
    after: string
    next: boolean
  }
}>

export type ListHandler<
  D extends object = AnyObject,
  R extends object = AnyObject,
  Q extends object = QueryString<any>,
> = Handler<D, R, Q>

export type ItemHandler<
  D extends object = AnyObject,
  R extends object = AnyObject,
  Q extends object = QueryString<any>,
  I = string,
> = Handler<D, R, Q, { itemId: I }>

export type ImageHandler<Q extends object = QueryString<any>, I = string> = (
  req: FastifyRequest<{
    Params: { itemId: I }
    Querystring: Q
  }>,
  rep: FastifyReply
) => Promise<Buffer>

export const page = { type: 'integer', minimum: 1, default: 1 }

export const limit = { type: 'integer', minimum: 1, maximum: 1000, default: 12 }

export const after = { type: 'string', default: '' }

export const dir = { type: 'string', enum: ['asc', 'desc'], default: 'desc' }

export const rows = { type: 'string', default: '' }

export const currency = { type: 'string', enum: Object.keys(exchangeRate), default: 'usd' }

export const meta_format = { type: 'string', enum: ['html', 'md'], default: 'html' }

export const itemQueryString = {
  properties: {
    currency,
  },
  additionalProperties: false,
}

export const buildEnum = <T extends string>(
  obj: Record<T, unknown>
): {
  type: 'string'
  enum: T[]
  default: T | undefined
} => {
  const list = Object.keys(obj) as T[]

  return { type: 'string', enum: list, default: list[0] }
}

export const buildListSchema = (sortData: Record<string, unknown>, extra?: AnyObject) => ({
  querystring: {
    type: 'object',
    properties: {
      ...(Object.keys(sortData).length > 0 ? { sort: buildEnum(sortData) } : {}),
      dir,
      limit,
      after,
      page,
      rows,
      currency,
      ...extra,
    },
  },
})

export const buildItemSchema = () => ({
  querystring: {
    type: 'object',
    ...itemQueryString,
  },
})

export const buildItemRowsSchema = (rowSortFieldMap: Record<string, Record<string, unknown>>, extra?: AnyObject) => ({
  querystring: {
    type: 'object',
    properties: {
      ...itemQueryString.properties,
      dir,
      limit,
      after,
      rows,
      sort: { type: 'string' },
      ...extra,
    },
    allOf: Object.entries(rowSortFieldMap).map(([row, sortData]) => ({
      if: {
        properties: {
          rows: { const: row },
        },
      },
      then: {
        properties: {
          sort: buildEnum(sortData),
        },
      },
    })),
  },
})
