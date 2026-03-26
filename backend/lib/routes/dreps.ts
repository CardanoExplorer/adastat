import { item, list } from '@/controllers/dreps.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/dreps.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/dreps.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get(
    '/dreps/:itemId(drep[a-z0-9]{52}|drep[a-z0-9]{54}|drep_always_abstain|drep_always_no_confidence|2[23][a-fA-F0-9]{56}).json',
    {
      schema: buildItemRowsSchema(rowSortFieldMap),
      handler: item,
    }
  )
}) satisfies FastifyPluginAsync
