import { networkParams } from '@/config.ts'
import logger from '@/logger.ts'
import type { HexString } from '@/types/shared.js'
import { bech32 } from 'bech32'
import blake2b from 'blake2b'

export const toBech32 = (prefix: string, input: HexString | Buffer) => {
  try {
    const words = bech32.toWords(typeof input === 'string' ? Buffer.from(input, 'hex') : input)

    return bech32.encode(prefix, words, 128)
  } catch (err) {
    logger.warn(err, 'Bech32 error')

    return ''
  }
}

export const blake2bHash = (input: HexString | Buffer, length = 32) => {
  const hash = Buffer.alloc(length)

  try {
    blake2b(length)
      .update(typeof input === 'string' ? Buffer.from(input, 'hex') : input)
      .digest(hash)
  } catch (err) {
    logger.warn(err, 'Blake2b error')
  }

  return hash
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
