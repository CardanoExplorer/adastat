export default interface TxInTable {
  tx_in_id: bigint
  tx_out_index: number
  redeemer_id: bigint | null
  id: bigint
  tx_out_id: bigint
}
