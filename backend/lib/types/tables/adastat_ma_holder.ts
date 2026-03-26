export default interface AdaStatMaHolderTable {
  holder_id: bigint
  ma_id: bigint
  quantity: `${number}`
  policy_id: bigint
  account_id: bigint | null
}
