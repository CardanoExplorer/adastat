export default interface EpochSyncTimeTable {
  id: bigint
  no: bigint
  seconds: bigint
  state: 'lagging' | 'following'
}
