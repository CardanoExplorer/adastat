import { allowedOrigins } from '@/config.ts'
import ipaddr from 'ipaddr.js'
import { AsyncLocalStorage } from 'node:async_hooks'
import { lookup } from 'node:dns'
import { isIP } from 'node:net'
import { Agent, DecoratorHandler, Dispatcher, interceptors, request } from 'undici'

const isIpValid = (ip: string) => {
  try {
    const ipAddr = ipaddr.parse(ip),
      range =
        ipAddr instanceof ipaddr.IPv6 && ipAddr.isIPv4MappedAddress() ? ipAddr.toIPv4Address().range() : ipAddr.range()

    return range === 'unicast'
  } catch {}

  return false
}

const allowedOriginContext = new AsyncLocalStorage<boolean>()

class MaxSizeHandler extends DecoratorHandler {
  received = 0

  readonly maxSize

  constructor(handler: Dispatcher.DispatchHandler, maxSize: number) {
    super(handler)

    this.maxSize = maxSize
  }

  onResponseData(controller: Dispatcher.DispatchController, chunk: Buffer): void {
    this.received += chunk.length

    if (this.received > this.maxSize) {
      throw new Error(`Response size (${this.received}) larger than maxSize (${this.maxSize})`)
    }

    // @ts-expect-error -- onResponseData
    return super.onResponseData?.(controller, chunk)
  }
}

const agent = new Agent({
  connect: {
    rejectUnauthorized: false,
    lookup: (hostname, options, callback) => {
      lookup(hostname, options, (err, address, family) => {
        if (!err && !allowedOriginContext.getStore()) {
          const lookupAddresses = typeof address === 'string' ? [{ address, family }] : address

          for (const lookupAddress of lookupAddresses) {
            if (!isIpValid(lookupAddress.address)) {
              err = new Error(`SSRF Blocked. Lookup IP: ${lookupAddress.address}`)

              break
            }
          }
        }

        callback(err, address, family)
      })
    },
  },
}).compose(interceptors.redirect({ maxRedirections: 5 }), (dispatch) => (opts, handler) => {
  try {
    const { maxSize = 0 } = opts as typeof opts & { maxSize: number },
      url = typeof opts.origin === 'string' ? new URL(opts.origin) : opts.origin!

    if (allowedOrigins.includes(url.origin.toLowerCase())) {
      return allowedOriginContext.run(true, () => dispatch(opts, new MaxSizeHandler(handler, maxSize)))
    }

    if (isIP(url.hostname) && !isIpValid(url.hostname)) {
      throw new Error(`SSRF Blocked. Direct IP: ${url.hostname}`)
    }

    return allowedOriginContext.run(false, () => dispatch(opts, new MaxSizeHandler(handler, maxSize)))
  } catch (err) {
    handler.onResponseError?.(null as any, err instanceof Error ? err : new Error())

    return false
  }
})

type ResponseMap = {
  bytes: Uint8Array
  json: any
  text: string
  arrayBuffer: ArrayBuffer
  blob: Blob
}

const fetchData = async <T extends keyof ResponseMap>(
  url: string,
  maxSize: number,
  timeout: number,
  type?: T
): Promise<false | undefined | ResponseMap[T]> => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    try {
      const { body, statusCode } = await request(url, {
        dispatcher: agent,
        maxSize: maxSize,
        signal: AbortSignal.timeout(timeout * 1_000),
      } as any)

      if (statusCode >= 200 && statusCode <= 203) {
        return (await body[type ?? 'bytes']()) as ResponseMap[T]
      }

      body.destroy()

      return
    } catch {}
  }

  return false
}

/**
 * @param url - URL
 * @param maxSize - Max content length in bytes
 * @param timeout - Request timeout in seconds
 */
export const fetchJson = async (url: string, maxSize = 1024 * 1024, timeout = 10) =>
  fetchData(url, maxSize, timeout, 'json')

/**
 * @param url - URL
 * @param maxSize - Max content length in bytes
 * @param timeout - Request timeout in seconds
 */
export const fetchBytes = async (url: string, maxSize = 1024 * 1024, timeout = 10) =>
  fetchData(url, maxSize, timeout, 'bytes')
