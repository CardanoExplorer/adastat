export default interface AdaPotsTable {
  id: bigint
  deposits_proposal: `${number}`
  epoch_no: number
  block_id: bigint
  fees: `${number}`
  slot_no: bigint
  treasury: `${number}`
  deposits_drep: `${number}`
  utxo: `${number}`
  rewards: `${number}`
  reserves: `${number}`
  deposits_stake: `${number}`
}
