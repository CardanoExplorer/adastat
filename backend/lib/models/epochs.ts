import { cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError } from '@/helper.ts'
import type { QueryString } from '@/schema.ts'
import { exchangeRates, getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  no: 'e.no',
  tx_amount: 'ae.tx_amount',
  circulating_supply: 'ae.circulating_supply',
  pool: 'ae.pool',
  pool_with_block: 'ae.pool_with_block',
  pool_with_stake: 'ae.pool_with_stake',
  pool_fee: 'COALESCE(pe.pool_reward, ae.pool_reward)',
  reward_amount: 'COALESCE(pe.delegator_reward, ae.delegator_reward)',
  stake: 'COALESCE(ae_a.stake, 0)',
  holder: 'ae.account_with_stake + ae.byron_with_amount',
  delegator: 'ae.delegator',
  account: 'ae.account',
  account_with_reward: 'COALESCE(pe.reward, ae.reward)',
  pool_register: 'ae.pool_register',
  pool_retire: 'ae.pool_retire',
  orphaned_reward_amount: 'ae.orphaned_reward',
  block_with_tx: 'ae.block_with_tx',
  byron: 'ae.byron',
  byron_with_amount: 'ae.byron_with_amount',
  byron_amount: 'ae.byron_amount',
  account_with_amount: 'ae.account_with_stake',
  delegator_with_stake: 'ae.delegator_with_stake',
  token: 'ae.token',
  token_policy: 'ae.token_policy',
  token_holder: 'ae.token_holder',
  token_tx: 'ae.token_tx',
  tx_out_sum: 'e.out_sum',
  tx_fee: 'e.fees',
  tx: 'e.tx_count',
  block: 'e.blk_count',
  market_cap: 'ae.circulating_supply * cr.price',
  exchange_rate: 'cr.price',
  block_size: 'ae.blockchain_size - COALESCE(ae_p.blockchain_size, 0)',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  no: 'e.no',
  tx_amount: 'ae.tx_amount',
  circulating_supply: 'ae.circulating_supply',
  pool: 'ae.pool',
  pool_with_block: 'ae.pool_with_block',
  pool_with_stake: 'ae.pool_with_stake',
  pool_fee: 'COALESCE(pe.pool_reward, ae.pool_reward)',
  reward_amount: 'COALESCE(pe.delegator_reward, ae.delegator_reward)',
  stake: 'COALESCE(ae_a.stake, 0)',
  delegator: 'ae.delegator::integer',
  account: 'ae.account::integer',
  account_with_reward: 'COALESCE(pe.reward, ae.reward)::integer',
  pool_register: 'ae.pool_register',
  pool_retire: 'ae.pool_retire',
  orphaned_reward_amount: 'ae.orphaned_reward',
  block_with_tx: 'ae.block_with_tx',
  byron: 'ae.byron::integer',
  byron_with_amount: 'ae.byron_with_amount::integer',
  byron_amount: 'ae.byron_amount',
  account_with_amount: 'ae.account_with_stake::integer',
  delegator_with_stake: 'ae.delegator_with_stake::integer',
  token: 'ae.token::integer',
  token_policy: 'ae.token_policy::integer',
  token_holder: 'ae.token_holder::integer',
  token_tx: 'ae.token_tx',
  tx_out_sum: 'e.out_sum',
  tx_fee: 'e.fees',
  tx: 'e.tx_count',
  block: 'e.blk_count',
  first_block_time: 'EXTRACT(epoch FROM e.start_time)::integer',
  first_block_hash: "encode(fb.hash, 'hex')",
  last_block_time: 'EXTRACT(epoch FROM e.end_time)::integer',
  last_block_hash: "encode(lb.hash, 'hex')",
  optimal_pool_count: 'ep.optimal_pool_count',
  decentralisation: '(1 - COALESCE(decentralisation::numeric, 1))::float',
  nonce: "encode(ep.nonce::bytea, 'hex')",
  holder_range: 'ae.holder_range',
  block_size: 'ae.blockchain_size - COALESCE(ae_p.blockchain_size, 0)',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

export const getList = async ({ sort, dir, limit, after, page }: QueryString<ListSort>) => {
  const where: string[] = [],
    queryValues: any[] = []

  const storageData = await getData(),
    prevEpochNo = storageData.latestParsedEpoch - 1,
    prevEpoch = storageData.epochs.get(prevEpochNo)

  if (prevEpoch) {
    queryValues.push([prevEpochNo], [prevEpoch.poolFees], [prevEpoch.rewards], [prevEpoch.rewardedAccounts])
  } else {
    queryValues.push([], [], [], [])
  }

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(cursorValues[0])
    if (sort === 'no') {
      where.push(`e.no ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
    } else {
      queryValues.push(cursorValues[1])
      where.push(
        `(${sortFieldMap[sort]}, e.no) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )
      orderBy += `, e.no ${dir}`
    }
  }

  return await cursorQuery(
    `
      SELECT ${sort === 'no' ? 'e.no' : 'CONCAT(' + sortFieldMap[sort] + ",'-',e.no)"} AS cursor, ${fields}
      FROM epoch AS e
      LEFT JOIN adastat_epoch AS ae ON ae.no = e.no
      LEFT JOIN unnest($1::int[], $2::bigint[], $3::bigint[], $4::int[]) AS pe (no, pool_reward, delegator_reward, reward) ON pe.no = e.no
      LEFT JOIN adastat_epoch AS ae_p ON ae_p.no = e.no - 1
      LEFT JOIN adastat_epoch AS ae_a ON ae_a.no = e.no - 2
      LEFT JOIN epoch_param AS ep ON ep.epoch_no = e.no
      LEFT JOIN block AS fb ON fb.time = e.start_time AND fb.block_no IS NOT NULL
      LEFT JOIN block AS lb ON lb.time = e.end_time AND lb.block_no IS NOT NULL
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy}
      LIMIT ${limit + 1}
      ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
    `,
    queryValues,
    limit
  )
}

