export default interface AdaStatMultiAssetTable {
  holder: bigint
  policy_id: bigint
  last_tx: bigint | null
  meta_id: bigint | null
  first_tx: bigint | null
  id: bigint
  supply: `${number}`
  tx: number
}
