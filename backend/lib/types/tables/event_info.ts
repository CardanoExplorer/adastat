export default interface EventInfoTable {
  tx_id: bigint | null
  type: string
  epoch: number
  id: bigint
  explanation: string | null
}
