export default interface AdaStatMaPolicyTable {
  policy: Buffer
  first_tx: bigint | null
  id: bigint
  token: bigint
  last_tx: bigint | null
  holder: bigint
  tx: bigint
  genuine: boolean
}
