export default interface VotingProcedureTable {
  voter_role: 'ConstitutionalCommittee' | 'DRep' | 'SPO'
  pool_voter: bigint | null
  committee_voter: bigint | null
  id: bigint
  gov_action_proposal_id: bigint
  vote: 'Yes' | 'No' | 'Abstain'
  drep_voter: bigint | null
  voting_anchor_id: bigint | null
  index: number
  invalid: bigint | null
  tx_id: bigint
}
