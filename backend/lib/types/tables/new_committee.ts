export default interface NewCommitteeTable {
  added_members: string
  id: bigint
  quorum_numerator: bigint
  gov_action_proposal_id: bigint
  deleted_members: string
  quorum_denominator: bigint
}
