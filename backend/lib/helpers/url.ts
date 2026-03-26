import { allowedOrigins } from '@/config.ts'
import logger from '@/logger.ts'
import axios from 'axios'
import ipaddr from 'ipaddr.js'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

const unsafeRanges = [
  'loopback', // 127.0.0.1, ::1
  'private', // 10.x.x.x, 192.168.x.x, 172.16.x.x
  'linkLocal', // 169.254.x.x (AWS metadata!), fe80::
  'uniqueLocal', // fc00::/7 (IPv6 private)
  'carrierGradeNat', // 100.64.0.0/10
  'unspecified', // 0.0.0.0
  'broadcast', // 255.255.255.255
  'multicast', // 224.x.x.x
  'reserved', // 240.x.x.x (Class E)
  'amt',
  'teredo',
  '6to4',
  'benchmarking', // 198.18.x.x
  'documentation', // 192.0.2.x (TEST-NET)
]

const isIpValid = (ip: string) => {
  try {
    const ipAddr = ipaddr.parse(ip),
      range =
        ipAddr instanceof ipaddr.IPv6 && ipAddr.isIPv4MappedAddress() ? ipAddr.toIPv4Address().range() : ipAddr.range()

    return !unsafeRanges.includes(range)
  } catch {}

  return false
}

const createAgent = (url: string) => {
  try {
    const parsedUrl = new URL(url)

    if (['http:', 'https:'].includes(parsedUrl.protocol)) {
      let ip: string

      const getCreateConnection = (
        originalCreateConnection: typeof httpAgent.createConnection | typeof httpsAgent.createConnection
      ) => {
        return (...args: Parameters<typeof httpAgentCreateConnection>) => {
          const socket = originalCreateConnection(...args)

          if (socket instanceof net.Socket) {
            const handle = () => {
              ip = socket.remoteAddress!
            }

            if (socket.connecting) {
              socket.once('connect', handle)
            } else {
              handle()
            }
          }

          return socket
        }
      }

      const httpAgent = new http.Agent(),
        httpsAgent = new https.Agent({ rejectUnauthorized: false })

      const httpAgentCreateConnection = httpAgent.createConnection.bind(httpAgent),
        httpsAgentCreateConnection = httpsAgent.createConnection.bind(httpsAgent)

      httpAgent.createConnection = getCreateConnection(httpAgentCreateConnection)
      httpsAgent.createConnection = getCreateConnection(httpsAgentCreateConnection)

      return {
        http: httpAgent,
        https: httpsAgent,
        get ip() {
          return ip
        },
      }
    }
  } catch {}
}

/**
 * @param url - URL
 * @param maxSize - Max content length in bytes
 * @param timeout - Request timeout in seconds
 */
export const getDataFromUrl = async (
  url: string,
  maxSize = 1024 * 1024,
  timeout = 10
): Promise<false | undefined | ArrayBuffer> => {
  const agent = createAgent(url)

  if (agent) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: timeout * 1000,
        maxContentLength: maxSize,
        headers: {
          Pragma: 'no-cache',
          DNT: '1',
          'Cache-Control': 'no-cache',
          'User-Agent': 'AdaStat Crawler',
        },
        httpAgent: agent.http,
        httpsAgent: agent.https,
        validateStatus: (status) => status === 200,
      })

      if (!isIpValid(agent.ip)) {
        const parsedUrl = new URL(response.request?.res?.responseUrl || response.config?.url || url)

        if (!allowedOrigins.includes(parsedUrl.origin.toLowerCase())) {
          return false
        }
      }

      return response.data.length <= maxSize ? response.data : false
    } catch (err) {
      logger.error(err, `URL ${url} fetch error`)
      return
    }
  }

  return false
}
