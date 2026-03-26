export default interface CommitteeDeRegistrationTable {
  voting_anchor_id: bigint | null
  cold_key_id: bigint
  cert_index: number
  id: bigint
  tx_id: bigint
}
