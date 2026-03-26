import { item, list } from '@/controllers/policies.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/policies.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/policies.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/policies/:itemId([a-fA-F0-9]{56}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap),
    handler: item,
  })
}) satisfies FastifyPluginAsync
