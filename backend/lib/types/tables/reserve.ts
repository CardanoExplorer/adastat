export default interface ReserveTable {
  amount: `${number}`
  id: bigint
  addr_id: bigint
  tx_id: bigint
  cert_index: number
}
