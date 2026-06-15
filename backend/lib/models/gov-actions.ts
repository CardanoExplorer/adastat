import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError, toBech32 } from '@/helper.ts'
import { activeValues, idValues, stakeValues, votingAnchorIdValues } from '@/helpers/dreps.ts'
import { type GovActionTypes, govActionTypes, govActions } from '@/helpers/gov-actions.ts'
import { md2html } from '@/helpers/markdown.ts'
import type { QueryString, RequiredRowsQueryString } from '@/schema.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  submission_time: 'g.id',
  expiry_epoch: 'g.id',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  tx_hash: "encode(tx.hash::bytea, 'hex')",
  index: 'g.index',
  deposit: 'g.deposit',
  stake_bech32: 'sa.view',
  stake_base16: "ENCODE(sa.hash_raw, 'hex')",
  submission_epoch: 'b.epoch_no',
  ratified_epoch: 'g.ratified_epoch',
  enacted_epoch: 'g.enacted_epoch',
  dropped_epoch: 'g.dropped_epoch',
  expired_epoch: 'g.expired_epoch',
  active: 'g.expired_epoch IS NULL',
  expiry_epoch: 'g.expiration',
  type: 'LOWER(g.type::text)',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

export const getList = async ({
  sort,
  dir,
  limit,
  after,
  page,
  rows: rowsType,
}: QueryString<ListSort, keyof GovActionTypes | 'gov_actions'>) => {
  const where: string[] = [],
    queryValues: any[] = []

  const orderBy =
    sort === 'submission_time'
      ? `ORDER BY ${sortFieldMap[sort]} ${dir}`
      : `ORDER BY ${sortFieldMap[sort]} ${dir}, g.id ${dir}`

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(cursorValues[0])

    if (sort === 'submission_time') {
      where.push(`g.id ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
    } else {
      queryValues.push(cursorValues[1])

      where.push(
        `(${sortFieldMap[sort]}, g.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )
    }
  }

  if (Object.hasOwn(govActionTypes, rowsType!)) {
    queryValues.push(govActionTypes[rowsType as keyof typeof govActionTypes])
    where.push(`g.type = $${queryValues.length}`)
  } else if (rowsType !== 'gov_actions') {
    where.push(`g.type IS NULL`)
  }

  return await cursorQuery(
    `
    SELECT ${sort === 'submission_time' ? 'g.id' : 'CONCAT(' + sortFieldMap[sort] + ",'-',g.id)"} AS cursor, ${fields}, g.id, d.json->'body'->>'title' AS title
    FROM gov_action_proposal AS g
    LEFT JOIN voting_anchor AS va ON va.id = g.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS d ON d.voting_anchor_id = va.id AND d.hash = va.data_hash
    LEFT JOIN tx ON tx.id = g.tx_id
    LEFT JOIN block AS b ON b.id = tx.block_id
    LEFT JOIN stake_address AS sa ON sa.id = g.return_address
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ${orderBy}
    LIMIT ${limit + 1}
    ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
  `,
    queryValues,
    limit,
    (row) => {
      const gaData = govActions.get(row.id)

      if (gaData) {
        row.submission_time = gaData.submission_time

        row.cc_quorum_numerator = gaData.cc_quorum_numerator
        row.cc_quorum_denominator = gaData.cc_quorum_denominator

        row.pool_threshold = gaData.pool_threshold
        row.drep_threshold = gaData.drep_threshold

        row.cc_active = gaData.cc_total === null ? null : gaData.cc_total - gaData.cc_abstain
        row.cc_yes = gaData.cc_yes
        row.cc_no = gaData.cc_no

        if (gaData.drep_total_stake === null || gaData.drep_threshold === 0) {
          row.drep_active_stake = null
          row.drep_yes_stake = null
          row.drep_no_stake = null
        } else {
          row.drep_active_stake =
            gaData.drep_total_stake -
            gaData.drep_abstain_stake -
            gaData.drep_always_abstain_stake -
            gaData.drep_inactive_stake
          row.drep_yes_stake = gaData.drep_yes_stake
          row.drep_no_stake = gaData.drep_no_stake

          if (gaData.type === 'NoConfidence') {
            row.drep_yes_stake += gaData.drep_always_no_confidence_stake
          } else {
            row.drep_no_stake += gaData.drep_always_no_confidence_stake
          }
        }

        if (gaData.pool_total_stake === null || gaData.pool_threshold === 0) {
          row.pool_active_stake = null
          row.pool_yes_stake = null
        } else {
          row.pool_yes_stake = gaData.pool_yes_stake
          row.pool_no_stake = gaData.pool_no_stake

          if (gaData.type === 'HardForkInitiation') {
            row.pool_active_stake = gaData.pool_total_stake - gaData.pool_abstain_stake

            if (!gaData.bootstrap_period) {
              row.pool_no_stake += gaData.pool_always_no_confidence_stake
            }
          } else if (gaData.bootstrap_period) {
            row.pool_active_stake = gaData.pool_yes_stake + gaData.pool_no_stake
          } else {
            row.pool_active_stake =
              gaData.pool_total_stake - gaData.pool_abstain_stake - gaData.pool_always_abstain_stake

            if (gaData.type === 'NoConfidence') {
              row.pool_yes_stake += gaData.pool_always_no_confidence_stake
            } else {
              row.pool_no_stake += gaData.pool_always_no_confidence_stake
            }
          }
        }

        if (gaData.withdrawal_amount > 0) {
          row.withdrawal_amount = gaData.withdrawal_amount
        }
      }

      delete row.id
    }
  )
}

