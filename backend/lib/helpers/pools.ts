import { rootDir } from '@/config.ts'
import { convertImage, loadImage, resolveImage, saveImage } from '@/helpers/images.ts'
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
