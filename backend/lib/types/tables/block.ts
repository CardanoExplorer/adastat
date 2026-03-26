export default interface BlockTable {
  op_cert_counter: bigint | null
  epoch_no: number | null
  time: Date
  proto_minor: number
  proto_major: number
  hash: Buffer
  vrf_key: string | null
  slot_no: bigint | null
  op_cert: Buffer | null
  tx_count: bigint
  epoch_slot_no: number | null
  previous_id: bigint | null
  slot_leader_id: bigint
  block_no: number | null
  size: number
  id: bigint
}
