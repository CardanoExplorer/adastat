export default interface EpochTable {
  start_time: Date
  out_sum: `${number}`
  end_time: Date
  blk_count: number
  id: bigint
  no: number
  fees: `${number}`
  tx_count: number
}
