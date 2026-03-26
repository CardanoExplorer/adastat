export default interface PoolUpdateTable {
  active_epoch_no: bigint
  registered_tx_id: bigint
  vrf_key_hash: Buffer
  id: bigint
  pledge: `${number}`
  hash_id: bigint
  deposit: `${number}` | null
  margin: number
  cert_index: number
  fixed_cost: `${number}`
  reward_addr_id: bigint
  meta_id: bigint | null
}
