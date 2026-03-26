export default interface AdaStatEpochTable {
  token_holder: bigint
  block_with_tx: number
  token_tx: number
  account_with_stake: bigint
  pool_register: number
  token_policy: bigint
  orphaned_reward: bigint | null
  delegator_with_stake: bigint
  pool: number
  pool_retire: number
  pool_with_stake: number
  pool_with_block: number
  reward: bigint | null
  delegator: bigint
  byron_with_amount: bigint
  tx_amount: `${number}`
  no: number
  stake: bigint
  byron_amount: bigint
  token: bigint
  circulating_supply: bigint
  delegator_reward: bigint | null
  account: bigint
  pool_reward: bigint | null
  holder_range: any
  blockchain_size: bigint
  byron: bigint
}