export const getItem = async (itemId: string, metaHTML = true) => {
  let gaData: AnyObject | undefined

  const itemBech32 = itemId.startsWith('gov_action') ? itemId : toBech32('gov_action', itemId)

  for (const govAction of govActions.values()) {
    if (govAction.bech32 === itemBech32) {
      gaData = govAction

      break
    }
  }

  if (!gaData) {
    return throwError(404)
  }

  const {
    rows: [gaRow],
  } = await query(
    `
    SELECT d.json->'body'->>'title' AS title, d.json->'body'->>'abstract' AS abstract, d.json->'body'->>'motivation' AS motivation, d.json->'body'->>'rationale' AS rationale, d.json->'body'->'references' AS references
    FROM gov_action_proposal AS g
    LEFT JOIN voting_anchor AS va ON va.id = g.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS d ON d.voting_anchor_id = va.id AND d.hash = va.data_hash
    WHERE g.id = $1
  `,
    [gaData.id]
  )

  const data: AnyObject = {
    tx_hash: gaData.tx_hash,
    index: gaData.index,
    bech32: gaData.bech32,
    type: gaData.type.toLowerCase(),
    deposit: gaData.deposit,
    stake_bech32: gaData.stake_bech32,
    stake_base16: gaData.stake_base16,
    submission_epoch: gaData.submission_epoch,
    expiry_epoch: gaData.expiration,
    ratified_epoch: gaData.ratified_epoch,
    enacted_epoch: gaData.enacted_epoch,
    dropped_epoch: gaData.dropped_epoch,
    expired_epoch: gaData.expired_epoch,
    bootstrap_period: gaData.bootstrap_period,
    submission_time: gaData.submission_time,
    description: gaData.description,
    title: gaRow?.title ?? '',
    abstract: gaRow?.abstract?.trim(),
    motivation: gaRow?.motivation?.trim(),
    rationale: gaRow?.rationale?.trim(),
    references: gaRow?.references ?? [],
    meta_url: gaData.meta_url,
    meta_hash: gaData.meta_hash,
    cc_members: {},
    new_cc_members: [],
    cc_quorum_numerator: gaData.cc_quorum_numerator,
    cc_quorum_denominator: gaData.cc_quorum_denominator,
    cc_total: gaData.cc_total,
    cc_yes: gaData.cc_yes,
    cc_no: gaData.cc_no,
    cc_abstain: gaData.cc_abstain,
    drep_threshold: gaData.drep_threshold,
    drep_total_stake: gaData.drep_total_stake,
    drep_yes_stake: gaData.drep_yes_stake,
    drep_no_stake: gaData.drep_no_stake,
    drep_abstain_stake: gaData.drep_abstain_stake,
    drep_always_abstain_stake: gaData.drep_always_abstain_stake,
    drep_always_no_confidence_stake: gaData.drep_always_no_confidence_stake,
    drep_inactive_stake: gaData.drep_inactive_stake,
    drep_total: gaData.drep_total,
    drep_yes: gaData.drep_yes,
    drep_no: gaData.drep_no,
    drep_abstain: gaData.drep_abstain,
    drep_always_abstain: gaData.drep_always_abstain,
    drep_always_no_confidence: gaData.drep_always_no_confidence,
    drep_inactive: gaData.drep_inactive,
    pool_threshold: gaData.pool_threshold,
    pool_total_stake: gaData.pool_total_stake,
    pool_yes_stake: gaData.pool_yes_stake,
    pool_no_stake: gaData.pool_no_stake,
    pool_abstain_stake: gaData.pool_abstain_stake,
    pool_always_abstain_stake: gaData.pool_always_abstain_stake,
    pool_always_no_confidence_stake: gaData.pool_always_no_confidence_stake,
    pool_total: gaData.pool_total,
    pool_yes: gaData.pool_yes,
    pool_no: gaData.pool_no,
    pool_abstain: gaData.pool_abstain,
    pool_always_abstain: gaData.pool_always_abstain,
    pool_always_no_confidence: gaData.pool_always_no_confidence,
  }

  if (gaData.withdrawal_amount > 0) {
    data.withdrawal_amount = gaData.withdrawal_amount
  }

  if (Array.isArray(gaData.cc_member_votes)) {
    for (const ccMember of gaData.cc_member_votes) {
      data.cc_members[ccMember.hash] = {
        hash: ccMember.hash,
        vote: ccMember.vote,
        json: ccMember.json,
        name: ccMember.name,
        image: ccMember.image,
      }
    }
  }

  if (Array.isArray(gaData.json?.body?.references)) {
    for (const reference of gaData.json.body.references) {
      if (reference.uri) {
        data.references.push({
          uri: reference.uri,
          label: reference.label,
        })
      }
    }
  }

  if (gaData.type === 'NewCommittee') {
    if (!gaData.new_cc_members) {
      const { rows: newCommitteeRows } = await query(
        `
        SELECT ENCODE(ch.raw, 'hex') AS hash, cm.expiration_epoch, accm.name, accm.image
        FROM committee_member AS cm
        LEFT JOIN committee_hash AS ch ON ch.id = cm.committee_hash_id
        LEFT JOIN adastat_cc_member AS accm ON accm.id = cm.committee_hash_id
        WHERE cm.committee_id = (SELECT id FROM committee WHERE gov_action_proposal_id = $1 LIMIT 1)
            AND cm.committee_hash_id NOT IN (SELECT cold_key_id FROM committee_de_registration)
        ORDER BY cm.id
      `,
        [gaData.id]
      )

      gaData.new_cc_members = []
      for (const newCommitteeRow of newCommitteeRows) {
        gaData.new_cc_members.push({
          hash: newCommitteeRow.hash,
          expiration_epoch: newCommitteeRow.expiration_epoch,
        })
      }
    }

    for (const member of gaData.new_cc_members) {
      data.new_cc_members.push({
        hash: member.hash,
        expiration_epoch: member.expiration_epoch,
        name: member.name ?? '',
        image: member.image ?? '',
      })
    }
  }

  if (metaHTML) {
    if (data.abstract) {
      data.abstract = md2html(data.abstract)
    }

    if (data.motivation) {
      data.motivation = md2html(data.motivation)
    }

    if (data.rationale) {
      data.rationale = md2html(data.rationale)
    }
  }

  return {
    govActionId: gaData.id,
    data,
  }
}

