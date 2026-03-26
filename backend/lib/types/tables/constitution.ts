export default interface ConstitutionTable {
  script_hash: Buffer | null
  voting_anchor_id: bigint
  gov_action_proposal_id: bigint | null
  id: bigint
}
