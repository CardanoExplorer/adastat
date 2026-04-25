import { networkParams } from '@/config.ts'
import { cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError, toBech32 } from '@/helper.ts'
import { idValues as drepIdValues, votingAnchorIdValues as drepVotingAnchorIdValues } from '@/helpers/dreps.ts'
import { fill as fillTokenData } from '@/helpers/tokens.ts'
import type { QueryString } from '@/schema.ts'
import { getData, latestBlock } from '@/storage.ts'
import type { TxTable } from '@/types/tables.ts'

export const sortFieldMap = {
  time: 'tx.id',
  amount: 'at.amount',
  out_sum: 'tx.out_sum',
  fee: 'tx.fee',
  deposit: 'tx.deposit',
  size: 'tx.size',
  token: 'at.token',
  script_size: 'tx.script_size',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  hash: "encode(tx.hash::bytea, 'hex')",
  block_no: 'COALESCE(b.block_no, 0)',
  block_index: 'tx.block_index',
  block_hash: "encode(b.hash::bytea, 'hex')",
  epoch_no: 'b.epoch_no::integer',
  slot_no: 'b.slot_no::integer',
  epoch_slot_no: 'b.epoch_slot_no',
  time: 'EXTRACT(epoch FROM b.time)::integer',
  size: 'tx.size',
  amount: 'COALESCE(at.amount, np.amount)',
  out_sum: 'tx.out_sum',
  fee: 'tx.fee',
  deposit: 'tx.deposit',
  script_size: 'tx.script_size',
  token: 'COALESCE(at.token, np.token)',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

const blockFields = Object.entries(fieldMap)
  .filter(([, v]) => !v.includes('b.'))
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

const txType = {
  stake_registration: 1,
  delegation: 2,
  stake_deregistration: 4,
  pool_update: 8,
  pool_retire: 16,
  withdrawal: 32,
  reserve: 64,
  treasury: 128,
  metadata: 256,
  token_mint: 512,
  redeemer: 1024,
}

const getNonParsedValues = async () => {
  const { nonParsedBlocks } = await getData(),
    nonParsedTxId: bigint[] = [],
    nonParsedTxAmount: bigint[] = [],
    nonParsedTxToken: number[] = []

  for (const nonParsedBlock of nonParsedBlocks.values()) {
    for (const nonParsedTx of nonParsedBlock.txs.values()) {
      nonParsedTxId.push(nonParsedTx.id)
      nonParsedTxAmount.push(nonParsedTx.amount)
      nonParsedTxToken.push(nonParsedTx.token)
    }
  }

  return [nonParsedTxId, nonParsedTxAmount, nonParsedTxToken]
}

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'epoch'; id: number } | { type: 'block'; id: bigint }
) => {
  const where: string[] = [],
    queryValues: any[] = await getNonParsedValues()

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`,
    queryText: string

  if (item?.type === 'epoch') {
    const storageData = await getData()

    queryValues.push(storageData.epochs.get(item.id)?.firstTxId ?? 0n)
    where.push(`${sort === 'amount' || sort === 'token' ? 'at.id' : 'tx.id'} >= $${queryValues.length}`)

    const nextEpoch = storageData.epochs.get(item.id + 1)
    if (nextEpoch) {
      queryValues.push(nextEpoch.firstTxId)
      where.push(`${sort === 'amount' || sort === 'token' ? 'at.id' : 'tx.id'} < $${queryValues.length}`)
    }

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}`
  } else if (item?.type === 'block') {
    queryValues.push(item.id)

    where.push(`tx.block_id = $${queryValues.length}`)

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}`
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(cursorValues[0])
    if (sort === 'time') {
      where.push(`tx.id ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
    } else {
      const tableId = sort === 'amount' || sort === 'token' ? 'at.id' : 'tx.id'

      queryValues.push(cursorValues[1])

      where.push(
        `(${sortFieldMap[sort]}, ${tableId}) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )

      orderBy += `, ${tableId} ${dir}`
    }
  }

  if ((sort === 'amount' || sort === 'token') && item?.type !== 'block') {
    queryText = `
      SELECT at.id
      FROM adastat_tx AS at
    `
  } else {
    queryText = `
      SELECT tx.id
      FROM tx AS tx
      ${sort === 'amount' || sort === 'token' ? 'LEFT JOIN adastat_tx AS at ON at.id = tx.id' : ''}
    `
  }

  return await cursorQuery(
    `
    SELECT ${sort === 'time' ? 'tx.id' : 'CONCAT(' + sortFieldMap[sort] + ",'-',tx.id)"} AS cursor, ${item?.type === 'block' ? blockFields : fields}
    FROM (
      ${queryText}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy}
      LIMIT ${limit + 1}
      ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
    ) AS rows
    LEFT JOIN tx ON tx.id = rows.id
    LEFT JOIN adastat_tx AS at ON at.id = tx.id
    LEFT JOIN unnest($1::int[], $2::bigint[], $3::bigint[]) AS np (id, amount, token) ON np.id = tx.id
    ${item?.type === 'block' ? '' : 'LEFT JOIN block AS b ON b.id = tx.block_id'}
    ${orderBy}
  `,
    queryValues,
    limit
  )
}

export const getItem = async (itemId: string) => {
  let data, prev, next, dataId: bigint, prevId: bigint, nextId: bigint

  if (itemId === networkParams.firstTxHash) {
    const { rows: idRows } = await query<Pick<TxTable, 'id'>>(
      `
      SELECT id
      FROM tx
      ORDER BY id ASC
      LIMIT 2
    `
    )

    prevId = 0n
    dataId = idRows[0]?.id ?? 0n
    nextId = idRows[1]?.id ?? 0n
  } else {
    const { rows: idRows } = await query<Pick<TxTable, 'id'>>(
      `
      SELECT id
      FROM tx
      WHERE id >= (
        SELECT id
        FROM tx
        WHERE id < (
          SELECT id
          FROM tx
          WHERE hash = $1
        )
        ORDER BY id DESC
        LIMIT 1
      )
      ORDER BY id ASC
      LIMIT 3
    `,
      ['\\x' + itemId]
    )

    prevId = idRows[0]?.id ?? 0n
    dataId = idRows[1]?.id ?? 0n
    nextId = idRows[2]?.id ?? 0n
  }

  if (dataId) {
    const queryValues: any[] = await getNonParsedValues()

    queryValues.push([prevId, dataId, nextId])

    const { rows: txRows } = await query(
      `
      SELECT tx.id, at.type, ${fields}, tx.treasury_donation, tx.valid_contract
      FROM tx
      LEFT JOIN adastat_tx AS at ON at.id = tx.id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN unnest($1::int[], $2::bigint[], $3::bigint[]) AS np (id, amount, token) ON np.id = tx.id
      WHERE tx.id = ANY($4::bigint[])
    `,
      queryValues
    )

    for (const txRow of txRows) {
      if (txRow.id === prevId) {
        prev = txRow
        delete prev.type
      } else if (txRow.id === dataId) {
        data = txRow
        data.confirmation = latestBlock.block_no - txRow.block_no
      } else if (txRow.id === nextId) {
        next = txRow
        delete next.type
      }

      delete txRow.id
    }
  }

  if (!data) {
    return throwError(404)
  }

  const [
    txOut,
    txIn,
    withdrawal,
    stake_registration,
    delegation,
    stake_deregistration,
    pool_update,
    pool_retire,
    reserve,
    treasury,
    metadata,
    gov_action,
    gov_vote,
    drep_reg,
    drep_deleg,
    committee,
    redeemer,
  ] = await Promise.all([
    query(
      `
      SELECT tx_out.index, tx_out.value AS amount, tx_out.address, tx_out.address_has_script, encode(tx_out.data_hash::bytea, 'hex') AS data_hash, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32, jsonb_build_object('rows', coalesce(jsonb_agg(jsonb_build_object('quantity', ma_tx_out.quantity, 'policy', encode(multi_asset.policy::bytea, 'hex'), 'asset_name', convert_asset_name(multi_asset.name), 'asset_name_hex', encode(multi_asset.name, 'hex'), 'fingerprint', multi_asset.fingerprint, 'meta_data', tx_metadata.json, 'genuine', adastat_multi_asset.genuine)) FILTER (WHERE ma_tx_out.id IS NOT NULL), '[]'::jsonb)) AS tokens
      FROM tx_out
      LEFT JOIN stake_address ON stake_address.id = tx_out.stake_address_id
      LEFT JOIN ma_tx_out ON ma_tx_out.tx_out_id = tx_out.id
      LEFT JOIN multi_asset ON multi_asset.id = ma_tx_out.ident
      LEFT JOIN adastat_multi_asset ON adastat_multi_asset.id = multi_asset.id
      LEFT JOIN tx_metadata ON tx_metadata.id = adastat_multi_asset.meta_id
      WHERE tx_out.tx_id = $1
      GROUP BY tx_out.index, tx_out.value, tx_out.address, tx_out.address_has_script, tx_out.data_hash, stake_address.hash_raw, stake_address.view
      ORDER BY tx_out.index ASC
    `,
      [dataId]
    ),
    query(
      `
      SELECT encode(tx.hash::bytea, 'hex') AS utxo_hash, tx_out.index AS utxo_index, (ROW_NUMBER() OVER (ORDER BY tx_in.id ASC)) - 1 AS index, tx_out.value AS amount, tx_out.address, tx_out.address_has_script, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32, jsonb_build_object('rows', coalesce(jsonb_agg(jsonb_build_object('quantity', ma_tx_out.quantity, 'policy', encode(multi_asset.policy::bytea, 'hex'), 'asset_name', convert_asset_name(multi_asset.name), 'asset_name_hex', encode(multi_asset.name, 'hex'), 'fingerprint', multi_asset.fingerprint, 'meta_data', tx_metadata.json, 'genuine', adastat_multi_asset.genuine)) FILTER (WHERE ma_tx_out.id IS NOT NULL), '[]'::jsonb)) AS tokens
      FROM tx_in
      LEFT JOIN tx_out ON (tx_out.tx_id = tx_in.tx_out_id AND tx_out.index = tx_in.tx_out_index)
      LEFT JOIN tx ON tx.id = tx_out.tx_id
      LEFT JOIN stake_address ON stake_address.id = tx_out.stake_address_id
      LEFT JOIN ma_tx_out ON ma_tx_out.tx_out_id = tx_out.id
      LEFT JOIN multi_asset ON multi_asset.id = ma_tx_out.ident
      LEFT JOIN adastat_multi_asset ON adastat_multi_asset.id = multi_asset.id
      LEFT JOIN tx_metadata ON tx_metadata.id = adastat_multi_asset.meta_id
      WHERE tx_in.tx_in_id = $1
      GROUP BY tx_in.id, tx.hash, tx_out.index, tx_out.value, tx_out.address, tx_out.address_has_script, stake_address.hash_raw, stake_address.view
      ORDER BY tx_in.id ASC
    `,
      [dataId]
    ),
    data.type === null || data.type & txType.withdrawal
      ? query(
          `
      SELECT (ROW_NUMBER() OVER ()) - 1 AS index, withdrawal.amount, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32
      FROM withdrawal
      LEFT JOIN stake_address ON stake_address.id = withdrawal.addr_id
      WHERE withdrawal.tx_id = $1
      ORDER BY withdrawal.id ASC
    `,
          [dataId]
        )
      : { rows: [] },
    data.type === null || data.type & txType.stake_registration
      ? query(
          `
      SELECT stake_registration.cert_index AS index, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32, stake_registration.deposit AS deposit_amount
      FROM stake_registration
      LEFT JOIN stake_address ON stake_address.id = stake_registration.addr_id
      WHERE stake_registration.tx_id = $1
      ORDER BY stake_registration.cert_index ASC
    `,
          [dataId]
        )
      : { rows: [] },
    data.type === null || data.type & txType.delegation
      ? query(
          `
      SELECT delegation.cert_index AS index, delegation.active_epoch_no::integer, $2 + delegation.active_epoch_no::integer * $3 AS active_time, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32, adastat_delegation.amount, encode(pool_from.hash_raw::bytea, 'hex') AS from_pool_hash, pool_from.view AS from_pool_bech32, adastat_pool_from.name AS from_pool_name, adastat_pool_from.ticker AS from_pool_ticker, encode(pool_to.hash_raw::bytea, 'hex') AS to_pool_hash, pool_to.view AS to_pool_bech32, adastat_pool_to.name AS to_pool_name, adastat_pool_to.ticker AS to_pool_ticker
      FROM delegation
      LEFT JOIN adastat_delegation ON adastat_delegation.id = delegation.id
      LEFT JOIN stake_address ON stake_address.id = delegation.addr_id
      LEFT JOIN pool_hash AS pool_from ON pool_from.id = adastat_delegation.from_pool
      LEFT JOIN adastat_pool AS adastat_pool_from ON adastat_pool_from.id = pool_from.id
      LEFT JOIN pool_hash AS pool_to ON pool_to.id = delegation.pool_hash_id
      LEFT JOIN adastat_pool AS adastat_pool_to ON adastat_pool_to.id = pool_to.id
      WHERE delegation.tx_id = $1
      ORDER BY delegation.cert_index ASC
    `,
          [dataId, networkParams.startTime, networkParams.epochLength * networkParams.slotLength]
        )
      : { rows: [] },
    data.type === null || data.type & txType.stake_deregistration
      ? query(
          `
      SELECT DISTINCT ON (stake_deregistration.cert_index) stake_deregistration.cert_index AS index, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32, -epoch_param.key_deposit AS deposit_amount
      FROM stake_deregistration
      LEFT JOIN stake_address ON stake_address.id = stake_deregistration.addr_id
      LEFT JOIN stake_registration ON stake_registration.addr_id = stake_address.id AND (stake_registration.tx_id, stake_registration.cert_index) < (stake_deregistration.tx_id, stake_deregistration.cert_index)
      LEFT JOIN epoch_param ON epoch_param.epoch_no = stake_registration.epoch_no
      WHERE stake_deregistration.tx_id = $1
      ORDER BY stake_deregistration.cert_index ASC, stake_registration.id DESC
    `,
          [dataId]
        )
      : { rows: [] },
    data.type === null || data.type & txType.pool_update
      ? query(
          `
      SELECT pool_update.cert_index AS index, pool_update.pledge, pool_update.margin::numeric, pool_update.fixed_cost, pool_update.active_epoch_no::integer, $2 + pool_update.active_epoch_no::integer * $3 AS active_time, pool_update.deposit AS deposit_amount, encode(pool_update.vrf_key_hash::bytea, 'hex') AS vrf_key_hash, reward_stake_address.view AS reward_address_bech32, encode(reward_stake_address.hash_raw::bytea, 'hex') AS reward_address_base16, coalesce(jsonb_agg(DISTINCT jsonb_build_object('base16', encode(owner_stake_address.hash_raw::bytea, 'hex'), 'bech32', owner_stake_address.view)) FILTER (WHERE pool_owner.addr_id IS NOT NULL), '[]'::jsonb) AS owners, coalesce(jsonb_agg(DISTINCT jsonb_build_object('relay', coalesce(pool_relay.ipv4, pool_relay.ipv6, pool_relay.dns_name, pool_relay.dns_srv_name), 'port', pool_relay.port)), '[]'::jsonb) AS relays, pool_metadata_ref.url AS meta_url, encode(pool_metadata_ref.hash::bytea, 'hex') AS meta_hash, encode(pool_hash.hash_raw::bytea, 'hex') AS pool_hash, pool_hash.view AS pool_bech32, adastat_pool.name AS pool_name, adastat_pool.ticker AS pool_ticker
      FROM pool_update
      LEFT JOIN stake_address AS reward_stake_address ON reward_stake_address.id = pool_update.reward_addr_id
      LEFT JOIN pool_hash ON pool_hash.id = pool_update.hash_id
      LEFT JOIN adastat_pool ON adastat_pool.id = pool_hash.id
      LEFT JOIN pool_metadata_ref ON pool_metadata_ref.id = pool_update.meta_id
      LEFT JOIN pool_owner ON pool_owner.pool_update_id = pool_update.id
      LEFT JOIN stake_address AS owner_stake_address ON owner_stake_address.id = pool_owner.addr_id
      LEFT JOIN pool_relay ON pool_relay.update_id = pool_update.id
      WHERE pool_update.registered_tx_id = $1
      GROUP BY pool_update.id, reward_stake_address.id, pool_metadata_ref.id, pool_hash.id, adastat_pool.id
      ORDER BY pool_update.cert_index ASC
    `,
          [dataId, networkParams.startTime, networkParams.epochLength * networkParams.slotLength]
        )
      : { rows: [] },
    data.type === null || data.type & txType.pool_retire
      ? query(
          `
      SELECT pool_retire.cert_index AS index, pool_retire.retiring_epoch AS retiring_epoch_no, $2 + pool_retire.retiring_epoch * $3 AS retiring_time, encode(pool_hash.hash_raw::bytea, 'hex') AS pool_hash, pool_hash.view AS pool_bech32, adastat_pool.name AS pool_name, adastat_pool.ticker AS pool_ticker, pool_update.deposit AS deposit_amount
      FROM pool_retire
      LEFT JOIN pool_hash ON pool_hash.id = pool_retire.hash_id
      LEFT JOIN adastat_pool ON adastat_pool.id = pool_hash.id
      LEFT JOIN pool_update ON pool_update.id = adastat_pool.registration_id
      WHERE pool_retire.announced_tx_id = $1
      ORDER BY pool_retire.cert_index ASC
    `,
          [dataId, networkParams.startTime, networkParams.epochLength * networkParams.slotLength]
        )
      : { rows: [] },
    data.type === null || data.type & txType.reserve
      ? query(
          `
      SELECT reserve.cert_index AS index, reserve.amount, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32
      FROM reserve
      LEFT JOIN stake_address ON stake_address.id = reserve.addr_id
      WHERE reserve.tx_id = $1
      ORDER BY reserve.id ASC
    `,
          [dataId]
        )
      : { rows: [] },
    data.type === null || data.type & txType.treasury
      ? query(
          `
      SELECT treasury.cert_index AS index, treasury.amount, encode(stake_address.hash_raw::bytea, 'hex') AS stake_base16, stake_address.view AS stake_bech32
      FROM treasury
      LEFT JOIN stake_address ON stake_address.id = treasury.addr_id
      WHERE treasury.tx_id = $1
      ORDER BY treasury.id ASC
    `,
          [dataId]
        )
      : { rows: [] },
    data.type === null || data.type & txType.metadata
      ? query(
          `
      SELECT (ROW_NUMBER() OVER ()) - 1 AS index, tx_metadata.key, tx_metadata.json AS data, LENGTH(bytes) AS size, encode(bytes::bytea, 'hex') AS bytes
      FROM tx_metadata
      WHERE tx_id = $1
      ORDER BY id ASC
    `,
          [dataId]
        )
      : { rows: [] },
    query(
      `
      SELECT gap.index, LOWER(gap.type::text) AS type, gap.expiration AS expiration_epoch, $2 + gap.expiration * $3 AS expiration_time, gap.deposit AS deposit_amount, sa.view AS deposit_address_bech32, encode(sa.hash_raw::bytea, 'hex') AS deposit_address_base16, va.url AS meta_url, encode(va.data_hash, 'hex') AS meta_hash, d.title
      FROM gov_action_proposal AS gap
      LEFT JOIN stake_address AS sa ON sa.id = gap.return_address
      LEFT JOIN voting_anchor AS va ON va.id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_data ON off_chain_vote_data.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data AS d ON d.off_chain_vote_data_id = off_chain_vote_data.id
      WHERE gap.tx_id = $1
      ORDER BY gap.index ASC
    `,
      [dataId, networkParams.startTime, networkParams.epochLength * networkParams.slotLength]
    ),
    query(
      `
      SELECT LOWER(vp.voter_role::text) AS voter_role, LOWER(vp.vote::text) AS vote, vp.index, gap.index AS ga_index, d.title, encode(COALESCE(dh.raw, ph.hash_raw, ch.raw)::bytea, 'hex') AS voter, COALESCE(dh.view, ph.view, cardano.bech32_encode('cc_cold', ('\\x1' || 2 + ch.has_script::int)::bytea || ch.raw)) AS bech32, COALESCE(dh.has_script, ch.has_script) AS has_script, ap.name AS pool_name, ap.ticker AS pool_ticker, COALESCE(ovdd.given_name, cm.name) AS given_name, COALESCE(ovdd.image_url, cm.image) AS image, va.url AS meta_url, encode(va.data_hash, 'hex') AS meta_hash
      FROM voting_procedure AS vp
      LEFT JOIN voting_anchor AS va ON va.id = vp.voting_anchor_id
      LEFT JOIN gov_action_proposal AS gap ON gap.id = vp.gov_action_proposal_id
      LEFT JOIN off_chain_vote_data ON off_chain_vote_data.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data AS d ON d.off_chain_vote_data_id = off_chain_vote_data.id
      LEFT JOIN drep_hash AS dh ON dh.id = vp.drep_voter
      LEFT JOIN unnest($2::bigint[], $3::bigint[]) AS drep (id, voting_anchor_id) ON drep.id = dh.id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = drep.voting_anchor_id
      LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
      LEFT JOIN pool_hash AS ph ON ph.id = vp.pool_voter
      LEFT JOIN committee_registration AS cr ON cr.hot_key_id = vp.committee_voter
      LEFT JOIN committee_hash AS ch ON ch.id = cr.cold_key_id
      LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
      LEFT JOIN adastat_cc_member AS cm ON cm.id = cr.cold_key_id
      WHERE vp.tx_id = $1
      ORDER BY vp.id ASC
    `,
      [dataId, drepIdValues, drepVotingAnchorIdValues]
    ),
    query(
      `
      SELECT dr.cert_index AS index, dr.deposit AS deposit_amount, va.url AS meta_url, encode(va.data_hash, 'hex') AS meta_hash, ovdd.given_name, (22 + dh.has_script::int) || encode(dh.raw, 'hex') AS base16, cardano.bech32_encode('drep', ('\\x2' || 2 + dh.has_script::int)::bytea || dh.raw) AS bech32, CASE WHEN dh.has_script THEN cardano.bech32_encode('drep_script', dh.raw) ELSE dh.view END AS bech32_legacy, dh.has_script, ovdd.image_url AS image
      FROM drep_registration AS dr
      LEFT JOIN drep_hash AS dh ON dh.id = dr.drep_hash_id
      LEFT JOIN voting_anchor AS va ON va.id = dr.voting_anchor_id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = dr.voting_anchor_id
      LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
      WHERE dr.tx_id = $1
      ORDER BY dr.id ASC
    `,
      [dataId]
    ),
    query(
      `
      SELECT dv.cert_index AS index, ovdd.given_name, (22 + dh.has_script::int) || encode(dh.raw, 'hex') AS base16, cardano.bech32_encode('drep', ('\\x2' || 2 + dh.has_script::int)::bytea || dh.raw) AS bech32, CASE WHEN dh.has_script THEN cardano.bech32_encode('drep_script', dh.raw) ELSE dh.view END AS bech32_legacy, dh.has_script, ovdd.image_url AS image, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32
      FROM delegation_vote AS dv
      LEFT JOIN stake_address AS sa ON sa.id = dv.addr_id
      LEFT JOIN drep_hash AS dh ON dh.id = dv.drep_hash_id
      LEFT JOIN unnest($2::bigint[], $3::bigint[]) AS drep (id, voting_anchor_id) ON drep.id = dh.id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = drep.voting_anchor_id
      LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
      WHERE dv.tx_id = $1
      ORDER BY dv.id ASC
    `,
      [dataId, drepIdValues, drepVotingAnchorIdValues]
    ),
    query(
      `
      SELECT c.index, encode(ch.raw, 'hex') AS cold_hash, ch.has_script AS cold_has_script, cardano.bech32_encode('cc_cold', ('\\x1' || 2 + ch.has_script::int)::bytea || ch.raw) AS cold_bech32, c.hot_hash, c.hot_has_script, c.hot_bech32, c.meta_url, c.meta_hash, CASE WHEN cm.id IS NULL THEN NULL ELSE json_build_object('name', cm.name, 'image', cm.image) END AS member
      FROM (
        (
          SELECT cr.cert_index AS index, encode(ch_h.raw, 'hex') AS hot_hash, ch_h.has_script AS hot_has_script, cardano.bech32_encode('cc_hot', ('\\x0' || 2 + ch_h.has_script::int)::bytea || ch_h.raw) AS hot_bech32, NULL AS meta_url, NULL AS meta_hash, cr.cold_key_id
          FROM committee_registration AS cr
          LEFT JOIN committee_hash AS ch_h ON ch_h.id = cr.hot_key_id
          WHERE cr.tx_id = $1
        ) UNION ALL (
          SELECT cdr.cert_index AS index, NULL AS hot_hash, NULL AS hot_has_script, NULL AS hot_bech32, va.url AS meta_url, encode(va.data_hash, 'hex') AS meta_hash, cdr.cold_key_id
          FROM committee_de_registration AS cdr
          LEFT JOIN voting_anchor AS va ON va.id = cdr.voting_anchor_id
          WHERE cdr.tx_id = $1
        )
      ) AS c
      LEFT JOIN committee_hash AS ch ON ch.id = c.cold_key_id
      LEFT JOIN adastat_cc_member AS cm ON cm.id = c.cold_key_id
      ORDER BY c.index ASC
    `,
      [dataId]
    ),
    query(
      `
      SELECT r.unit_mem, r.unit_steps, r.fee, r.purpose, r.index, encode(d.hash::bytea, 'hex') AS hash, d.value AS json, encode(d.bytes::bytea, 'hex') AS bytes, encode(r.script_hash::bytea, 'hex') AS script_hash, LOWER(s.type::text) AS script_type, s.json AS script_json, encode(s.bytes::bytea, 'hex') AS script_bytes
      FROM redeemer AS r
      LEFT JOIN redeemer_data AS d ON d.id = r.redeemer_data_id
      LEFT JOIN script AS s ON s.hash = r.script_hash
      WHERE r.tx_id = $1
      ORDER BY r.index ASC
    `,
      [dataId]
    ),
  ])

  data.certificate =
    stake_registration.rows.length +
    delegation.rows.length +
    stake_deregistration.rows.length +
    pool_update.rows.length +
    pool_retire.rows.length +
    gov_action.rows.length +
    gov_vote.rows.length +
    drep_reg.rows.length +
    drep_deleg.rows.length +
    committee.rows.length

  data.inputs = {
    rows: txIn.rows,
  }
  data.outputs = {
    rows: txOut.rows,
  }
  data.withdrawals = {
    rows: withdrawal.rows,
  }
  data.reserves = {
    rows: reserve.rows,
  }
  if (reserve.rows.length) {
    let index = 0
    const uniqueCertIndex = new Set()
    for (const row of reserve.rows) {
      uniqueCertIndex.add(row.index)
      row.index = index++
    }
    data.certificate += uniqueCertIndex.size
  }
  data.treasury = {
    rows: treasury.rows,
  }
  if (treasury.rows.length) {
    let index = 0
    const uniqueCertIndex = new Set()
    for (const row of treasury.rows) {
      uniqueCertIndex.add(row.index)
      row.index = index++
    }
    data.certificate += uniqueCertIndex.size
  }
  data.metadata = {
    rows: metadata.rows,
  }
  data.stake_registrations = {
    rows: stake_registration.rows,
  }
  data.delegations = {
    rows: delegation.rows,
  }
  data.stake_deregistrations = {
    rows: stake_deregistration.rows,
  }
  data.pool_updates = {
    rows: pool_update.rows,
  }
  data.pool_retirements = {
    rows: pool_retire.rows,
  }
  data.gov_actions = {
    rows: gov_action.rows,
  }
  data.gov_votes = {
    rows: gov_vote.rows,
  }
  data.drep_registrations = {
    rows: drep_reg.rows,
  }
  data.drep_delegations = {
    rows: drep_deleg.rows,
  }
  data.committee = {
    rows: committee.rows,
  }
  data.redeemer = {
    rows: redeemer.rows,
  }

  for (const row of gov_vote.rows) {
    if (row.voter_role === 'drep') {
      row.bech32_legacy = row.has_script ? toBech32('drep_script', row.voter) : row.bech32
      if (row.voter) {
        row.bech32 = toBech32('drep', (row.has_script ? '23' : '22') + row.voter)
      }
      delete row.pool_name
      delete row.pool_ticker
    } else if (row.voter_role === 'spo') {
      delete row.has_script
      delete row.given_name
      delete row.image
    } else {
      delete row.pool_name
      delete row.pool_ticker
    }
  }

  for (const inOut of Array.prototype.concat(data.inputs.rows, data.outputs.rows)) {
    inOut.token = inOut.tokens.rows.length
    for (const row of inOut.tokens.rows) {
      row.image = ''

      fillTokenData(row)
    }
  }

  data.previous = prev
  data.next = next

  delete data.type

  return {
    data,
  }
}