export const rowSortFieldMap = {
  votes: {
    tx_time: '',
    voting_power: '',
  },
  voters: {
    voting_power: '',
  },
}

export const rowFilterFieldMap = {
  voters: {
    role: { type: 'string', enum: ['drep', 'spo'] as const },
    vote: { type: 'string', enum: ['yes', 'no', 'abstain', 'not_voted'] as const },
  },
}

export type RowFilterFieldMap = {
  voters: {
    role: (typeof rowFilterFieldMap.voters.role.enum)[number]
    vote: (typeof rowFilterFieldMap.voters.vote.enum)[number]
  }
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async (
  args: RequiredRowsQueryString<RowSortFieldMap, RowFilterFieldMap> & { govActionId: bigint }
) => {
  const { sort, dir, limit, after, govActionId } = args,
    where: string[] = [],
    queryValues: any[] = []

  const ga = govActions.get(govActionId)!,
    lastEpoch = ga.ratified_epoch || ga.expired_epoch || ga.dropped_epoch

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (args.rows === 'votes') {
    const order_by =
      sort === 'tx_time'
        ? `ORDER BY vp.id ${dir}`
        : `ORDER BY COALESCE(${
            lastEpoch ? 'dd.amount' : 'drep.live_stake'
          }, ep.stake + COALESCE(deposit.amount, 0)) ${dir} NULLS LAST, vp.id DESC`

    where.push('vp.gov_action_proposal_id = $1')

    queryValues.push(
      ga.id,
      lastEpoch || latestBlock.epoch_no,
      lastEpoch || ga.expiration,
      ga.tx_id,
      ga.index,
      idValues,
      votingAnchorIdValues,
      stakeValues
    )

    if (ga.last_tx_id) {
      queryValues.push(ga.last_tx_id)
    }

    if (after) {
      const cursorValues = decodeCursor(after)

      queryValues.push(cursorValues[0])
      if (sort === 'tx_time') {
        where.push(`vp.id ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
      } else {
        queryValues.push(cursorValues[1])
        where.push(
          `(COALESCE(${lastEpoch ? 'dd.amount' : 'drep.live_stake'}, ep.stake + COALESCE(deposit.amount, 0), -1), vp.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
        )
      }
    }

    ;({ rows, cursor } = await cursorQuery(
      `
    WITH deposit AS (
      SELECT a.active_pool AS pool_id, SUM(d.deposit) AS amount
      FROM (
        SELECT return_address, SUM(deposit) AS deposit
        FROM gov_action_proposal AS gap
        WHERE gap.dropped_epoch IS NULL AND gap.enacted_epoch IS NULL
        GROUP BY return_address
      ) AS d
      LEFT JOIN adastat_account AS a ON a.id = d.return_address
      GROUP BY a.active_pool
    ), lav AS (
      SELECT DISTINCT ON (vp.drep_voter, vp.pool_voter, vp.committee_voter) vp.drep_voter, vp.pool_voter, vp.committee_voter, vp.id, vp.vote
      FROM voting_procedure AS vp
      LEFT JOIN tx ON tx.id = vp.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      WHERE vp.gov_action_proposal_id = $1 AND b.epoch_no < $3
      ORDER BY vp.drep_voter, vp.pool_voter, vp.committee_voter, vp.id DESC
    ), drd AS (
      SELECT DISTINCT ON (dr.drep_hash_id) dr.drep_hash_id, dr.tx_id, dr.cert_index
      FROM drep_registration AS dr
      WHERE dr.deposit < 0 AND (dr.tx_id, dr.cert_index) > ($4, $5) ${ga.last_tx_id ? 'AND dr.tx_id <= $9' : ''}
      ORDER BY dr.drep_hash_id, dr.id DESC
    ), cr AS (
      SELECT DISTINCT hot_key_id, cold_key_id
      FROM committee_registration
    )
    SELECT ${sort === 'tx_time' ? 'vp.id' : 'CONCAT(COALESCE(' + (lastEpoch ? 'dd.amount' : 'drep.live_stake') + ", ep.stake + COALESCE(deposit.amount, 0), -1),'-',vp.id)"} AS cursor, encode(tx.hash::bytea, 'hex') AS tx_hash, vp.index AS tx_index, LOWER(vp.voter_role::text) AS voter_role, LOWER(vp.vote::text) AS vote, b.epoch_no AS submission_epoch, EXTRACT(epoch FROM b.time)::integer AS tx_time, encode(COALESCE(dh.raw, ph.hash_raw, ch.raw)::bytea, 'hex') AS voter, COALESCE(dh.view, ph.view) AS bech32, COALESCE(dh.has_script, ch.has_script) AS has_script, ap.name AS pool_name, ap.ticker AS pool_ticker, COALESCE(ovdd.given_name, accm.name) AS given_name, COALESCE(ovd.json->'body'->'image'->>'contentUrl', ovdd.image_url, accm.image) AS image, COALESCE(${lastEpoch ? 'dd.amount' : 'drep.live_stake'}, ep.stake + COALESCE(deposit.amount, 0), -1) AS voting_power, vva.url AS meta_url, encode(vva.data_hash::bytea, 'hex') AS meta_hash, vpd.json,
      CASE
        WHEN b.epoch_no >= $3 THEN 'latecomer'
        WHEN (drd.tx_id, drd.cert_index) > (vp.tx_id, vp.index) THEN 'unregistered'
        WHEN vp.id < lav.id THEN 'obsolete'
        ELSE 'active'
      END AS status,
      CASE
        WHEN b.epoch_no >= $3 THEN jsonb_build_object('reason', 'late')
        WHEN (drd.tx_id, drd.cert_index) > (vp.tx_id, vp.index) THEN jsonb_build_object('reason', 'deregistered')
        WHEN vp.id < lav.id THEN jsonb_build_object('reason', 'superseded', 'vote', lav.vote)
        ELSE NULL
      END AS invalidation
    FROM voting_procedure AS vp
    LEFT JOIN lav ON lav.drep_voter = vp.drep_voter OR lav.pool_voter = vp.pool_voter OR lav.committee_voter = vp.committee_voter
    LEFT JOIN drd ON drd.drep_hash_id = vp.drep_voter
    LEFT JOIN voting_anchor AS vva ON vva.id = vp.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = vp.voting_anchor_id
    LEFT JOIN tx ON tx.id = vp.tx_id
    LEFT JOIN block AS b ON b.id = tx.block_id
    LEFT JOIN drep_hash AS dh ON dh.id = vp.drep_voter
    LEFT JOIN unnest($6::bigint[], $7::bigint[], $8::bigint[]) AS drep (id, voting_anchor_id, live_stake) ON drep.id = dh.id
    LEFT JOIN drep_distr AS dd ON dd.hash_id = dh.id AND dd.epoch_no = $2
    LEFT JOIN voting_anchor AS va ON va.id = drep.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = drep.voting_anchor_id
    LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
    LEFT JOIN pool_hash AS ph ON ph.id = vp.pool_voter
    LEFT JOIN deposit ON deposit.pool_id = vp.pool_voter
    LEFT JOIN cr ON cr.hot_key_id = vp.committee_voter
    LEFT JOIN committee_hash AS ch ON ch.id = cr.cold_key_id
    LEFT JOIN adastat_cc_member AS accm ON accm.id = ch.id
    LEFT JOIN adastat_pool AS ap ON ap.id = vp.pool_voter
    LEFT JOIN adastat_epoch_pool AS ep ON ep.epoch_no = $2 - 2 AND ep.pool_id = vp.pool_voter
    WHERE ${where.join(' AND ')}
    ${order_by}
    LIMIT ${limit + 1}
  `,
      queryValues,
      limit,
      (row) => {
        if (row.voter_role === 'drep') {
          row.bech32_legacy = row.bech32
          if (row.voter) {
            if (row.has_script) {
              row.bech32_legacy = toBech32('drep_script', row.voter)
              row.bech32 = toBech32('drep', '23' + row.voter)
            } else {
              row.bech32 = toBech32('drep', '22' + row.voter)
            }
          }
          delete row.pool_name
          delete row.pool_ticker
        } else if (row.voter_role === 'spo') {
          delete row.has_script
          delete row.given_name
          delete row.image
        } else {
          row.bech32 = toBech32('cc_cold', (row.has_script ? '13' : '12') + row.voter)
          delete row.pool_name
          delete row.pool_ticker
        }
      }
    ))
  } else if (args.rows === 'voters') {
    const spos = ga.pool_threshold && args.role !== 'drep',
      dreps = ga.drep_threshold && args.role !== 'spo'

    if (spos || dreps) {
      queryValues.push(ga.id, lastEpoch || latestBlock.epoch_no, lastEpoch || ga.expiration)

      if (dreps) {
        queryValues.push(idValues, votingAnchorIdValues, stakeValues, activeValues)
      }

      if (args.vote) {
        if (args.vote === 'not_voted') {
          where.push('lav.vote IS NULL')
        } else {
          queryValues.push(args.vote)
          where.push(`lav.vote = $${queryValues.length}`)
        }
      }

      if (after) {
        const cursorValues = decodeCursor(after)

        queryValues.push(...cursorValues)
      }

      ;({ rows, cursor } = await cursorQuery(
        `
    WITH deposit AS (
      SELECT a.active_pool AS pool_id, SUM(d.deposit) AS amount
      FROM (
        SELECT return_address, SUM(deposit) AS deposit
        FROM gov_action_proposal AS gap
        WHERE gap.dropped_epoch IS NULL AND gap.enacted_epoch IS NULL
        GROUP BY return_address
      ) AS d
      LEFT JOIN adastat_account AS a ON a.id = d.return_address
      GROUP BY a.active_pool
    ), lav AS (
      SELECT DISTINCT ON (vp.drep_voter, vp.pool_voter) vp.drep_voter, vp.pool_voter, vp.voting_anchor_id, LOWER(vp.vote::text) AS vote, tx.hash AS tx_hash, EXTRACT(epoch FROM b.time)::integer AS tx_time
      FROM voting_procedure AS vp
      LEFT JOIN tx ON tx.id = vp.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      WHERE vp.gov_action_proposal_id = $1 AND b.epoch_no < $3
      ORDER BY vp.drep_voter, vp.pool_voter, vp.id DESC
    )
    SELECT v.voting_power || '-' || v.role || '-' || v.id AS cursor, v.role, v.name, v.ticker, v.bech32, ENCODE(v.hash, 'hex') AS voter, v.has_script, v.voting_power, v.vote, encode(v.tx_hash::bytea, 'hex') AS tx_hash, v.tx_time, vva.url AS meta_url, encode(vva.data_hash::bytea, 'hex') AS meta_hash, vpd.json
    FROM (
      ${
        dreps
          ? `(
        SELECT 'drep' AS role, dh.id, ovdd.given_name AS name, dh.view AS ticker, cardano.bech32_encode('drep', ('\\x2' || 2 + dh.has_script::int)::bytea || dh.raw) AS bech32, dh.raw AS hash, dh.has_script, COALESCE(${lastEpoch ? 'dd.amount' : 'drep.live_stake'}, 0) AS voting_power, lav.voting_anchor_id, lav.vote, lav.tx_hash, lav.tx_time
        FROM drep_hash AS dh
        LEFT JOIN unnest($4::bigint[], $5::bigint[], $6::bigint[], $7::boolean[]) AS drep (id, voting_anchor_id, live_stake, active) ON drep.id = dh.id
        LEFT JOIN drep_distr AS dd ON dd.hash_id = dh.id AND dd.epoch_no = $2
        LEFT JOIN lav ON lav.drep_voter = dh.id
        LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = drep.voting_anchor_id
        LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
        WHERE ${lastEpoch ? 'dd.active_until >= $2' : 'drep.active'} AND dh.raw IS NOT NULL ${where.length ? 'AND ' + where.join(' AND ') : ''} ${after ? `AND (COALESCE(${lastEpoch ? 'dd.amount' : 'drep.live_stake'}, 0), 'drep', dh.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 2}, $${queryValues.length - 1}, $${queryValues.length})` : ''}
        ORDER BY voting_power ${dir}, dh.id DESC
        LIMIT ${limit + 1}
      )`
          : ``
      } ${dreps && spos ? 'UNION ALL' : ''} ${
        spos
          ? `(
        SELECT 'spo' AS role, p.id, p.name, p.ticker, ph.view AS bech32, ph.hash_raw AS hash, NULL AS has_script, COALESCE(ep.stake, 0) + COALESCE(deposit.amount, 0) AS voting_power, lav.voting_anchor_id, lav.vote, lav.tx_hash, lav.tx_time
        FROM adastat_pool AS p
        LEFT JOIN pool_hash AS ph ON ph.id = p.id
        LEFT JOIN pool_retire AS pr ON pr.id = p.retirement_id
        LEFT JOIN adastat_epoch_pool AS ep ON (ep.epoch_no = $2 - 2 AND ep.pool_id = p.id)
        LEFT JOIN deposit ON deposit.pool_id = p.id
        LEFT JOIN lav ON lav.pool_voter = p.id
        WHERE (p.retirement_id IS NULL OR pr.retiring_epoch > $2) ${where.length ? 'AND ' + where.join(' AND ') : ''} ${after ? `AND (COALESCE(ep.stake, 0) + COALESCE(deposit.amount, 0), 'spo', p.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 2}, $${queryValues.length - 1}, $${queryValues.length})` : ''}
        ORDER BY voting_power ${dir}, p.id DESC
        LIMIT ${limit + 1}
      )`
          : ``
      }
    ) AS v
    LEFT JOIN voting_anchor AS vva ON vva.id = v.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = v.voting_anchor_id
    ${after ? `WHERE (v.voting_power, v.role, v.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 2}, $${queryValues.length - 1}, $${queryValues.length})` : ''}
    ORDER BY v.voting_power ${dir}, v.role DESC, v.id DESC
    LIMIT ${limit + 1}
  `,
        queryValues,
        limit,
        (row) => {
          if (row.role === 'spo') {
            delete row.has_script
          } else {
            row.bech32_legacy = row.ticker
            delete row.ticker
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
