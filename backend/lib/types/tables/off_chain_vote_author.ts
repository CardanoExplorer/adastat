export default interface OffChainVoteAuthorTable {
  off_chain_vote_data_id: bigint
  public_key: string
  witness_algorithm: string
  warning: string | null
  signature: string
  id: bigint
  name: string | null
}
