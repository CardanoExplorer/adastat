export default interface RewardTable {
  type: 'leader' | 'member' | 'reserves' | 'treasury' | 'refund' | 'proposal_refund'
  pool_id: bigint
  earned_epoch: bigint
  addr_id: bigint
  spendable_epoch: bigint
  amount: `${number}`
}
