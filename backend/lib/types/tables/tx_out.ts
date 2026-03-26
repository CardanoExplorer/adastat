export default interface TxOutTable {
  tx_id: bigint
  id: bigint
  stake_address_id: bigint | null
  index: number
  address: string
  reference_script_id: bigint | null
  data_hash: Buffer | null
  consumed_by_tx_id: bigint | null
  address_has_script: boolean
  inline_datum_id: bigint | null
  value: `${number}`
  payment_cred: Buffer | null
}
