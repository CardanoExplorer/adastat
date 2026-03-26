export default interface GovActionProposalTable {
  voting_anchor_id: bigint | null
  dropped_epoch: number | null
  expired_epoch: number | null
  return_address: bigint
  prev_gov_action_proposal: bigint | null
  description: any
  ratified_epoch: number | null
  type:
    | 'ParameterChange'
    | 'HardForkInitiation'
    | 'TreasuryWithdrawals'
    | 'NoConfidence'
    | 'NewCommittee'
    | 'NewConstitution'
    | 'InfoAction'
  index: bigint
  tx_id: bigint
  expiration: number | null
  deposit: `${number}`
  enacted_epoch: number | null
  param_proposal: bigint | null
  id: bigint
}
