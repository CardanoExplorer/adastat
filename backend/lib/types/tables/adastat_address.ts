export default interface AdaStatAddressTable {
  amount: bigint
  address: string
  first_tx: bigint | null
  id: bigint
  tx: number
  token: number
  account_id: bigint | null
  last_tx: bigint | null
}
