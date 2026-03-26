import { item, list } from '@/controllers/transactions.ts'
import { sortFieldMap } from '@/models/transactions.ts'
import { buildItemSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/transactions.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/transactions/:itemId([a-fA-F0-9]{64}).json', {
    schema: buildItemSchema(),
    handler: item,
  })
}) satisfies FastifyPluginAsync
