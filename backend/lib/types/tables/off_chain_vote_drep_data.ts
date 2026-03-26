export default interface OffChainVoteDrepDataTable {
  objectives: string | null
  id: bigint
  qualifications: string | null
  given_name: string
  image_url: string | null
  payment_address: string | null
  motivations: string | null
  off_chain_vote_data_id: bigint
  image_hash: string | null
}
