export default interface CollateralTxOutTable {
  value: `${number}`
  id: bigint
  reference_script_id: bigint | null
  address_has_script: boolean
  stake_address_id: bigint | null
  multi_assets_descr: string
  data_hash: Buffer | null
  inline_datum_id: bigint | null
  index: number
  payment_cred: Buffer | null
  address: string
  tx_id: bigint
}
