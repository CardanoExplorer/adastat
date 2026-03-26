export default interface DrepRegistrationTable {
  drep_hash_id: bigint
  deposit: bigint | null
  cert_index: number
  id: bigint
  voting_anchor_id: bigint | null
  tx_id: bigint
}
