export default interface DelegationVoteTable {
  cert_index: number
  tx_id: bigint
  redeemer_id: bigint | null
  addr_id: bigint
  id: bigint
  drep_hash_id: bigint
}
