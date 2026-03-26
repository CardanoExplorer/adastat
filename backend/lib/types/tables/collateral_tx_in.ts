export default interface CollateralTxInTable {
  id: bigint
  tx_out_index: number
  tx_out_id: bigint
  tx_in_id: bigint
}
