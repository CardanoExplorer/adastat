import { pingNode } from './ouroboros.ts'
import { rootDir } from '@/config.ts'
import { convertImage, loadImage, resolveImage, saveImage } from '@/helpers/images.ts'
import { getASN, getCountry } from '@/helpers/maxmind.ts'
import { isIpValid } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import type { AnyObject } from '@/types/shared.js'
import type { PoolRelayTable } from '@/types/tables.ts'
import { bottts } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { resolve as resolveHost, resolveSrv } from 'node:dns/promises'
import { isIP } from 'node:net'
import { join } from 'node:path'
import sharp from 'sharp'

const logoDir = process.env.POOL_LOGO_DIR || join(rootDir, 'images', 'pools')

const logoCache = new Map<
  bigint,
  {
    updateId: bigint
    time: number
  }
>()

type Relay = {
  host: string | null
  ip: string | null
  port: number | null
  asn: string | null
  country: string | null
  status: 'checking' | 'online' | 'offline' | 'unknown'
  version: number | null
}

type RelayCacheEntry = {
  updateId: bigint
  time: number
  relays: Relay[]
  resolved: boolean
  checking: boolean
}

const relayCache = new Map<bigint, RelayCacheEntry>()

const logoCacheTime = 60 * 60 * 1000, // 1 hour
  relayCacheTime = 5 * 60 * 1000 // 5 minutes

const logoKeys = ['url_png_icon_256x256', 'url_png_icon_128x128', 'url_png_icon_64x64', 'url_png_logo']

export const getLogo = (poolId: string) => loadImage(poolId, logoDir)

export const fetchLogo = async (
  poolId: string,
  extendedData?: AnyObject,
  updateParams?: { poolId: bigint; updateId: bigint }
) => {
  if (updateParams) {
    const nowTime = Date.now(),
      cacheEntry = logoCache.get(updateParams.poolId)

    if (cacheEntry) {
      if (cacheEntry.updateId >= updateParams.updateId && cacheEntry.time + logoCacheTime >= nowTime) {
        return
      }
    }

    logoCache.set(updateParams.poolId, {
      updateId: updateParams.updateId,
      time: nowTime,
    })
  }

  let logoUrl!: string

  for (const key of logoKeys) {
    if (typeof extendedData?.info?.[key] === 'string') {
      logoUrl = extendedData.info[key].trim()
  }

    if (logoUrl) {
      break
    }
  }

  if (logoUrl) {
    const bytes = await resolveImage(logoUrl)

    if (bytes) {
      try {
        const imageBuffer = await convertImage(bytes, 256)

        void saveImage(poolId, logoDir, imageBuffer)

        return imageBuffer
      } catch (err) {
        logger.error(err, `Pool ${poolId} logo error`)
      }
    }
  }

  return false
}

export const createLogo = async (poolId: string) => {
  try {
    const avatar = createAvatar(bottts, {
      seed: poolId,
      size: 256,
    })

    const imageBuffer = await convertImage(Buffer.from(avatar.toString()))

    void saveImage(poolId, logoDir, imageBuffer)

    return imageBuffer
  } catch (err) {
    logger.error(err, `Pool ${poolId} avatar error`)
  }
}

export type AprPeriod = 0 | 1 | 2 | 3 | 6 | 18 | 36 | 73

export type PoolApr = {
  data: Map<AprPeriod, { apr: number; luck: number }>
  ratio: Map<number, number>
  luck: Map<number, number>
  fees: bigint
  rewards: bigint
  holders: number
  blockProbability: { k: number; v: number }[]
}

export const aprPeriods = [0, 1, 2, 3, 6, 18, 36, 73] as const

export const getPoolApr = () => {
  const poolApr: PoolApr = {
    data: new Map(),
    ratio: new Map(),
    luck: new Map(),
    fees: 0n,
    rewards: 0n,
    holders: 0,
    blockProbability: [],
  }

  for (const aprPeriod of aprPeriods) {
    poolApr.data.set(aprPeriod, {
      apr: 0,
      luck: 0,
    })
  }

  return poolApr
}

export type RelayRow = Pick<PoolRelayTable, 'ipv4' | 'ipv6' | 'dns_name' | 'dns_srv_name' | 'port'>

const resolveSingleHost = async (host: string) => {
  const names = new Set<string>()
  try {
    for (const name of await resolveHost(host)) {
      names.add(name)
    }
  } catch {}

  return names.values()
}

const resolveMultiHost = async (host: string) => {
  const records = new Map<string, { name: string; port: number }>()

  try {
    for (const { name, port } of await resolveSrv(host)) {
      records.set(`${name}:${port}`, { name, port })
    }
  } catch {}

  return records.values()
}

const checkRelays = async (cacheEntry: RelayCacheEntry) => {
  if (!cacheEntry.checking) {
    cacheEntry.checking = true

    if (!cacheEntry.resolved) {
      const relayMap = new Map<string, Relay>()

      for (const relay of cacheEntry.relays) {
        let relayKey = `${relay.ip}:${relay.port}`

        if (relay.host) {
          relayKey = `${relay.host}:${relay.port}`

          const relays = relay.port ? [{ name: relay.host, port: relay.port }] : await resolveMultiHost(relay.host)

          for (const { name, port } of relays) {
            const ips = isIP(name) ? [name] : await resolveSingleHost(name)

            for (const ip of ips) {
              relayMap.set(`${ip}:${port}`, {
                host: ip !== name ? name : relay.host,
                ip: ip,
                port: port,
                asn: getASN(ip),
                country: getCountry(ip),
                status: 'checking',
                version: null,
              })

              relayKey = ''
            }
          }
        }

        if (relayKey) {
          relayMap.set(relayKey, relay)
        }
      }

      cacheEntry.relays = [...relayMap.values()]

      cacheEntry.resolved = true
    }

    const checkPromises = cacheEntry.relays.map(async (relay) => {
      relay.version = null

      if (relay.ip && relay.port && isIpValid(relay.ip)) {
        const res = await pingNode(relay.ip, relay.port)

        if (res.alive) {
          relay.status = 'online'
          relay.version = res.version
        } else {
          relay.status = 'offline'
        }
      } else {
        relay.status = 'unknown'
      }
    })

    await Promise.all(checkPromises)

    cacheEntry.checking = false
  }
}

export const resolveRelays = (poolId: bigint, relayRows: RelayRow[], latestUpdateId: bigint) => {
  const nowTime = Date.now(),
    cacheEntry = relayCache.get(poolId) || relayCache.set(poolId, {} as RelayCacheEntry).get(poolId)!

  if (cacheEntry.updateId !== latestUpdateId) {
    cacheEntry.updateId = latestUpdateId
    cacheEntry.time = 0
    cacheEntry.relays = []
    cacheEntry.resolved = false

    for (const { ipv4, ipv6, dns_name, dns_srv_name, port } of relayRows) {
      const ip =
        ipv4 ||
        ipv6 ||
        (dns_name && isIP(dns_name) ? dns_name : dns_srv_name && isIP(dns_srv_name) ? dns_srv_name : null)

      cacheEntry.relays.push({
        host: ip ? null : dns_name || dns_srv_name,
        ip: ip,
        port: port,
        asn: ip ? getASN(ip) : null,
        country: ip ? getCountry(ip) : null,
        status: 'checking',
        version: null,
      })
    }
  }

  if (cacheEntry.time + relayCacheTime < nowTime) {
    cacheEntry.time = nowTime

    void checkRelays(cacheEntry)
  }

  return cacheEntry
}
