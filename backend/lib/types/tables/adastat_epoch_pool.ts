export default interface AdaStatEpochPoolTable {
  pool_reward: bigint
  update_id: bigint | null
  delegator_with_stake: bigint
  assigned_block: number
  pool_id: bigint
  epoch_no: number
  real_pledge: bigint
  orphaned_reward: bigint
  stake: bigint
  delegator_reward: bigint
  block: number
  delegator: bigint
  ros: number
}
