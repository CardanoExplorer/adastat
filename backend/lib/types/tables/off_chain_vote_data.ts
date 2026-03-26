export default interface OffChainVoteDataTable {
  id: bigint
  language: string
  warning: string | null
  json: any
  is_valid: boolean | null
  hash: Buffer
  comment: string | null
  bytes: Buffer
  voting_anchor_id: bigint
}
