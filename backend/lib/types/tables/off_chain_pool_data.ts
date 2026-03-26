export default interface OffChainPoolDataTable {
  pool_id: bigint
  hash: Buffer
  id: bigint
  json: any
  pmr_id: bigint
  ticker_name: string
  bytes: Buffer
}
