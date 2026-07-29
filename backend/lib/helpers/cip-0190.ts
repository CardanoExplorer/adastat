import type { HexString } from '@/types/shared.js'
import { reassembleLabel309Value } from '@cardanowall/poe-standard'
import { type Profile, verifyReportToDict, verifyResolved } from '@cardanowall/sdk-ts'

interface ExtractedLabel309Input {
  readonly txHash: HexString
  readonly cborHex: HexString
  readonly confirmationDepth: number
  readonly blockTime: number
  readonly blockSlot?: number
  readonly cardanoNetwork: 'mainnet' | 'preprod'
  readonly confirmationDepthThreshold?: number
  readonly profile?: Profile
  readonly fetchContent?: boolean
  readonly ciphertextBytesByItemIndex?: Readonly<Record<number, HexString>>
  readonly merkleLeavesByCommitIndex?: Readonly<Record<number, HexString>>
  readonly recipientSecretKeysHex?: ReadonlyArray<HexString>
  readonly passphrases?: ReadonlyArray<string>
  readonly extractedTxWitnessVkeysHex?: ReadonlyArray<HexString>
}

export const verifyExtractedLabel309 = async (input: ExtractedLabel309Input) => {
  const normalizedCborHex = input.cborHex
    .toLowerCase()
    .replace(/^(0x|\\x)/, '')
    .replace(/\s+/g, '')

  if (normalizedCborHex.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${normalizedCborHex.length}`)
  } else if (!/^[0-9a-f]*$/.test(normalizedCborHex)) {
    throw new Error('hex string contains non-hex characters')
  }

  const label309Value = new Uint8Array(normalizedCborHex.length / 2)

  for (let i = 0; i < label309Value.length; i++) {
    label309Value[i] = Number.parseInt(normalizedCborHex.slice(i * 2, i * 2 + 2), 16)
  }

  const reassembly = reassembleLabel309Value(label309Value)

  if (!reassembly.ok) {
    throw new Error(
      `Label 309 value could not be reassembled: ${reassembly.issue.code} at ${JSON.stringify(
        reassembly.issue.path
      )}: ${reassembly.issue.message}`
    )
  }

  const report = await verifyResolved({
    txHash: input.txHash,
    metadataCbor: reassembly.body,
    confirmationDepth: input.confirmationDepth,
    blockTime: input.blockTime,
    cardanoNetwork: input.cardanoNetwork,
    network: `cardano:${input.cardanoNetwork}`,
    profile: input.profile ?? 'sealed',
    fetchContent: input.fetchContent ?? false,
    ...(input.blockSlot !== undefined ? { blockSlot: input.blockSlot } : {}),
    ...(input.confirmationDepthThreshold !== undefined
      ? { confirmationDepthThreshold: input.confirmationDepthThreshold }
      : {}),
  })

  return verifyReportToDict(report)
}
