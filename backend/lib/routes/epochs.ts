import { item, list } from '@/controllers/epochs.ts'
import { sortFieldMap as blockSortFieldMap } from '@/models/blocks.ts'
import { sortFieldMap } from '@/models/epochs.ts'
import { sortFieldMap as txSortFieldMap } from '@/models/transactions.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

const rowSortFieldMap = {
  blocks: blockSortFieldMap,
  transactions: txSortFieldMap,
}

export type RowSortFieldMap = typeof rowSortFieldMap

export default (async (app) => {
  app.get('/epochs.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/epochs/:itemId(0|[1-9]\\d*).json', {
    schema: {
      params: {
        type: 'object',
        properties: {
          itemId: { type: 'integer', minimum: 0 },
        },
      },
      ...buildItemRowsSchema(rowSortFieldMap),
    },
    handler: item,
  })
}) satisfies FastifyPluginAsync
