import dashboard from '@/controllers/dashboard.ts'
import { currency } from '@/schema.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.get('/dashboard.json', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          currency,
          account: { type: 'string', default: '' },
          drep: { type: 'string', default: '' },
          pool: { type: 'string', default: '' },
          token: { type: 'string', default: '' },
        },
        additionalProperties: false,
      },
    },
    handler: dashboard,
  })
}) satisfies FastifyPluginAsync
