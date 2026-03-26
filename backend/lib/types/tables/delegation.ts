export default interface DelegationTable {
  id: bigint
  cert_index: number
  addr_id: bigint
  active_epoch_no: bigint
  slot_no: bigint
  tx_id: bigint
  redeemer_id: bigint | null
  pool_hash_id: bigint
}
