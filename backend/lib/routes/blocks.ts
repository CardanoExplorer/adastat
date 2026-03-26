import { item, list } from '@/controllers/blocks.ts'
import { sortFieldMap } from '@/models/blocks.ts'
import { buildItemSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/blocks.json', {
    schema: buildListSchema(sortFieldMap),
    handler: list,
  })

  app.get('/blocks/:itemId([1-9]\\d*|0|[a-fA-F0-9]{64}|genesis).json', {
    schema: {
      params: {
        type: 'object',
        properties: {
          itemId: {
            anyOf: [{ type: 'integer', minimum: 0 }, { type: 'string' }],
          },
        },
      },
      ...buildItemSchema(),
    },
    handler: item,
  })
}) satisfies FastifyPluginAsync
