import { rootDir } from '@/config.ts'
import { getDataFromUrl } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import type { AnyObject } from '@/types/shared.js'
import { bottts } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

const cacheTime = 60 * 60 * 1000 // 1 hour

const saveLogo = async (poolId: string, data: Buffer) => {
  await mkdir(logoDir, { recursive: true })

  await writeFile(join(logoDir, poolId + '.webp'), data, 'binary')
}

export const getLogo = async (poolId: string) => {
  try {
    return await readFile(join(logoDir, poolId + '.webp'))
  } catch (err) {
    if ((err as any)?.code !== 'ENOENT') {
      logger.error(err)
    }
  }
}

export const fetchLogo = async function (
  poolId: string,
  extendedData?: AnyObject,
  updateParams?: { poolId: bigint; updateId: bigint }
) {
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

  let logoUrl!: string

  if (typeof extendedData?.info?.url_png_icon_64x64 === 'string') {
    logoUrl = extendedData.info.url_png_icon_64x64.trim()
  }

  if (!logoUrl && typeof extendedData?.info?.url_png_logo === 'string') {
    logoUrl = extendedData.info.url_png_logo.trim()
  }

  if (logoUrl) {
    if (logoUrl.startsWith('https://github.com/')) {
      logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'raw=true'
    }

    const buffer = await getDataFromUrl(logoUrl, 5 * 1024 * 1024, 10)

    if (buffer) {
      try {
        const imageBuffer = await sharp(buffer, { limitInputPixels: 50_000_000 })
          .resize({ width: 64, height: 64, fit: 'inside', withoutEnlargement: true })
          .webp()
          .toBuffer()

        void saveLogo(poolId, imageBuffer)

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
      size: 64,
    })

    const imageBuffer = await sharp(Buffer.from(avatar.toString())).webp().toBuffer()

    void saveLogo(poolId, imageBuffer)

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
