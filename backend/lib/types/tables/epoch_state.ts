export default interface EpochStateTable {
  no_confidence_id: bigint | null
  epoch_no: number
  id: bigint
  committee_id: bigint | null
  constitution_id: bigint | null
}
