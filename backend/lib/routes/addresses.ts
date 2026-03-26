import { item, list } from '@/controllers/addresses.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/addresses.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/addresses.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/addresses/:itemId(\\$?\\w{2,200}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap, {
      policy: { type: 'string', pattern: '^[a-fA-F0-9]{56}$' },
    }),
    handler: item,
  })
}) satisfies FastifyPluginAsync
