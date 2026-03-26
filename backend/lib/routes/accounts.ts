import { item, list } from '@/controllers/accounts.ts'
import { rowSortFieldMap, sortFieldMap } from '@/models/accounts.ts'
import { buildItemRowsSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/accounts.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/accounts/:itemId(stake[a-z0-9]{54}|stake_test[a-z0-9]{54}|[ef][01][a-fA-F0-9]{56}|[a-fA-F0-9]{56}).json', {
    schema: buildItemRowsSchema(rowSortFieldMap, {
      policy: { type: 'string', pattern: '^[a-fA-F0-9]{56}$' },
    }),
    handler: item,
  })
}) satisfies FastifyPluginAsync