export const getItem = async (itemId: number) => {
  let data: AnyObject | undefined

  const storageData = await getData()

  if (itemId <= latestBlock.epoch_no) {
    const queryValues: any[] = [itemId],
      prevEpochNo = storageData.latestParsedEpoch - 1

    if (prevEpochNo === itemId) {
      const prevEpoch = storageData.epochs.get(prevEpochNo)

      if (prevEpoch) {
        queryValues.push([prevEpochNo], [prevEpoch.poolFees], [prevEpoch.rewards], [prevEpoch.rewardedAccounts])
      }
    }

    if (queryValues.length === 1) {
      queryValues.push([], [], [], [])
    }

    ;({
      rows: [data],
    } = await query(
      `
      SELECT ${fields}
      FROM epoch AS e
      LEFT JOIN adastat_epoch AS ae ON ae.no = e.no
      LEFT JOIN unnest($2::int[], $3::bigint[], $4::bigint[], $5::int[]) AS pe (no, pool_reward, delegator_reward, reward) ON pe.no = e.no
      LEFT JOIN adastat_epoch AS ae_p ON ae_p.no = e.no - 1
      LEFT JOIN adastat_epoch AS ae_a ON ae_a.no = e.no - 2
      LEFT JOIN epoch_param AS ep ON ep.epoch_no = e.no
      LEFT JOIN block AS fb ON fb.time = e.start_time AND fb.block_no IS NOT NULL
      LEFT JOIN block AS lb ON lb.time = e.end_time AND lb.block_no IS NOT NULL
      WHERE e.no = $1
    `,
      queryValues
    ))
  }

  if (!data) {
    return throwError(404)
  }

  data.current_epoch_no = latestBlock.epoch_no
  data.current_epoch_slot_no = latestBlock.epoch_slot_no
  data.current_slot_no = latestBlock.slot_no

  return {
    data,
    exchangeRates: data.no === latestBlock.epoch_no ? exchangeRates : storageData.epochs.get(data.no)?.exchangeRates,
  }
}
