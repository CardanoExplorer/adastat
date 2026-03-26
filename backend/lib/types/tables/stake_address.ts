export default interface StakeAddressTable {
  view: string
  hash_raw: Buffer
  script_hash: Buffer | null
  id: bigint
}
