export default interface AdaStatBlockOrphanTable {
  time: Date
  slot_no: number | null
  epoch_slot_no: number | null
  block_no: number | null
  vrf_key: string | null
  tx_count: bigint
  epoch_no: number | null
  size: number
  slot_leader_id: bigint
  hash: Buffer
}
