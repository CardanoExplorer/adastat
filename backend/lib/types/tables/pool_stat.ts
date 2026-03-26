export default interface PoolStatTable {
  number_of_delegators: `${number}`
  pool_hash_id: bigint
  epoch_no: number
  voting_power: `${number}` | null
  stake: `${number}`
  number_of_blocks: `${number}`
  id: bigint
}
