import { drep, pool, token } from '@/controllers/images.ts'
import type { FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.addHook('onResponse', (req, reply) => {
    reply.type('image/webp')
  })

  app.get('/images/pools/:itemId(pool[a-z0-9]{52}).webp', {
    handler: pool,
  })

  app.get('/images/tokens/:itemId(asset[a-z0-9]{39}).webp', {
    handler: token,
  })

  app.get('/images/dreps/:itemId(drep[a-z0-9]{54}).webp', {
    handler: drep,
  })
}) satisfies FastifyPluginAsync
