export default interface RewardRestTable {
  spendable_epoch: bigint
  type: 'leader' | 'member' | 'reserves' | 'treasury' | 'refund' | 'proposal_refund'
  amount: `${number}`
  addr_id: bigint
  earned_epoch: bigint
}
