export default interface EpochParamTable {
  epoch_no: number
  committee_min_size: `${number}` | null
  pvt_hard_fork_initiation: number | null
  optimal_pool_count: number
  committee_max_term_length: `${number}` | null
  protocol_major: number
  protocol_minor: number
  block_id: bigint
  extra_entropy: Buffer | null
  max_epoch: number
  min_fee_ref_script_cost_per_byte: number | null
  influence: number
  collateral_percent: number | null
  price_step: number | null
  max_tx_ex_mem: `${number}` | null
  dvt_motion_no_confidence: number | null
  pvtpp_security_group: number | null
  max_tx_ex_steps: `${number}` | null
  dvt_p_p_economic_group: number | null
  decentralisation: number
  price_mem: number | null
  dvt_p_p_technical_group: number | null
  dvt_p_p_gov_group: number | null
  dvt_committee_normal: number | null
  max_tx_size: number
  max_val_size: `${number}` | null
  max_block_ex_steps: `${number}` | null
  max_block_size: number
  nonce: Buffer | null
  monetary_expand_rate: number
  min_pool_cost: `${number}`
  dvt_committee_no_confidence: number | null
  drep_activity: `${number}` | null
  gov_action_lifetime: `${number}` | null
  pvt_committee_normal: number | null
  pool_deposit: `${number}`
  cost_model_id: bigint | null
  key_deposit: `${number}`
  min_utxo_value: `${number}`
  max_bh_size: number
  max_collateral_inputs: number | null
  dvt_update_to_constitution: number | null
  pvt_committee_no_confidence: number | null
  max_block_ex_mem: `${number}` | null
  dvt_hard_fork_initiation: number | null
  min_fee_a: number
  gov_action_deposit: `${number}` | null
  treasury_growth_rate: number
  min_fee_b: number
  drep_deposit: `${number}` | null
  dvt_p_p_network_group: number | null
  dvt_treasury_withdrawal: number | null
  coins_per_utxo_size: `${number}` | null
  pvt_motion_no_confidence: number | null
  id: bigint
}
