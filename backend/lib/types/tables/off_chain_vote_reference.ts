export default interface OffChainVoteReferenceTable {
  off_chain_vote_data_id: bigint
  uri: string
  id: bigint
  label: string
  hash_digest: string | null
  hash_algorithm: string | null
}
