export default interface TxMetadataTable {
  json: any | null
  key: `${number}`
  id: bigint
  tx_id: bigint
  bytes: Buffer
}
