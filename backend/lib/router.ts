import accounts from '@/routes/accounts.ts'
import addresses from '@/routes/addresses.ts'
import blocks from '@/routes/blocks.ts'
import dashboard from '@/routes/dashboard.ts'
import dreps from '@/routes/dreps.ts'
import epochs from '@/routes/epochs.ts'
import govActions from '@/routes/gov-actions.ts'
import images from '@/routes/images.ts'
import policies from '@/routes/policies.ts'
import polls from '@/routes/polls.ts'
import pools from '@/routes/pools.ts'
import search from '@/routes/search.ts'
import tokens from '@/routes/tokens.ts'
import transactions from '@/routes/transactions.ts'
import { type FastifyPluginAsync } from 'fastify'

export default (async (app) => {
  app.register(accounts)
  app.register(addresses)
  app.register(blocks)
  app.register(dashboard)
  app.register(dreps)
  app.register(epochs)
  app.register(govActions)
  app.register(images)
  app.register(policies)
  app.register(polls)
  app.register(pools)
  app.register(search)
  app.register(tokens)
  app.register(transactions)
}) satisfies FastifyPluginAsync
