import { item, list } from '@/controllers/polls.ts'
import { buildItemSchema, buildListSchema } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/polls.json', {
    schema: buildListSchema({}),
    handler: list,
  })

  app.get('/polls/:itemId([a-fA-F0-9]{64}).json', {
    schema: buildItemSchema(),
    handler: item,
  })
}) satisfies FastifyPluginAsync
