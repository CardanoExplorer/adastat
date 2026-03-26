import { item, list } from '@/controllers/gov-actions.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/gov-actions.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/gov_actions.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/gov_actions/:itemId(gov_action[a-z0-9]{60}|[a-fA-F0-9]{66}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap),
    handler: item,
  })
}) satisfies FastifyPluginAsync
