export default interface StakeDeregistrationTable {
  redeemer_id: bigint | null
  id: bigint
  tx_id: bigint
  addr_id: bigint
  cert_index: number
  epoch_no: number
}
