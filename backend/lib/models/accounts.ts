import { networkParams } from '@/config.ts'
import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError, toBech32 } from '@/helper.ts'
import { delegations as drepDelegations, dreps } from '@/helpers/dreps.ts'
import { fill as fillTokenData } from '@/helpers/tokens.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import { getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  balance: 'a.amount',
  total_reward_amount: 'a.total_reward',
  token: 'a.token',
  first_tx: 'a.first_tx',
  last_tx: 'a.last_tx',
  tx: 'a.tx',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  base16: "encode(s.hash_raw::bytea, 'hex')",
  bech32: 's.view',
  balance: 'a.amount',
  token: 'a.token',
  total_reward_amount: 'a.total_reward',
  first_tx_hash: "encode(ft.hash::bytea, 'hex')",
  first_tx_time: 'EXTRACT(epoch FROM fb.time)::integer',
  last_tx_hash: "encode(lt.hash::bytea, 'hex')",
  last_tx_time: 'EXTRACT(epoch FROM lb.time)::integer',
  tx: 'a.tx',
  pool_hash: "encode(ph.hash_raw::bytea, 'hex')",
  pool_bech32: 'ph.view',
  pool_name: 'p.name',
  pool_ticker: 'p.ticker',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'watchlist'; id: string } | { type: 'pool'; id: bigint }
) => {
  const where: string[] = [],
    queryValues: any[] = []

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`

  if (item?.type === 'pool') {
    queryValues.push(item.id)

    where.push(`a.pool = $${queryValues.length}`)

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}`
  } else if (item?.type === 'watchlist') {
    const itemValues = item.id.split(',')

    const watchlistValues: string[] = [],
      networkTag = Number(networkParams.isMainnet),
      networkPrefix = networkParams.isMainnet ? 'stake' : 'stake_test'

    for (const itemValue of itemValues) {
      if (itemValue.length === 56 && /^[0-9A-Fa-f]+$/.test(itemValue)) {
        for (const ef of ['e', 'f']) {
          const bech32Str = toBech32(networkPrefix, ef + networkTag + itemValue)

          if (bech32Str) {
            watchlistValues.push(bech32Str)
          }
        }
      } else if (itemValue.length <= 64) {
        watchlistValues.push(itemValue)
      }
    }

    if (!watchlistValues.length) {
      throwError(400)
    }

    queryValues.push(watchlistValues)

    where.push(`a.id IN (SELECT id FROM stake_address WHERE view = ANY ($${queryValues.length}::text[]))`)

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}`
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(...cursorValues)
    where.push(
      `(${sortFieldMap[sort]}, a.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )
    orderBy += `, a.id ${dir}`
  }

  return await cursorQuery(
    `
    SELECT a.id, CONCAT(${sortFieldMap[sort]},'-',a.id) AS cursor, ${fields}
    FROM (
      SELECT a.id
      FROM adastat_account AS a
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy} NULLS LAST
      LIMIT ${limit + 1}
      ${after ? '' : 'OFFSET ' + (page - 1) * limit}
    ) AS rows
    LEFT JOIN adastat_account AS a ON a.id = rows.id
    LEFT JOIN stake_address AS s ON s.id = a.id
    LEFT JOIN pool_hash AS ph ON ph.id = a.pool
    LEFT JOIN adastat_pool AS p ON p.id = a.pool
    LEFT JOIN tx AS ft ON ft.id = a.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = a.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    ${orderBy}
  `,
    queryValues,
    limit,
    (row) => {
      const drepDelegation = drepDelegations.get(row.id),
        drep = drepDelegation?.hash_id ? dreps.get(drepDelegation.hash_id) : undefined

      if (drep) {
        row.drep_bech32 = drep.bech32
        row.drep_base16 = drep.base16
        row.drep_has_script = drep.has_script
        row.drep_given_name = drep.given_name
        row.drep_image = drep.image
      }

      delete row.id
    }
  )
}

