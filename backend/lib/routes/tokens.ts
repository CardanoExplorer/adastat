import { item, list } from '@/controllers/tokens.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/tokens.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/tokens.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/tokens/:itemId(asset[a-z0-9]{39}|[a-fA-F0-9]{56,120}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap),
    handler: item,
  })
}) satisfies FastifyPluginAsync
