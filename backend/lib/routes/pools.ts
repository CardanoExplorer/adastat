import { item, list } from '@/controllers/pools.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/pools.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/pools.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/pools/:itemId(pool[a-z0-9]{52}|[a-fA-F0-9]{56}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap),
    handler: item,
  })
}) satisfies FastifyPluginAsync
