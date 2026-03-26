export default interface OffChainVoteFetchErrorTable {
  fetch_error: string
  retry_count: number
  fetch_time: Date
  id: bigint
  voting_anchor_id: bigint
}
