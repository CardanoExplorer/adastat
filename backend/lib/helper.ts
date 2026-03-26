import { networkParams } from '@/config.ts'
import logger from '@/logger.ts'
import type { HexString } from '@/types/shared.js'
import { bech32 } from 'bech32'

export const toBech32 = (prefix: string, hash: HexString) => {
  let bech32Str = ''

  try {
    const words = bech32.toWords(Buffer.from(hash.toString(), 'hex'))

    bech32Str = bech32.encode(prefix, words, 128)
  } catch (err) {
    logger.warn(err, 'Bech32 error')
  }

  return bech32Str
}

export const getEpochNo = (date?: number | string | Date) => {
  const timestamp = date ? new Date(date).getTime() : Date.now()

  return Math.trunc((timestamp / 1000 - networkParams.startTime) / networkParams.epochLength / networkParams.slotLength)
}

export const decodeCursor = (cursorString: string | undefined) => {
  return cursorString ? cursorString.split('-') : []
}

export const throwError = (statusCode: number): never => {
  throw Object.assign(new Error(), { statusCode })
}