export const getItem = async (itemId: string) => {
  const where: string[] = [],
    queryValues: any[] = [latestBlock.epoch_no]

  if (itemId.length === (networkParams.isMainnet ? 59 : 64)) {
    queryValues.push(itemId)
    where.push('stake_address.view = $2')
  } else if (itemId.length === 58) {
    queryValues.push('\\x' + itemId)
    where.push('stake_address.hash_raw = $2')
  } else {
    if (networkParams.isMainnet) {
      queryValues.push('\\xe1' + itemId, '\\xf1' + itemId)
    } else {
      queryValues.push('\\xe0' + itemId, '\\xf0' + itemId)
    }
    where.push('(stake_address.hash_raw = $2 OR stake_address.hash_raw = $3)')
  }

  const {
    rows: [data],
  } = await query(
    `
    SELECT stake_address.id AS account_id, encode(ft.hash::bytea, 'hex') AS first_tx_hash, EXTRACT(epoch FROM fb.time)::integer AS first_tx_time, encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time, encode(stake_address.hash_raw::bytea, 'hex') AS base16, stake_address.view AS bech32, adastat_account.first_tx, adastat_account.last_tx, adastat_account.amount AS balance, adastat_account.reward AS reward_balance, adastat_account.total_reward AS total_reward_amount, adastat_account.active_amount AS active_stake, adastat_account.snapshot_amount AS snapshot_stake, epoch_stake.amount AS previous_stake, adastat_account.tx, adastat_account.token, NULL AS catalyst_id, null AS address, CASE WHEN adastat_account.pool IS NULL THEN FALSE ELSE TRUE END AS registered_stake_key, FALSE AS stake_history, FALSE AS delegation_history, FALSE AS key_history, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker, encode(ph_a.hash_raw::bytea, 'hex') AS active_pool_hash, ph_a.view AS active_pool_bech32, ap_a.name AS active_pool_name, ap_a.ticker AS active_pool_ticker, ph_a.id AS active_pool_id, encode(ph_s.hash_raw::bytea, 'hex') AS snapshot_pool_hash, ph_s.view AS snapshot_pool_bech32, ap_s.name AS snapshot_pool_name, ap_s.ticker AS snapshot_pool_ticker, encode(ph_p.hash_raw::bytea, 'hex') AS previous_pool_hash, ph_p.view AS previous_pool_bech32, ap_p.name AS previous_pool_name, ap_p.ticker AS previous_pool_ticker, ph_p.id AS previous_pool_id,
    (
      SELECT SUM(amount)
      FROM reward
      WHERE addr_id = stake_address.id AND pool_id = epoch_stake_d.pool_id AND spendable_epoch+0 = $1 AND type IN ('leader', 'member')
    ) AS distributed_reward_amount,
    (
      SELECT SUM(amount)
      FROM reward
      WHERE addr_id = stake_address.id AND pool_id = epoch_stake.pool_id AND spendable_epoch+0 = $1 + 1 AND type IN ('leader', 'member')
    ) AS pending_reward_amount,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM reward_rest
      WHERE addr_id = stake_address.id AND spendable_epoch+0 = $1 + 1 AND type IN ('reserves', 'treasury')
    ) AS pending_reward_rest_amount,
    (
      SELECT ENCODE(multi_asset.name, 'hex')
      FROM adastat_ma_holder
      LEFT JOIN multi_asset ON multi_asset.id = adastat_ma_holder.ma_id
      WHERE adastat_ma_holder.account_id = adastat_account.id AND adastat_ma_holder.policy_id = 38527
      LIMIT 1
    ) AS adahandle
    FROM stake_address
    LEFT JOIN adastat_account ON adastat_account.id = stake_address.id
    LEFT JOIN tx AS ft ON ft.id = adastat_account.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = adastat_account.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    LEFT JOIN pool_hash AS ph ON ph.id = adastat_account.pool
    LEFT JOIN adastat_pool AS ap ON ap.id = adastat_account.pool
    LEFT JOIN pool_hash AS ph_a ON ph_a.id = adastat_account.active_pool
    LEFT JOIN adastat_pool AS ap_a ON ap_a.id = adastat_account.active_pool
    LEFT JOIN pool_hash AS ph_s ON ph_s.id = adastat_account.snapshot_pool
    LEFT JOIN adastat_pool AS ap_s ON ap_s.id = adastat_account.snapshot_pool
    LEFT JOIN epoch_stake ON epoch_stake.epoch_no = $1 - 1 AND epoch_stake.addr_id = adastat_account.id
    LEFT JOIN pool_hash AS ph_p ON ph_p.id = epoch_stake.pool_id
    LEFT JOIN adastat_pool AS ap_p ON ap_p.id = epoch_stake.pool_id
    LEFT JOIN epoch_stake AS epoch_stake_d ON epoch_stake_d.epoch_no = $1 - 2 AND epoch_stake_d.addr_id = adastat_account.id
    WHERE ${where.join(' AND ')} AND adastat_account.id IS NOT NULL
  `,
    queryValues
  )

  if (!data) {
    return throwError(404)
  }

  const {
    account_id: accountId,
    first_tx: firstTx,
    last_tx: lastTx,
    active_pool_id: activePoolId,
    previous_pool_id: previousPoolId,
  } = data as {
    account_id: bigint
    first_tx: bigint
    last_tx: bigint
    active_pool_id: bigint
    previous_pool_id: bigint
  }

  delete data.account_id
  delete data.first_tx
  delete data.last_tx
  delete data.active_pool_id
  delete data.previous_pool_id

  const {
    rows: [stakingTimelineRow],
  } = await query(
    `
    WITH cte AS (
      SELECT
        $1 - ap.reserves::numeric AS circulation_supply,
        FLOOR(ap.reserves * ep.monetary_expand_rate * CASE
          WHEN ep.decentralisation < 0.8 THEN LEAST(1, p.blocks / ($2 * (1 - ep.decentralisation)))
          ELSE 1
        END + ap.fees)::numeric AS total_reward_pot,
        ap.reserves,
        ap1.reserves AS _reserves1,
        ap.fees,
        COALESCE(ap1.fees, e1.fees, 0) AS fees1,
        ep.monetary_expand_rate,
        ep1.monetary_expand_rate AS monetary_expand_rate1,
        ep.decentralisation,
        ep1.decentralisation AS decentralisation1,
        ep.treasury_growth_rate::numeric,
        ep1.treasury_growth_rate::numeric AS treasury_growth_rate1,
        ep.influence::numeric,
        ep1.influence::numeric AS influence1,
        1 / ep.optimal_pool_count::numeric AS relative_saturation,
        1 / ep1.optimal_pool_count::numeric AS relative_saturation1,
        aep_a.stake::numeric AS pool_stake,
        aep_a1.stake::numeric AS pool_stake1,
        aep_a.real_pledge::numeric AS owner_stake,
        aep_a1.real_pledge::numeric AS owner_stake1,
        p.blocks AS pool_blocks,
        p1.blocks AS pool_blocks1,
        pu.pledge::numeric,
        pu1.pledge::numeric AS pledge1,
        pu.margin::numeric,
        pu1.margin::numeric AS margin1,
        pu.fixed_cost::numeric,
        pu1.fixed_cost::numeric AS fixed_cost1,
        pu.reward_addr_id = $5 AS is_reward_addr,
        pu1.reward_addr_id = $5 AS is_reward_addr1,
        po.owners AS pool_owners,
        po1.owners AS pool_owners1,
        es.amount::numeric AS previous_member_stake,
        es1.amount::numeric AS active_member_stake,
        CASE
          WHEN p.blocks = 0 OR aep_a.stake = 0 THEN 0
          WHEN ep.decentralisation < 0.8 THEN aep.block * ae.stake::numeric / (p.blocks * aep_a.stake::numeric)
          ELSE 1
        END AS pool_perfomance,
        CASE
          WHEN p1.blocks = 0 OR aep_a1.stake = 0 THEN 0
          WHEN ep1.decentralisation < 0.8 THEN aep1.block * ae1.stake::numeric / (p1.blocks * aep_a1.stake::numeric)
          ELSE 1
        END AS pool_perfomance1,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM reward_rest
          WHERE spendable_epoch = ep1.epoch_no AND type = 'reserves'
        )::numeric AS monetary_reserves1
      FROM epoch_param AS ep
      LEFT JOIN epoch_param AS ep1 ON ep1.epoch_no = ep.epoch_no + 1
      LEFT JOIN epoch AS e1 ON e1.no = ep1.epoch_no
      LEFT JOIN ada_pots AS ap ON ap.epoch_no = ep1.epoch_no
      LEFT JOIN ada_pots AS ap1 ON ap1.epoch_no = ep1.epoch_no + 1
      LEFT JOIN adastat_epoch_pool AS aep ON aep.epoch_no = ep.epoch_no AND aep.pool_id = $3
      LEFT JOIN adastat_epoch_pool AS aep1 ON aep1.epoch_no = ep1.epoch_no AND aep1.pool_id = $4
      LEFT JOIN adastat_epoch AS ae ON ae.no = ep.epoch_no - 2
      LEFT JOIN adastat_epoch AS ae1 ON ae1.no = ep1.epoch_no - 2
      LEFT JOIN adastat_epoch_pool AS aep_a ON aep_a.epoch_no = ae.no AND aep_a.pool_id = $3
      LEFT JOIN adastat_epoch_pool AS aep_a1 ON aep_a1.epoch_no = ae1.no AND aep_a1.pool_id = $4
      LEFT JOIN pool_update AS pu ON pu.id = aep_a.update_id
      LEFT JOIN pool_update AS pu1 ON pu1.id = aep_a1.update_id
      CROSS JOIN LATERAL (
        SELECT
          SUM(block) AS blocks
        FROM adastat_epoch_pool
        WHERE epoch_no = ep.epoch_no
      ) AS p
      CROSS JOIN LATERAL (
        SELECT
          SUM(block) AS blocks
        FROM adastat_epoch_pool
        WHERE epoch_no = ep.epoch_no + 1
      ) AS p1
      CROSS JOIN LATERAL (
        SELECT
          ARRAY_AGG(addr_id) AS owners
        FROM pool_owner
        WHERE pool_update_id = aep_a.update_id
      ) AS po
      CROSS JOIN LATERAL (
        SELECT
          ARRAY_AGG(addr_id) AS owners
        FROM pool_owner
        WHERE pool_update_id = aep_a1.update_id
      ) AS po1
      LEFT JOIN epoch_stake AS es ON es.addr_id = $5 AND es.pool_id = $3 AND es.epoch_no = ep.epoch_no
      LEFT JOIN epoch_stake AS es1 ON es1.addr_id = $5 AND es1.pool_id = $4 AND es1.epoch_no = ep.epoch_no + 1
      WHERE ep.epoch_no = $6 - 1
    ),
    capped AS (
      SELECT
        LEAST(relative_saturation, pool_stake / circulation_supply) AS relative_pool_stake,
        LEAST(relative_saturation, pledge / circulation_supply) AS relative_pledge
      FROM cte
    ),
    pool AS (
      SELECT
        FLOOR(
          FLOOR(((total_reward_pot - FLOOR(total_reward_pot * treasury_growth_rate)) / (1 + influence)) * (relative_pool_stake + relative_pledge * influence * ((relative_pool_stake - relative_pledge * (( relative_saturation - relative_pool_stake ) / relative_saturation)) / relative_saturation))) * pool_perfomance
        ) AS reward_pot
      FROM cte, capped
    ),
    computed AS (
      SELECT
        CASE
          WHEN reward_pot < fixed_cost THEN reward_pot
          ELSE fixed_cost
        END AS fixed_cost_value,
        COALESCE(_reserves1, reserves - total_reward_pot - monetary_reserves1 + fees) AS reserves1
      FROM cte, pool
    ),
    capped1 AS (
      SELECT
        FLOOR(reserves1 * monetary_expand_rate1 * CASE
          WHEN decentralisation1 < 0.8 THEN LEAST(1, pool_blocks1 / ($2 * (1 - decentralisation1)))
          ELSE 1
        END + fees1)::numeric AS total_reward_pot1,
      LEAST(relative_saturation1, pool_stake1 / ($1 - reserves1)) AS relative_pool_stake1,
      LEAST(relative_saturation1, pledge1 / ($1 - reserves1)) AS relative_pledge1
      FROM cte, computed
    ),
    pool1 AS (
      SELECT
        FLOOR(FLOOR(((total_reward_pot1 - FLOOR(total_reward_pot1 * treasury_growth_rate1)) / (1 + influence1)) * (relative_pool_stake1 + relative_pledge1 * influence1 * ((relative_pool_stake1 - relative_pledge1 * (( relative_saturation1 - relative_pool_stake1 ) / relative_saturation1)) / relative_saturation1))) * pool_perfomance1) AS reward_pot1
      FROM cte, computed, capped1
    ),
    computed1 AS (
      SELECT
        CASE
          WHEN reward_pot1 < fixed_cost1 THEN reward_pot1
          ELSE fixed_cost1
        END AS fixed_cost_value1
      FROM cte, pool1
    )
    SELECT
      total_reward_pot,
      total_reward_pot1,
      reward_pot AS pool_reward_pot,
      reward_pot1 AS pool_reward_pot1,
      CASE
        WHEN pool_stake = 0 THEN 0
        ELSE FLOOR(fixed_cost_value + ((reward_pot - fixed_cost_value) * (margin + (1 - margin) * owner_stake / pool_stake)))
      END AS leader_rewards,
      CASE
        WHEN pool_stake1 = 0 THEN 0
        ELSE FLOOR(fixed_cost_value1 + ((reward_pot1 - fixed_cost_value1) * (margin1 + (1 - margin1) * owner_stake1 / pool_stake1)))
      END AS leader_rewards1,
      CASE
        WHEN pool_stake = 0 THEN 0
        ELSE FLOOR((reward_pot - fixed_cost_value) * (1 - margin) * previous_member_stake / pool_stake)
      END AS member_rewards,
      CASE
        WHEN pool_stake1 = 0 THEN 0
        ELSE FLOOR((reward_pot1 - fixed_cost_value1) * (1 - margin1) * active_member_stake / pool_stake1)
      END AS member_rewards1,
      CASE
        WHEN pool_stake = 0 THEN 0
        ELSE FLOOR((reward_pot - fixed_cost_value) * (1 - margin) * owner_stake / pool_stake)
      END AS owner_rewards,
      CASE
        WHEN pool_stake1 = 0 THEN 0
        ELSE FLOOR((reward_pot1 - fixed_cost_value1) * (1 - margin1) * owner_stake1 / pool_stake1)
      END AS owner_rewards1,
      fixed_cost_value + FLOOR((reward_pot - fixed_cost_value) * margin) AS pool_fees,
      fixed_cost_value1 + FLOOR((reward_pot1 - fixed_cost_value1) * margin1) AS pool_fees1,
      pool_perfomance,
      pool_perfomance1,
      owner_stake >= pledge AS is_pledge_met,
      owner_stake1 >= pledge1 AS is_pledge_met1,
      is_reward_addr,
      is_reward_addr1,
      pool_owners,
      pool_owners1
    FROM cte, pool, computed, capped1, pool1, computed1
  `,
    [
      networkParams.totalSupply,
      networkParams.epochLength * networkParams.activeSlotsCoeff,
      previousPoolId,
      activePoolId,
      accountId,
      latestBlock.epoch_no,
    ]
  )

  if (stakingTimelineRow) {
    if (data.pending_reward_amount === null && stakingTimelineRow.is_pledge_met) {
      data.pending_reward_amount = stakingTimelineRow.pool_owners?.includes(accountId)
        ? stakingTimelineRow.is_reward_addr
          ? stakingTimelineRow.leader_rewards
          : 0n
        : stakingTimelineRow.member_rewards
      data.pending_reward_amount_type = stakingTimelineRow.pool_owners?.includes(accountId)
        ? stakingTimelineRow.is_reward_addr
          ? 'leader'
          : 'zero'
        : 'member'
    }

    if (stakingTimelineRow.is_pledge_met1) {
      data.estimated_reward_amount = stakingTimelineRow.pool_owners1?.includes(accountId)
        ? stakingTimelineRow.is_reward_addr1
          ? stakingTimelineRow.leader_rewards1
          : 0n
        : stakingTimelineRow.member_rewards1
      data.estimated_reward_amount_type = stakingTimelineRow.pool_owners?.includes(accountId)
        ? stakingTimelineRow.is_reward_addr1
          ? 'leader'
          : 'zero'
        : 'member'
    }
  } else {
    data.estimated_reward_amount = null
  }

  const drepDelegation = drepDelegations.get(accountId),
    drep = drepDelegation?.hash_id ? dreps.get(drepDelegation.hash_id) : undefined

  if (drep) {
    data.drep_bech32 = drep.bech32
    data.drep_base16 = drep.base16
    data.drep_has_script = drep.has_script
    data.drep_given_name = drep.given_name
    data.drep_image = drep.image
  }

  // TODO Add array support https://github.com/cardano-foundation/CIPs/blob/master/CIP-0036/README.md
  const {
    rows: [catalystRow],
  } = await query(
    `
    SELECT encode(json_hex_str_to_bytea(COALESCE(m1.json->'1'->0->>0, m1.json->>'1')), 'hex') AS catalyst_id, encode(json_hex_str_to_bytea(m1.json->>'3'), 'hex') AS reward_address_base16, encode(tx.hash::bytea, 'hex') AS catalyst_tx_hash
    FROM tx_metadata AS m1
    LEFT JOIN tx_metadata AS m2 ON m2.tx_id = m1.tx_id AND m2.key = 61285
    LEFT JOIN tx ON tx.id = m1.tx_id
    WHERE m1.key = 61284 AND public.blake2b_hash(json_hex_str_to_bytea(substring(m1.json->>'2', 1, 66)), 28) = $1 AND m1.json->>'4' <> '' AND translate(m1.json->>'4', '1234567890', '') = '' AND public.ed25519_verify_signature(json_hex_str_to_bytea(m1.json->>'2'), public.blake2b_hash(decode(encode(m1.bytes, 'hex'), 'hex'), 32), json_hex_str_to_bytea(m2.json->>'1')) = TRUE
    ORDER BY (m1.json->>'4')::integer DESC
    LIMIT 1
  `,
    ['\\x' + data.base16.slice(2)]
  )

  if (catalystRow?.catalyst_id?.length === 64) {
    data.catalyst_id = catalystRow.catalyst_id
    data.catalyst_tx_hash = catalystRow.catalyst_tx_hash
    if (
      catalystRow.reward_address_base16?.length === 58 &&
      (networkParams.isMainnet ? ['e1', 'f1'] : ['e0', 'f0']).indexOf(
        catalystRow.reward_address_base16.slice(0, 2).toLowerCase()
      ) >= 0
    ) {
      data.catalyst_legacy = true
    }
  }

  let adahandle = data.adahandle || ''
  const maybeCIP68 = adahandle.slice(0, 8)
  if (
    maybeCIP68 === '000de140' ||
    maybeCIP68 === '0014df10' ||
    maybeCIP68 === '001bc280' ||
    maybeCIP68 === '000643b0' ||
    maybeCIP68 === '00000000'
  ) {
    adahandle = adahandle.slice(8)
  }

  const {
    rows: [adaHandleAddressRow],
  } = await query(
    `
      SELECT COUNT(*) AS address, convert_asset_name($2) AS adahandle
      FROM adastat_address
      WHERE account_id = $1
    `,
    [accountId, '\\x' + adahandle]
  )

  if (adaHandleAddressRow) {
    data.address = parseInt(adaHandleAddressRow.address)
    data.adahandle = adaHandleAddressRow.adahandle
  }

  const {
    rows: [rewardRow],
  } = await query(
    `
    SELECT NULLIF(MIN(earned_epoch) FILTER (WHERE type <> 'refund')::integer, 0) AS first_reward_epoch, NULLIF(MAX(earned_epoch) FILTER (WHERE type <> 'refund')::integer, 0) AS last_reward_epoch, COUNT(*) FILTER (WHERE type = 'member')::integer AS total_member, COUNT(*) FILTER (WHERE type = 'leader')::integer AS total_leader, COUNT(*) FILTER (WHERE type = 'refund')::integer AS total_refund, (SELECT COUNT(*) FROM treasury WHERE addr_id = $1)::integer AS total_treasury, (SELECT COUNT(*) FROM reserve WHERE addr_id = $1)::integer AS total_reserves, SUM(amount) FILTER (WHERE type = 'refund') AS total_refund_amount
    FROM reward
    WHERE addr_id = $1
  `,
    [accountId]
  )

  if (rewardRow) {
    Object.assign(data, rewardRow)
  }

  if (!data.stake_history) {
    if (data.active_stake !== null || data.total_member > 0) {
      data.stake_history = true
    } else {
      const { rows: epochStakeRow } = await query(
        `
        SELECT id
        FROM epoch_stake
        WHERE addr_id = $1
        LIMIT 1
      `,
        [accountId]
      )

      if (epochStakeRow) {
        data.stake_history = true
      }
    }
  }

  if (!data.snapshot_pool_hash) {
    data.snapshot_stake = null
  }
  if (!data.active_pool_hash) {
    data.active_stake = null
  }

  if (data.pool_hash || data.stake_history) {
    data.delegation_history = true
  } else {
    const {
      rows: [delegationRow],
    } = await query(
      `
      SELECT id
      FROM delegation
      WHERE addr_id = $1
      LIMIT 1
    `,
      [accountId]
    )

    if (delegationRow) {
      data.delegation_history = true
    }
  }

  if (data.registered_stake_key || data.delegation_history) {
    data.key_history = true
  } else {
    const {
      rows: [stakeKeyRow],
    } = await query(
      `
      (
        SELECT id
        FROM stake_registration
        WHERE addr_id = $1
        LIMIT 1
      ) UNION ALL (
        SELECT id
        FROM stake_deregistration
        WHERE addr_id = $1
        LIMIT 1
      )
    `,
      [accountId]
    )

    if (stakeKeyRow) {
      data.key_history = true
    }
  }

  const { rows: poolRewardAddressRows } = await query(
    `
    SELECT DISTINCT ON (pool_update.hash_id) encode(pool_hash.hash_raw::bytea, 'hex') AS pool_hash, pool_hash.view AS pool_bech32, adastat_pool.name AS pool_name, adastat_pool.ticker AS pool_ticker
    FROM pool_update
    LEFT JOIN pool_hash ON pool_hash.id = pool_update.hash_id
    LEFT JOIN adastat_pool ON adastat_pool.id = pool_update.hash_id
    LEFT JOIN pool_retire ON pool_retire.id = adastat_pool.retirement_id
    WHERE pool_update.id = adastat_pool.update_id AND pool_update.reward_addr_id = $1 AND (pool_retire.id IS NULL OR pool_retire.retiring_epoch > $2)
    ORDER BY pool_update.hash_id, pool_update.id DESC
  `,
    [accountId, latestBlock.epoch_no]
  )

  data.pool_reward_address = {
    rows: poolRewardAddressRows,
  }

  const { rows: poolOwnerRows } = await query(
    `
    SELECT DISTINCT ON (pool_update.hash_id) encode(pool_hash.hash_raw::bytea, 'hex') AS pool_hash, pool_hash.view AS pool_bech32, adastat_pool.name AS pool_name, adastat_pool.ticker AS pool_ticker
    FROM pool_owner
    LEFT JOIN pool_update ON pool_update.id = pool_owner.pool_update_id
    LEFT JOIN pool_hash ON pool_hash.id = pool_update.hash_id
    LEFT JOIN adastat_pool ON adastat_pool.id = pool_update.hash_id
    LEFT JOIN pool_retire ON pool_retire.id = adastat_pool.retirement_id
    WHERE pool_update.id = adastat_pool.update_id AND pool_owner.addr_id = $1 AND (pool_retire.id IS NULL OR pool_retire.retiring_epoch > $2)
    ORDER BY pool_update.hash_id, pool_update.id DESC
  `,
    [accountId, latestBlock.epoch_no]
  )

  data.pool_owner = {
    rows: poolOwnerRows,
  }

  if (data.token > 0) {
    const {
      rows: [tokenRow],
    } = await query(
      `
      SELECT COUNT(*) filter (where p.holder <= p.token)::int AS nft_collection, COALESCE(SUM(col.token_count) filter (where p.holder <= p.token), 0)::int AS nft, COUNT(*) filter (where p.holder > p.token)::int AS ft
      FROM (
        SELECT COUNT(*) AS token_count, policy_id
        FROM adastat_ma_holder
        WHERE account_id = $1
        GROUP BY policy_id
      ) AS col
      LEFT JOIN adastat_ma_policy AS p ON p.id = col.policy_id
    `,
      [accountId]
    )

    if (tokenRow) {
      Object.assign(data, tokenRow)
    }
  } else {
    data.nft_collection = 0
    data.nft = 0
    data.ft = 0
  }

  return {
    data,
    accountId,
    firstTx,
    lastTx,
  }
}

