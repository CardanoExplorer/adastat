import { fetchJson, isIpValid } from '@/helpers/url.ts'
import { type RequestListener, type Server, createServer } from 'node:http'
import type { Agent } from 'undici'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { config, agents } = vi.hoisted(() => ({
  config: {
    allowedOrigins: [] as string[],
    ipfsGateway: 'https://ipfs.invalid',
    arweaveGateway: 'https://arweave.invalid',
  },
  agents: [] as Agent[],
}))

vi.mock('@/config.ts', () => config)

// Use real HTTP requests and redirect handling, and retain the agent for cleanup.
vi.mock('undici', async (importOriginal) => {
  const original = await importOriginal<typeof import('undici')>()

  return {
    ...original,
    Agent: class extends original.Agent {
      constructor(options: Agent.Options) {
        super(options)
        agents.push(this)
      }
    },
  }
})

const servers: Server[] = []
const targetHandler = vi.fn<RequestListener>((_request, response) => {
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify({ reached: true }))
})

const listen = async (host: string, handler: RequestListener) => {
  const server = createServer(handler)
  servers.push(server)

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, host, resolve)
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Expected a TCP address')
  }

  return `http://${host.includes(':') ? `[${host}]` : host}:${address.port}`
}

let ipv4Origin: string, ipv6Origin: string, trustedOrigin: string, redirectTarget: string

beforeAll(async () => {
  ipv4Origin = await listen('127.0.0.1', targetHandler)
  ipv6Origin = await listen('::1', targetHandler)
  trustedOrigin = await listen('127.0.0.1', (request, response) => {
    if (request.url === '/ok') {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ allowed: true }))
    } else {
      response.writeHead(302, { location: redirectTarget })
      response.end()
    }
  })
})

beforeEach(() => {
  config.allowedOrigins.length = 0
  targetHandler.mockClear()
})

afterAll(async () => {
  await Promise.all(agents.map((agent) => agent.destroy()))
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()))
        })
    )
  )
})

const privateOrigins = [
  ['IPv4 loopback', () => ipv4Origin],
  ['IPv6 loopback', () => ipv6Origin],
  ['IPv4-mapped IPv6 loopback', () => ipv4Origin.replace('127.0.0.1', '[::ffff:127.0.0.1]')],
  ['DNS resolving to loopback', () => ipv4Origin.replace('127.0.0.1', 'localhost')],
] as const

describe('metadata request SSRF protection', () => {
  it.each(privateOrigins)('blocks direct requests to %s', async (_name, origin) => {
    await expect(fetchJson(origin(), 1024, 2)).resolves.toBe(false)
    expect(targetHandler).not.toHaveBeenCalled()
  })

  it.each(privateOrigins)('blocks redirects from an allowed origin to %s', async (_name, origin) => {
    config.allowedOrigins.push(trustedOrigin)
    redirectTarget = origin()

    await expect(fetchJson(trustedOrigin, 1024, 2)).resolves.toBe(false)
    expect(targetHandler).not.toHaveBeenCalled()
  })

  it('allows an explicitly trusted origin', async () => {
    config.allowedOrigins.push(trustedOrigin)

    await expect(fetchJson(`${trustedOrigin}/ok`, 1024, 2)).resolves.toEqual({ allowed: true })
  })

  it('allows redirects whose destination is also trusted', async () => {
    config.allowedOrigins.push(trustedOrigin, ipv4Origin)
    redirectTarget = ipv4Origin

    await expect(fetchJson(trustedOrigin, 1024, 2)).resolves.toEqual({ reached: true })
    expect(targetHandler).toHaveBeenCalledOnce()
  })

  it('keeps the response size limit after a redirect', async () => {
    config.allowedOrigins.push(trustedOrigin, ipv4Origin)
    redirectTarget = ipv4Origin

    await expect(fetchJson(trustedOrigin, 4, 2)).resolves.toBe(false)
  })
})

describe('IP address classification', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1'])(
    'rejects non-public address %s',
    (ip) => {
      expect(isIpValid(ip)).toBe(false)
    }
  )

  it.each(['8.8.8.8', '2606:4700:4700::1111'])('accepts public address %s without fetching it', (ip) => {
    expect(isIpValid(ip)).toBe(true)
  })
})
