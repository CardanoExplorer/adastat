export default interface AdaStatAddressByronTable {
  first_tx: bigint | null
  last_tx: bigint | null
  token: number
  amount: bigint
  id: bigint
  address: string
  tx: number
}
