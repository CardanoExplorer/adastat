export default interface StakeRegistrationTable {
  addr_id: bigint
  id: bigint
  epoch_no: number
  cert_index: number
  tx_id: bigint
  deposit: `${number}` | null
}