export const rowSortFieldMap = {
  activity: {
    time: '',
  },
  nfts: {
    quantity: '',
  },
  fts: {
    balance: '',
  },
  staking: {
    epoch: '',
    rewards: '',
    stake: '',
  },
  stakekey: {
    time: '',
  },
  addresses: {
    balance: '',
    first_tx: '',
    last_tx: '',
    token: '',
    tx: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  dir,
  limit,
  after,
  rows: rowsType,
  accountId,
  firstTx,
  lastTx,
  policy: policyFilter,
  data: item,
}: RowsQueryString<RowSortFieldMap> & { accountId: bigint; firstTx: bigint; lastTx: bigint; data: AnyObject }) => {
  const where: string[] = [],
    queryValues: any[] = [],
    cursorValues = decodeCursor(after)

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'activity') {
    if (item.tx > 0) {
      queryValues.push(accountId, cursorValues[0])

      const maInIds: any[] = [],
        maInIdValues: any[] = [],
        maOutIds: any[] = [],
        maOutIdValues: any[] = [],
        txHashes: AnyObject = {},
        epochTxIdValues = [[] as number[], [] as bigint[]] as const

      const storageData = await getData()

      let cursorEpoch = 0

      for (const epochData of storageData.epochs.values()) {
        epochTxIdValues[0].push(epochData.no)
        epochTxIdValues[1].push(epochData.firstTxId)

        if (dir === 'desc') {
          if ((!cursorValues[0] || (cursorValues[0] as any) > epochData.firstTxId) && epochData.no > cursorEpoch) {
            cursorEpoch = epochData.no
          }
        } else {
          if (
            (!cursorValues[0] || (cursorValues[0] as any) < epochData.firstTxId) &&
            (epochData.no < cursorEpoch || cursorEpoch === 0)
          ) {
            cursorEpoch = epochData.no
          }
        }
      }

      queryValues.push(cursorEpoch, epochTxIdValues[0], epochTxIdValues[1])

      if (!cursorValues[0]) {
        queryValues[1] = dir === 'desc' ? lastTx + 1n : firstTx - 1n
      }

      ;({ rows, cursor } = await cursorQuery(
        `
        WITH a AS (
          SELECT DISTINCT tx_id
          FROM adastat_tx_address
          WHERE account_id = $1 AND tx_id ${dir === 'desc' ? '<' : '>'} $2
          ORDER BY tx_id ${dir}
          LIMIT ${limit + 1}
        )
        SELECT t.tx_id AS cursor, encode(tx.hash::bytea, 'hex') AS tx_hash, tx.fee AS tx_fee, tx.deposit AS tx_deposit, COALESCE(b.block_no, 0) AS block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, SUM(t.amount) AS amount, STRING_AGG(t.tx_in_id::text, ',') AS tx_in_ids, STRING_AGG(t.tx_out_id::text, ',') AS tx_out_ids, SUM(DISTINCT type) AS type
        FROM (
          (
            SELECT tx_out.tx_id, tx_out.value AS amount, NULL AS tx_in_id, tx_out.id AS tx_out_id, 1 AS type
            FROM tx_out
            WHERE tx_out.tx_id IN (SELECT tx_id FROM a) AND tx_out.stake_address_id = $1
          )
          UNION ALL
          (
            SELECT tx_in.tx_in_id AS tx_id, -tx_out.value AS amount, tx_out.id AS tx_in_id, NULL AS tx_out_id, 2 AS type
            FROM tx_in
            LEFT JOIN tx_out ON tx_out.tx_id = tx_in.tx_out_id AND tx_out.index = tx_in.tx_out_index
            WHERE tx_in.tx_in_id IN (SELECT tx_id FROM a) AND tx_out.stake_address_id = $1
          )
          UNION ALL
          (
            SELECT tx_id, -amount AS amount, NULL AS tx_in_id, NULL AS tx_out_id, 4 AS type
            FROM withdrawal
            WHERE addr_id = $1 AND tx_id ${dir === 'desc' ? '<' : '>'} $2
            ORDER BY tx_id ${dir}
            LIMIT ${limit + 1}
          )
          UNION ALL
          (
            SELECT et.tx_id, r.amount, NULL AS tx_in_id, NULL AS tx_out_id, 8 AS type
            FROM (
              SELECT spendable_epoch AS epoch_no, SUM(amount) AS amount
              FROM reward
              WHERE addr_id = $1 AND spendable_epoch ${dir === 'desc' ? '<=' : '>='} $3
              GROUP BY spendable_epoch
              ORDER BY spendable_epoch ${dir}
              LIMIT ${limit + 1}
            ) AS r
            LEFT JOIN unnest($4::int[], $5::bigint[]) AS et (epoch_no, tx_id) ON et.epoch_no = r.epoch_no
            ORDER BY r.epoch_no ${dir}
          )
          UNION ALL
          (
            SELECT et.tx_id, r.amount, NULL AS tx_in_id, NULL AS tx_out_id, 16 AS type
            FROM (
              SELECT spendable_epoch AS epoch_no, SUM(amount) AS amount
              FROM reward_rest
              WHERE addr_id = $1 AND spendable_epoch ${dir === 'desc' ? '<=' : '>='} $3
              GROUP BY spendable_epoch
              ORDER BY spendable_epoch ${dir}
              LIMIT ${limit + 1}
            ) AS r
            LEFT JOIN unnest($4::int[], $5::bigint[]) AS et (epoch_no, tx_id) ON et.epoch_no = r.epoch_no
            ORDER BY r.epoch_no ${dir}
          )
        ) AS t
        LEFT JOIN tx ON tx.id = t.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        GROUP BY t.tx_id, tx.hash, tx.fee, tx.deposit, b.block_no, tx.block_index, b.hash, b.epoch_no, b.slot_no, b.epoch_slot_no, b.time
        ORDER BY t.tx_id ${dir}
        LIMIT ${limit + 1}
      `,
        queryValues,
        limit,
        (row) => {
          if (row.tx_in_ids) {
            maInIdValues.push(row.tx_in_ids)
            for (const id of row.tx_in_ids.split(',')) {
              maInIds[id] = row.cursor
            }
          }
          if (row.tx_out_ids) {
            maOutIdValues.push(row.tx_out_ids)
            for (const id of row.tx_out_ids.split(',')) {
              maOutIds[id] = row.cursor
            }
          }

          row.token = 0
          row.tokens = {
            rows: [],
          }

          if (row.type === 8 || row.type === 16 || row.type === 24) {
            // rewards only
            delete row.tx_fee
            delete row.tx_deposit
            delete row.tx_hash
            delete row.block_hash
            delete row.block_index
            delete row.block_no
          }

          if (row.tx_hash) {
            txHashes[row.tx_hash] = row.cursor
          }

          delete row.tx_in_ids
          delete row.tx_out_ids
          delete row.type
        }
      ))

      const tokenIds = new Set(),
        tokenTx: AnyObject = {}

      if (maInIdValues.length || maOutIdValues.length) {
        const maQuery: string[] = [],
          maQueryValues: bigint[][] = []

        if (maInIdValues.length) {
          maQueryValues.push(maInIdValues)
          maQuery.push(`
            (
              SELECT -quantity AS quantity, ident, tx_out_id
              FROM ma_tx_out
              WHERE tx_out_id = ANY($${maQueryValues.length}::bigint[])
            )
          `)
        }
        if (maOutIdValues.length) {
          maQueryValues.push(maOutIdValues)
          maQuery.push(`
            (
              SELECT quantity, ident, tx_out_id
              FROM ma_tx_out
              WHERE tx_out_id = ANY($${maQueryValues.length}::bigint[])
            )
          `)
        }

        const { rows: maTxOutRows } = await query(maQuery.join('UNION ALL'), maQueryValues)

        for (const row of maTxOutRows) {
          const tx_id = row.quantity < 0 ? maInIds[row.tx_out_id] : maOutIds[row.tx_out_id]
          if (!tokenTx[tx_id]) {
            tokenTx[tx_id] = {}
          }
          if (!tokenTx[tx_id][row.ident]) {
            tokenTx[tx_id][row.ident] = 0n
          }
          tokenTx[tx_id][row.ident] += BigInt(row.quantity)
        }

        for (const tx_id of Object.keys(tokenTx)) {
          for (const token_id of Object.keys(tokenTx[tx_id])) {
            if (tokenTx[tx_id][token_id] !== 0) {
              tokenIds.add(token_id)
            } else {
              delete tokenTx[tx_id][token_id]
            }
          }
        }

        if (tokenIds.size > 0) {
          const { rows: maRows } = await query(
            `
            SELECT m.id, encode(m.policy, 'hex') AS policy, convert_asset_name(m.name) AS asset_name, encode(m.name, 'hex') AS asset_name_hex, m.fingerprint AS fingerprint, md.id AS meta_id, md.json AS meta_data
            FROM multi_asset AS m
            LEFT JOIN adastat_multi_asset AS am ON am.id = m.id
            LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
            WHERE m.id = ANY($1::bigint[])
          `,
            [[...tokenIds.values()]]
          )

          const tokens = new Map<bigint, AnyObject>()

          for (const tokenRow of maRows) {
            fillTokenData(tokenRow)

            tokens.set(tokenRow.id, tokenRow)

            delete tokenRow.id
          }

          for (const row of rows) {
            const tx_id = txHashes[row.tx_hash]

            const tokenRows: AnyObject[] = []

            if (tokenTx[tx_id]) {
              for (const tokenId of Object.keys(tokenTx[tx_id])) {
                tokenRows.push({
                  ...tokens.get(tokenId as any),
                  quantity: tokenTx[tx_id][tokenId],
                })
              }
            }

            row.token = tokenRows.length
            row.tokens = {
              rows: tokenRows,
            }
          }
        }
      }
    }
  } else if (rowsType === 'staking') {
    if (item.stake_history || item.total_leader > 0) {
      const stakeKeyHistory: AnyObject = {}
      const { rows: stakeKeyRows } = await query(
        `
        (
          SELECT TRUE AS stake_key_register, cert_index, epoch_no, tx_id
          FROM stake_registration
          WHERE addr_id = $1
        )
        UNION ALL
        (
          SELECT FALSE AS stake_key_register, cert_index, epoch_no, tx_id
          FROM stake_deregistration
          WHERE addr_id = $1
        )
        ORDER BY tx_id, cert_index
      `,
        [accountId]
      )

      for (const stakeKeyRow of stakeKeyRows) {
        stakeKeyHistory[stakeKeyRow.epoch_no] = stakeKeyRow.stake_key_register
      }

      let stakeKeyRegister = false
      for (let epoch = networkParams.shelley; epoch <= latestBlock.epoch_no; epoch++) {
        if (stakeKeyHistory[epoch]) {
          stakeKeyRegister = stakeKeyHistory[epoch]
        }
        stakeKeyHistory[epoch] = stakeKeyRegister
      }

      queryValues.push(accountId, latestBlock.epoch_no, networkParams.shelley + 1)
      if (after) {
        if (dir === 'asc') {
          queryValues[2] = after
        } else if ((after as any) < latestBlock.epoch_no) {
          queryValues[1] = after
        }
      }

      const storageData = await getData()

      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT u.epoch_no AS cursor, es.amount AS stake, u.epoch_no::integer AS earned_epoch_no, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker, aep.block AS pool_block, CASE WHEN pu.pledge > aep_r.real_pledge THEN TRUE ELSE FALSE END AS broken_pledge, r.type, r.amount, r.spendable_epoch::integer AS epoch_no, NULL AS slot_no, NULL AS epoch_slot_no, NULL AS time
        FROM (
          (
            SELECT earned_epoch AS epoch_no
            FROM reward
            WHERE addr_id = $1 AND type IN ('leader', 'member') AND earned_epoch < $2 AND earned_epoch > $3
          ) UNION (
            SELECT epoch_no
            FROM epoch_stake
            WHERE addr_id = $1 AND epoch_no < $2 AND epoch_no > $3
          )
          ORDER BY epoch_no ${dir}
          LIMIT ${limit + 1}
        ) AS u
        LEFT JOIN reward AS r ON r.addr_id = $1 AND r.type IN ('member', 'leader') AND r.earned_epoch = u.epoch_no
        LEFT JOIN epoch_stake AS es ON es.epoch_no = u.epoch_no AND es.addr_id = $1
        LEFT JOIN pool_hash AS ph ON ph.id = COALESCE(r.pool_id, es.pool_id)
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        LEFT JOIN epoch AS e ON e.no = u.epoch_no
        LEFT JOIN adastat_epoch_pool AS aep ON aep.epoch_no = e.no AND aep.pool_id = ap.id
        LEFT JOIN epoch AS e_r ON e_r.no = u.epoch_no - 2
        LEFT JOIN adastat_epoch_pool AS aep_r ON aep_r.epoch_no = e_r.no AND aep_r.pool_id = ap.id
        LEFT JOIN pool_update AS pu ON pu.id = aep_r.update_id
        ORDER BY u.epoch_no ${dir}
      `,
        queryValues,
        limit,
        (row) => {
          if (!row.epoch_no) {
            row.epoch_no = row.earned_epoch_no + 2
          }

          const epochData = storageData.epochs.get(row.epoch_no)

          if (epochData) {
            row.slot_no = epochData.firstSlotNo
            row.epoch_slot_no = epochData.firstEpochSlotNo
            row.time = parseInt(
              networkParams.startTime +
                row.epoch_no * networkParams.epochLength * networkParams.slotLength +
                row.epoch_slot_no
            )
          }
          if (!row.type || row.amount === 0) {
            row.amount = 0n
            if (!stakeKeyHistory[row.epoch_no - 1] || row.broken_pledge) {
              row.type = 'orphan'
            } else if (row.pool_block === 0) {
              row.type = 'none'
            } else if (row.time) {
              row.type = 'zero'
            } else {
              row.amount = item.pending_reward_amount
              row.type = item.pending_reward_amount_type
            }
          }
        }
      ))
    }
  } else if (rowsType === 'nfts') {
    if (item.token > 0) {
      queryValues.push(accountId)
      where.push('p.holder <= p.token')

      if (policyFilter) {
        queryValues.push('\\x' + policyFilter)

        if (after) {
          queryValues.push(after)
        }
      } else if (after) {
        where.push(`(col.token_count, col.policy_id) < ($2, $3)`)
        queryValues.push(cursorValues[0])
        queryValues.push(cursorValues[1])
      }

      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT c.cursor, c.token_count, c.token AS total_token_count, encode(m.policy, 'hex') AS policy, json_agg(json_build_object('id', m.id, 'asset_name', convert_asset_name(m.name), 'asset_name_hex', encode(m.name, 'hex'), 'fingerprint', m.fingerprint, 'meta_id', md.id, 'meta_data', md.json)) AS tokens
        FROM (
          SELECT CONCAT(col.token_count, '-', col.policy_id) AS cursor, col.token_count, col.policy_id, col.tokens, p.token, p.holder
          FROM (
            SELECT policy_id, COUNT(*) AS token_count, array_agg(ma_id) AS tokens
            FROM adastat_ma_holder
            WHERE account_id = $1
            ${policyFilter ? 'AND policy_id = (SELECT id FROM adastat_ma_policy WHERE policy = $2 LIMIT 1)' : ''}
            GROUP BY policy_id
          ) AS col
          LEFT JOIN adastat_ma_policy AS p ON p.id = col.policy_id
          WHERE ${where.join(' AND ')}
          ORDER BY col.token_count DESC, col.policy_id DESC
          LIMIT ${limit + 1}
        ) AS c
        CROSS JOIN LATERAL (
          SELECT id, policy, name, fingerprint
          FROM multi_asset
          WHERE id = ANY(c.tokens)
          ${policyFilter && after ? 'AND id < $3' : ''}
          ORDER BY id DESC
          LIMIT ${limit + 1}
        ) AS m
        LEFT JOIN adastat_multi_asset AS am ON am.id = m.id
        LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
        GROUP BY c.cursor, c.token_count, c.policy_id, c.token, m.policy
        ORDER BY c.token_count DESC, c.policy_id DESC
      `,
        queryValues,
        limit,
        (row) => {
          const tokens = row.tokens

          row.tokens = {
            rows: [],
          }

          let tokenAfter,
            tokenNext = false

          for (const token of tokens) {
            if (row.tokens.rows.length < limit) {
              tokenAfter = token.id

              token.policy = row.policy
              token.image = ''

              fillTokenData(token)

              delete token.policy
              delete token.id

              row.tokens.rows.push(token)
            } else {
              tokenNext = true
            }
          }

          if (tokenAfter) {
            row.tokens.cursor = {
              after: tokenAfter,
              next: tokenNext,
            }
          }
        }
      ))
    }
  } else if (rowsType === 'fts') {
    if (item.token > 0) {
      where.push('amh.account_id = $1 AND p.holder > p.token')
      queryValues.push(accountId)
      if (after) {
        where.push(`amh.ma_id ${dir === 'asc' ? '>' : '<'} $2`)
        queryValues.push(after)
      }

      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT mh.ma_id AS cursor, encode(m.policy, 'hex') AS policy, convert_asset_name(m.name) AS asset_name, encode(m.name, 'hex') AS asset_name_hex, m.fingerprint AS fingerprint, md.id AS meta_id, md.json AS meta_data, mh.quantity, am.supply
        FROM (
          SELECT amh.ma_id, SUM(amh.quantity) AS quantity
          FROM adastat_ma_holder AS amh
          LEFT JOIN adastat_ma_policy AS p ON p.id = amh.policy_id
          WHERE ${where.join(' AND ')}
          GROUP BY amh.ma_id
          ORDER BY amh.ma_id ${dir}
          LIMIT ${limit + 1}
        ) AS mh
        LEFT JOIN multi_asset AS m ON m.id = mh.ma_id
        LEFT JOIN adastat_multi_asset AS am ON am.id = m.id
        LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
        ORDER BY mh.ma_id ${dir}
      `,
        queryValues,
        limit,
        (row) => {
          row.image = ''

          fillTokenData(row)
        }
      ))
    }
  } else if (rowsType === 'addresses') {
    if (item.address > 0) {
      where.push(`account_id = $1`)

      queryValues.push(accountId)
      if (after) {
        where.push(`(amount, id) ${dir === 'asc' ? '>' : '<'} ($2, $3)`)
        queryValues.push(cursorValues[0])
        queryValues.push(cursorValues[1])
      }
      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT CONCAT(a.amount, '-', a.id) AS cursor, a.address, a.amount AS balance, a.tx, a.token, encode(ft.hash::bytea, 'hex') AS first_tx_hash, EXTRACT(epoch FROM fb.time)::integer AS first_tx_time, encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time
        FROM (
          SELECT id, address, amount, first_tx, last_tx, tx, token
          FROM adastat_address
          WHERE ${where.join(' AND ')}
          ORDER BY amount ${dir}, id ${dir}
          LIMIT ${limit + 1}
        ) AS a
        LEFT JOIN tx AS ft ON ft.id = a.first_tx
        LEFT JOIN block AS fb ON fb.id = ft.block_id
        LEFT JOIN tx AS lt ON lt.id = a.last_tx
        LEFT JOIN block AS lb ON lb.id = lt.block_id
        ORDER BY a.amount ${dir}, a.id ${dir}
      `,
        queryValues,
        limit
      ))
    }
  } else if (rowsType === 'stakekey') {
    if (item.key_history) {
      where.push(`t.addr_id = $1`)

      queryValues.push(accountId)

      if (after) {
        where.push(`(t.tx_id, t.cert_index) ${dir === 'asc' ? '>' : '<'} ($2, $3)`)
        queryValues.push(cursorValues[0])
        queryValues.push(cursorValues[1])
      }
      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT CONCAT(sk.tx_id, '-', sk.cert_index) AS cursor, sk.type, sk.cert_index, sk.amount, sk.from_hash, sk.from_bech32, sk.from_name, sk.from_ticker, sk.to_hash, sk.to_bech32, sk.to_name, sk.to_ticker, b.epoch_no::integer AS epoch_no, encode(b.hash::bytea, 'hex') AS block_hash, b.block_no AS block_no, encode(tx.hash::bytea, 'hex') AS tx_hash, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time
        FROM (
          SELECT type, tx_id, cert_index, amount, from_hash, from_bech32, from_name, from_ticker, to_hash, to_bech32, to_name, to_ticker
          FROM (
            (
              SELECT 'registration' AS type, t.tx_id, t.cert_index, t.deposit AS amount, NULL AS from_hash, NULL AS from_bech32, NULL AS from_name, NULL AS from_ticker, NULL AS to_hash, NULL AS to_bech32, NULL AS to_name, NULL AS to_ticker
              FROM stake_registration AS t
              WHERE ${where.join(' AND ')}
              ORDER BY t.tx_id ${dir}, t.cert_index ${dir}
              LIMIT ${limit + 1}
            ) UNION ALL (
              SELECT 'deregistration' AS type, t.tx_id, t.cert_index, 2000000 AS amount, NULL AS from_hash, NULL AS from_bech32, NULL AS from_name, NULL AS from_ticker, NULL AS to_hash, NULL AS to_bech32, NULL AS to_name, NULL AS to_ticker
              FROM stake_deregistration AS t
              WHERE ${where.join(' AND ')}
              ORDER BY t.tx_id ${dir}, t.cert_index ${dir}
              LIMIT ${limit + 1}
            ) UNION ALL (
              SELECT 'pool_delegation' AS type, t.tx_id, t.cert_index, ad.amount, encode(phf.hash_raw::bytea, 'hex') AS from_hash, phf.view AS from_bech32, apf.name AS from_name, apf.ticker AS from_ticker, encode(pht.hash_raw::bytea, 'hex') AS to_hash, pht.view AS to_bech32, apt.name AS to_name, apt.ticker AS to_ticker
              FROM delegation AS t
              LEFT JOIN adastat_delegation AS ad ON ad.id = t.id
              LEFT JOIN pool_hash AS phf ON phf.id = ad.from_pool
              LEFT JOIN adastat_pool AS apf ON apf.id = phf.id
              LEFT JOIN pool_hash AS pht ON pht.id = t.pool_hash_id
              LEFT JOIN adastat_pool AS apt ON apt.id = pht.id
              WHERE ${where.join(' AND ')}
              ORDER BY t.tx_id ${dir}, t.cert_index ${dir}
              LIMIT ${limit + 1}
            ) UNION ALL (
              SELECT 'drep_delegation' AS type, t.tx_id, t.cert_index, NULL as amount, NULL as from_hash, NULL as from_bech32, NULL as from_name, NULL as from_ticker, encode(dh.raw::bytea, 'hex') AS to_hash, dh.view AS to_bech32, dh.id::text AS to_name, (22 + dh.has_script::int)::text AS to_ticker
              FROM delegation_vote AS t
              LEFT JOIN drep_hash AS dh ON dh.id = t.drep_hash_id
              WHERE ${where.join(' AND ')}
              ORDER BY t.tx_id ${dir}, t.cert_index ${dir}
              LIMIT ${limit + 1}
            )
          ) AS u
          ORDER BY tx_id ${dir}, cert_index ${dir}
          LIMIT ${limit + 1}
        ) AS sk
        LEFT JOIN tx ON tx.id = sk.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        ORDER BY sk.tx_id ${dir}, sk.cert_index ${dir}
      `,
        queryValues,
        limit,
        (row) => {
          if (row.type === 'drep_delegation') {
            const drep = dreps.get(row.to_name)
            if (drep) {
              row.drep_bech32 = drep.bech32
              row.drep_base16 = drep.base16
              row.drep_has_script = drep.has_script
              row.drep_given_name = drep.given_name
              row.drep_image = drep.image
            } else {
              row.drep_base16 = row.to_ticker + row.to_hash
              row.drep_bech32 = toBech32('drep', row.drep_base16)
              row.drep_has_script = row.to_ticker === 23
              row.drep_given_name = ''
              row.drep_image = ''
            }
          }

          if (row.type !== 'pool_delegation') {
            delete row.from_hash
            delete row.from_bech32
            delete row.from_ticker
            delete row.from_name
            delete row.to_hash
            delete row.to_bech32
            delete row.to_ticker
            delete row.to_name
          }
        }
      ))
    }
  }

  return {
    rows,
    cursor,
  }
}
