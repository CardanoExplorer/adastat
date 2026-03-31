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

let shutdownTimeout: NodeJS.Timeout, maxRequestEndTime: number

const app = fastify(),
  activeRequests = new Map<
    FastifyRequest,
    {
      maxEndTime: number
      prevEndTime: number
    }
  >()

const shutdown = (isErr = false) => {
  logger.info(`Server stopped`)

  process.exit(Number(isErr))
}

const completeRequest = async (req: FastifyRequest) => {
  const activeRequest = activeRequests.get(req)

  if (activeRequest?.maxEndTime === maxRequestEndTime) {
    maxRequestEndTime = activeRequest.prevEndTime
  }

  activeRequests.delete(req)

  if (shutdownTimeout && activeRequests.size === 0) {
    shutdown()
  }
}

export const start = async () => {
  logger.info(`Starting server`)

  await initStorage()

  logger.debug('Storage initialized')

  await initMaxMind()

  logger.debug('MaxMind initialized')

  await initTokenRegistry()

  logger.debug('Token Registry initialized')

  await initMithrilSigners()

  logger.debug('Mithril Signers initialized')

  await initDReps()

  logger.debug('DReps initialized')

  await initGovActions()

  logger.debug('Gov Actions initialized')

  app.addHook('onRequest', async (req, rep) => {
    if (shutdownTimeout) {
      rep.header('connection', 'close')
    } else if (req.headers.upgrade !== 'websocket') {
      const activeRequest = {
        maxEndTime: Date.now() + 60_000,
        prevEndTime: maxRequestEndTime,
      }

      activeRequests.set(req, activeRequest)

      maxRequestEndTime = activeRequest.maxEndTime
    }
  })

  app.addHook('onResponse', completeRequest)

  app.addHook('onRequestAbort', completeRequest)

  app.addHook('onTimeout', completeRequest)

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

  app.register(async () => {
    app.get(
      '/socket',
      {
        websocket: true,
        preValidation: async (req, rep) => {
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
  })

  app.register(router)

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
      logger.fatal(err, 'Error starting server')

      shutdown(true)
    })

  void listenToNewBlock(async (block) => {
    if (await handleQueue(block)) {
      if (app.websocketServer.clients.size) {
        const tipJson = JSON.stringify(getTip())

        for (const client of app.websocketServer.clients) {
          if (client.readyState === 1) {
            client.send(tipJson)
          }
        }
      }

      logger.debug('Block %d, clients %d', block.block_no, app.websocketServer.clients.size)

      void initMaxMind()

      void initTokenRegistry()

      void initMithrilSigners()

      void initDReps()

      void initGovActions()
    }
  })

  process.on('SIGTERM', () => {
    const timeoutLeft = maxRequestEndTime - Date.now()

    void app.close()

    if (timeoutLeft > 0 && activeRequests.size > 0) {
      logger.info(`Shutting down server`)

      logger.debug('Time left: %s', timeoutLeft)
      logger.debug('Active requests: %s', activeRequests.size)

      shutdownTimeout = setTimeout(shutdown, timeoutLeft)
    } else {
      shutdown()
    }
  })

  process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught exception')

    shutdown(true)
  })
}
