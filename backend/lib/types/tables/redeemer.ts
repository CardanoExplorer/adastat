export default interface RedeemerTable {
  unit_steps: bigint
  id: bigint
  purpose: 'spend' | 'mint' | 'cert' | 'reward' | 'vote' | 'propose'
  redeemer_data_id: bigint
  unit_mem: bigint
  fee: `${number}` | null
  index: number
  script_hash: Buffer | null
  tx_id: bigint
}
