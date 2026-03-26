import search from '@/controllers/search.ts'
import { currency } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/search.json', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          currency,
          query: { type: 'string', default: '', minLength: 3, maxLength: 200 },
        },
        additionalProperties: false,
      },
    },
    handler: search,
  })
}) satisfies FastifyPluginAsync
