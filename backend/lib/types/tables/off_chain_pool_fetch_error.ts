export default interface OffChainPoolFetchErrorTable {
  pmr_id: bigint
  fetch_time: Date
  retry_count: number
  id: bigint
  fetch_error: string
  pool_id: bigint
}
