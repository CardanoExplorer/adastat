export default interface TxTable {
  fee: `${number}`
  block_index: number
  treasury_donation: `${number}`
  out_sum: `${number}`
  invalid_hereafter: `${number}` | null
  deposit: bigint | null
  size: number
  script_size: number
  hash: Buffer
  valid_contract: boolean
  block_id: bigint
  id: bigint
  invalid_before: `${number}` | null
}
