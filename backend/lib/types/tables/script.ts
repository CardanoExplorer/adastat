export default interface ScriptTable {
  type: 'multisig' | 'timelock' | 'plutusV1' | 'plutusV2' | 'plutusV3'
  tx_id: bigint
  serialised_size: number | null
  hash: Buffer
  id: bigint
  json: any | null
  bytes: Buffer | null
}
