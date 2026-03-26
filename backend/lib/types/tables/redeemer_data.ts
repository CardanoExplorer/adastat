export default interface RedeemerDataTable {
  id: bigint
  hash: Buffer
  tx_id: bigint
  value: any | null
  bytes: Buffer
}
