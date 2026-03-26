import { rootDir } from '@/config.ts'
import { getDataFromUrl } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import type { AnyObject, HexString } from '@/types/shared.js'
import { bottts } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

const logoDir = process.env.POOL_LOGO_DIR || join(rootDir, 'images', 'pools')

const logoCache = new Map<
  bigint,
  {
    updateId: bigint
    time: number
  }
>()

const cacheTime = 60 * 60 * 1000 // 1 hour

await mkdir(logoDir, { recursive: true })

export const fetchLogo = async function (
  hash: HexString,
  extendedData: AnyObject,
  updateParams?: { poolId: bigint; updateId: bigint }
): Promise<boolean | undefined> {
  if (updateParams) {
    const nowTime = Date.now(),
      cacheEntry = logoCache.get(updateParams.poolId)

    if (cacheEntry) {
      if (cacheEntry.updateId >= updateParams.updateId && cacheEntry.time + cacheTime >= nowTime) {
        return
      }
    }

    logoCache.set(updateParams.poolId, {
      updateId: updateParams.updateId,
      time: nowTime,
    })
  }

  if (extendedData?.info && typeof extendedData.info === 'object') {
    let logoUrl = String(
      extendedData.info.url_png_logo ||
        extendedData.info.url_png_icon ||
        extendedData.info.url_png_icon_64x64 ||
        extendedData.info.url_png_logo_64x64
    ).trim()

    if (logoUrl.startsWith('https://github.com/')) {
      logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'raw=true'
    }

    if (logoUrl) {
      const buffer = await getDataFromUrl(logoUrl)

      if (buffer) {
        try {
          await sharp(buffer, { limitInputPixels: 12_000_000 })
            .resize({ width: 96, height: 96, fit: 'contain' })
            .webp()
            .toFile(join(logoDir, hash + '.webp'))

          return true
        } catch (err) {
          logger.error(err, `Pool ${hash} logo error`)
        }
      }
    }
  }

  return false
}

export const createLogo = (hash: HexString): sharp.Sharp | undefined => {
  try {
    const avatar = createAvatar(bottts, {
      seed: hash,
      size: 96,
    })

    return sharp(Buffer.from(avatar.toString())).webp()
  } catch (err) {
    logger.error(err, `Pool ${hash} avatar error`)
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
