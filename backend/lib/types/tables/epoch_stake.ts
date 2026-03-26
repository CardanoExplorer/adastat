export default interface EpochStakeTable {
  amount: `${number}`
  pool_id: bigint
  id: bigint
  epoch_no: number
  addr_id: bigint
}
