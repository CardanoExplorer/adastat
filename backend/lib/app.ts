import { allowedOrigins, serverHost, serverPort } from '@/config.ts'
import { listenToNewBlock } from '@/db.ts'
import { init as initDReps } from '@/helpers/dreps.ts'
import { init as initGovActions } from '@/helpers/gov-actions.ts'
import { init as initMaxMind } from '@/helpers/maxmind.ts'
import { init as initMithrilSigners } from '@/helpers/mithril-signers.ts'
import { init as initTokenRegistry } from '@/helpers/tokens.ts'
import logger from '@/logger.ts'
import router from '@/router.ts'
import type { QueryString } from '@/schema.ts'
import { getTip, handleQueue, init as initStorage } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'
import websocket from '@fastify/websocket'
import fastify, { type FastifyRequest } from 'fastify'

;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}

let shutdownTimeout: NodeJS.Timeout, latestRequestTime: number

const app = fastify(),
  activeRequests = new Map<FastifyRequest, number>()

const shutdown = () => {
  process.exit(0)
}

export const start = async () => {
  logger.info(`Starting server`)

  await initStorage()

  logger.info('Init Storage: [✓]')

  await initMaxMind()

  logger.info('Init MaxMind: [✓]')

  await initTokenRegistry()

  logger.info('Init Token Registry: [✓]')

  await initMithrilSigners()

  logger.info('Init Mithril Signers: [✓]')

  await initDReps()

  logger.info('Init DReps: [✓]')

  await initGovActions()

  logger.info('Init Gov Actions: [✓]')

  const completeRequest = (req: FastifyRequest): void => {
    activeRequests.delete(req)

    if (shutdownTimeout && activeRequests.size === 0) {
      shutdown()
    }
  }

  app.addHook('onRequest', (req, rep, done) => {
    latestRequestTime = Date.now()

    activeRequests.set(req, latestRequestTime)

    done()
  })

  app.addHook('onResponse', (req, rep, done) => {
    completeRequest(req)
    done()
  })

  app.addHook('onRequestAbort', (req, done) => {
    completeRequest(req)
    done()
  })

  app.addHook('onTimeout', (req, rep, done) => {
    completeRequest(req)
    done()
  })

  app.addHook(
    'preSerialization',
    async (req: FastifyRequest<{ Querystring: QueryString }>, rep, payload: AnyObject) => {
      return {
        ...payload,
        tip: rep.statusCode === 200 ? getTip(req.query.currency) : undefined,
        code: rep.statusCode,
      }
    }
  )

  app.addHook('onSend', async (req, rep, payload: string) => {
    rep.header('x-decompressed-content-length', Buffer.byteLength(payload, 'utf8'))

    return payload
  })

  const errorMessages = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }

  app.setNotFoundHandler((req, rep) => {
    const code = 400,
      error = errorMessages[code]

    rep.code(code).send({ error })
  })

  app.setErrorHandler((err: any, req, rep) => {
    const code = errorMessages[err?.statusCode as keyof typeof errorMessages] ? err.statusCode : 500,
      error = errorMessages[code as keyof typeof errorMessages]

    rep.code(code).send({ error, message: err?.validation })
  })

  app.register(websocket, {
    options: {
      maxPayload: 256,
    },
  })

  app.register(router)

  app.get(
    '/socket',
    {
      websocket: true,
      preValidation: (req, rep) => {
        const origin = req.headers.origin

        if (!origin || !allowedOrigins.includes(origin)) {
          const code = 403,
            error = errorMessages[code]

          rep.code(code).send({ error })
        }
      },
    },
    (ws) => {
      ws.send(JSON.stringify(getTip()))
    }
  )

  app
    .listen({
      host: serverHost,
      port: serverPort,
    })
    .then((address) => {
      logger.info(`Server listening on ${address}`)

      process.send?.('ready')
    })
    .catch((err) => {
      logger.fatal(err, `Error starting server`)

      process.exit(1)
    })

  void listenToNewBlock(async (block) => {
    if (await handleQueue(block)) {
      let clientQty = 0

      const tip = getTip(),
        tipJson = JSON.stringify(tip)

      for (const client of app.websocketServer.clients) {
        if (client.readyState === 1) {
          client.send(tipJson)

          clientQty++
        }
      }

      logger.debug('Block %d, clients %d', tip.block_no, clientQty)

      void initMaxMind()

      void initTokenRegistry()

      void initMithrilSigners()

      void initDReps()

      void initGovActions()
    }
  })

  process.on('exit', () => {
    logger.info(`Server shutdown`)
  })

  process.on('SIGTERM', () => {
    const timeoutLeft = latestRequestTime - Date.now() + 60_000

    void app.close()

    if (timeoutLeft > 0 && activeRequests.size > 0) {
      shutdownTimeout = setTimeout(shutdown, timeoutLeft)
    } else {
      shutdown()
    }
  })

  process.on('uncaughtException', function (err) {
    logger.fatal(err, 'Uncaught exception')

    process.exit(1)
  })
}
