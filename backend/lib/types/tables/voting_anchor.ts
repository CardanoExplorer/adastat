export default interface VotingAnchorTable {
  type: 'gov_action' | 'drep' | 'other' | 'vote' | 'committee_dereg' | 'constitution'
  data_hash: Buffer
  id: bigint
  url: string
  block_id: bigint
}
