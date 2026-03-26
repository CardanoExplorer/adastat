export default interface AdaStatAccountTable {
  token: number
  active_pool: bigint | null
  first_tx: bigint | null
  total_reward: bigint
  reward: bigint
  snapshot_pool: bigint | null
  id: bigint
  active_amount: bigint
  possible_reward: bigint | null
  last_tx: bigint | null
  snapshot_amount: bigint
  tx: number
  retired_pool: bigint | null
  amount: bigint
  pool: bigint | null
}
