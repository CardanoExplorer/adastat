import logger from '@/logger.ts'
import type { HexString } from '@/types/shared.js'
import os from 'node:os'
import { dirname } from 'node:path'
import { loadEnvFile } from 'node:process'

const { username } = os.userInfo()

export const rootDir = dirname(import.meta.dirname)

export const serverHost = process.env.HOST || 'localhost'

export const serverPort = Number(process.env.PORT) || 7828

export const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split('|').map((str) => str.trim().toLowerCase())

export const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.blockfrost.dev'

export const arweaveGateway = process.env.ARWEAVE_GATEWAY || 'https://arweave.net'

export const primaryDB = {
  user: process.env.DB_USER || username,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || username,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT!) || 5432,
}

export const secondaryDB = {
  user: process.env.SECONDARY_DB_USER || primaryDB.user,
  password: process.env.SECONDARY_DB_PASSWORD || primaryDB.password,
  database: process.env.SECONDARY_DB_NAME || primaryDB.database,
  host: process.env.SECONDARY_DB_HOST || primaryDB.host,
  port: parseInt(process.env.SECONDARY_DB_PORT!) || primaryDB.port,
}

const parseByronSizeLimits = (value = '[]') => {
  const entries: unknown = JSON.parse(value)
  if (!Array.isArray(entries)) {
    throw new Error('NETWORK_BYRON_SIZE_LIMITS must be an array')
  }

  const epochs: number[] = [],
    blockSizes: number[] = [],
    txSizes: number[] = []
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 3 || !entry.every((n) => Number.isInteger(n) && n <= 2_147_483_647)) {
      throw new Error('Expected three integers per NETWORK_BYRON_SIZE_LIMITS entry')
    }
    const [epoch, blockSize, txSize] = entry
    if (epoch <= (epochs.at(-1) ?? -1) || blockSize <= 0 || txSize <= 0) {
      throw new Error('NETWORK_BYRON_SIZE_LIMITS requires ascending nonnegative epochs and positive byte limits')
    }
    epochs.push(epoch)
    blockSizes.push(blockSize)
    txSizes.push(txSize)
  }
  return { epochs, blockSizes, txSizes }
}

export type NetworkParams = {
  name: string
  isMainnet: boolean
  startTime: number
  totalSupply: bigint
  epochLength: number
  slotLength: number
  activeSlotsCoeff: number
  byronSizeLimits: ReturnType<typeof parseByronSizeLimits>
  shelley: number
  mary: number
  alonzo: number
  chang: number
  mithrilAggregator: string
  magic: number
  genesisHash: HexString
  genesisTxs: number
  firstBlockNo: number
  firstTxHash: HexString
}

export const networkParams: NetworkParams = {
  name: '',
  isMainnet: false,
  startTime: 0,
  totalSupply: 0n,
  epochLength: 0,
  slotLength: 0,
  activeSlotsCoeff: 0,
  byronSizeLimits: parseByronSizeLimits(),
  shelley: 0,
  mary: 0,
  alonzo: 0,
  chang: 0,
  mithrilAggregator: '',
  magic: 0,
  genesisHash: '',
  genesisTxs: 0,
  firstBlockNo: 0,
  firstTxHash: '',
}

export const loadNetworkEnv = (
  name: string,
  startTime: number,
  genesisHash: string,
  genesisTxs: bigint,
  firstBlockNo: number,
  firstTxHash: HexString
) => {
  try {
    loadEnvFile(`./.env.${name}`)

    const networkEnv: NetworkParams = {
      name: name,
      isMainnet: name === 'mainnet',
      startTime: startTime,
      totalSupply: BigInt(process.env.NETWORK_TOTAL_SUPPLY!.replace(/_/g, '')),
      epochLength: Number(process.env.NETWORK_EPOCH_LENGTH!.replace(/_/g, '')),
      slotLength: Number(process.env.NETWORK_SLOT_LENGTH!.replace(/_/g, '')),
      activeSlotsCoeff: Number(process.env.NETWORK_ACTIVE_SLOTS_COEFF!.replace(/_/g, '')),
      byronSizeLimits: parseByronSizeLimits(process.env.NETWORK_BYRON_SIZE_LIMITS),
      shelley: Number(process.env.NETWORK_SHELLEY_EPOCH!.replace(/_/g, '')),
      mary: Number(process.env.NETWORK_MARY_EPOCH!.replace(/_/g, '')),
      alonzo: Number(process.env.NETWORK_ALONZO_EPOCH!.replace(/_/g, '')),
      chang: Number(process.env.NETWORK_CHANG_EPOCH!.replace(/_/g, '')),
      mithrilAggregator: process.env.NETWORK_MITHRIL_AGGREGATOR!,
      magic: Number(process.env.NETWORK_MAGIC!.replace(/_/g, '')),
      genesisHash: genesisHash,
      genesisTxs: Number(genesisTxs),
      firstBlockNo: firstBlockNo,
      firstTxHash: firstTxHash,
    }

    Object.assign(networkParams, networkEnv)
  } catch (err) {
    logger.fatal(err)
  }
}
