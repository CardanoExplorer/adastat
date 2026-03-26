export default interface WithdrawalTable {
  id: bigint
  tx_id: bigint
  addr_id: bigint
  redeemer_id: bigint | null
  amount: `${number}`
}
