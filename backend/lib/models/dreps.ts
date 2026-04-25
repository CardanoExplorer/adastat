import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError } from '@/helper.ts'
import {
  type Drep,
  activeValues,
  autoDreps,
  delegations,
  dreps,
  idValues,
  txIdValues,
  votingAnchorIdValues,
} from '@/helpers/dreps.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  reg_time: 'drep.tx_id',
  live_stake: 'COALESCE(drep.live_stake, 0)',
  delegator: 'COALESCE(drep.delegator, 0)',
  active_until: 'GREATEST(block.epoch_no+20, dd.active_until)',
}

export type ListSort = keyof typeof sortFieldMap

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'watchlist'; id: string }
) => {
  const where: string[] = [],
    queryValues: any[] = [idValues, txIdValues, votingAnchorIdValues, activeValues]

  if (item?.type === 'watchlist') {
    const itemValues = item.id.split(',')

    const watchlistValues: string[] = []

    for (const [drepId, drep] of Object.entries(dreps)) {
      if (itemValues.includes(drep.bech32)) {
        watchlistValues.push(drepId)
      }
    }

    if (!watchlistValues.length) {
      throwError(400)
    }

    queryValues.push(watchlistValues)

    where.push(`drep.id = ANY($${queryValues.length}::bigint[])`)
  } else {
    where.push('drep.active IS NOT NULL')
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(...cursorValues)

    where.push(
      `(${sortFieldMap[sort]}, dh.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )
  }

  return await cursorQuery(
    `
    SELECT CONCAT(${sortFieldMap[sort]},'-',dh.id) AS cursor, drep.id, encode(tx.hash, 'hex') AS tx_hash, va.url, ovd.comment, ovdd.payment_address, EXTRACT(epoch FROM block.time)::integer AS tx_time, GREATEST(block.epoch_no+20, dd.active_until) AS last_active_epoch
    FROM unnest($1::bigint[], $2::bigint[], $3::bigint[], $4::boolean[]) AS drep (id, tx_id, voting_anchor_id, active)
    LEFT JOIN drep_hash AS dh ON dh.id = drep.id
    LEFT JOIN drep_distr AS dd ON dd.hash_id = dh.id AND dd.epoch_no = $1
    LEFT JOIN tx ON tx.id = drep.tx_id
    LEFT JOIN block ON block.id = tx.block_id
    LEFT JOIN voting_anchor AS va ON va.id = drep.voting_anchor_id
    LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = drep.voting_anchor_id
    LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortFieldMap[sort]} ${dir}, dh.id ${dir}
    LIMIT ${limit + 1}
    ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
  `,
    queryValues,
    limit,
    (row) => {
      const drep = dreps.get(row.id)

      if (drep) {
        row.bech32_legacy = drep.bech32_legacy
        row.bech32 = drep.bech32
        row.base16 = drep.base16
        row.has_script = drep.has_script
        row.given_name = drep.given_name
        row.image = drep.image
        row.live_stake = drep.live_stake
        row.delegator = drep.delegator
      }

      delete row.id
    }
  )
}

export const getItem = async (itemId: string) => {
  let drepData: Drep | undefined, data: AnyObject | undefined

  if (itemId === 'drep_always_abstain' || itemId === 'drep_always_no_confidence') {
    const autoDrep = autoDreps.get(itemId)

    if (autoDrep) {
      drepData = autoDrep
    }
  } else {
    for (const drep of dreps.values()) {
      if (
        itemId === drep.bech32 ||
        itemId === drep.bech32_legacy ||
        itemId === drep.base16 ||
        itemId === drep.base16?.slice(2)
      ) {
        drepData = drep

        break
      }
    }
  }

  if (drepData) {
    ;({
      rows: [data],
    } = await query(
      `
    WITH vp AS (
      SELECT MAX(tx_id) AS tx_id, COUNT(*) filter (where vote = 'Yes') AS vote_yes, COUNT(*) filter (where vote = 'No') AS vote_no, COUNT(*) filter (where vote = 'Abstain') AS vote_abstain
      FROM (
        SELECT DISTINCT ON (gov_action_proposal_id) tx_id, vote
        FROM voting_procedure
        WHERE drep_voter = $1
        ORDER BY gov_action_proposal_id ASC, id DESC
      ) AS t
      LIMIT 1
    )
    SELECT encode(tx.hash, 'hex') AS first_tx_hash, va.url, TRIM(ovd.comment) AS comment, ovdd.payment_address, TRIM(ovdd.objectives) AS objectives, TRIM(ovdd.motivations) AS motivations, TRIM(ovdd.qualifications) AS qualifications, EXTRACT(epoch FROM b.time)::integer AS first_tx_time, GREATEST(l_b.epoch_no+20, dd.active_until) AS last_active_epoch, EXTRACT(epoch FROM l_b.time)::integer AS last_tx_time, encode(l_tx.hash, 'hex') AS last_tx_hash, vp.vote_yes, vp.vote_no, vp.vote_abstain, COALESCE(ovd.json, '{}'::jsonb) AS json
    FROM drep_hash AS dh
    LEFT JOIN drep_distr AS dd ON dd.hash_id = dh.id AND dd.epoch_no = $5
    LEFT JOIN tx ON tx.id = $2
    LEFT JOIN block AS b ON b.id = tx.block_id
    LEFT JOIN voting_anchor AS va ON va.id = $3
    LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = $3
    LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
    LEFT JOIN vp ON true
    LEFT JOIN tx AS l_tx ON l_tx.id = GREATEST(vp.tx_id, $4::bigint)
    LEFT JOIN block AS l_b ON l_b.id = l_tx.block_id
    WHERE dh.id = $1
  `,
      [drepData.id, drepData.tx_id, drepData.voting_anchor_id, drepData.last_tx_id, latestBlock.epoch_no]
    ))
  }

  if (!data || !drepData) {
    return throwError(404)
  }

  data.bech32_legacy = drepData.bech32_legacy
  data.bech32 = drepData.bech32
  data.base16 = drepData.base16
  data.has_script = drepData.has_script
  data.given_name = drepData.given_name
  data.image = drepData.image
  data.live_stake = drepData.live_stake
  data.delegator = drepData.delegator

  if (data.json) {
    data.references = []

    if (Array.isArray(data.json.body?.references)) {
      for (const reference of data.json.body.references) {
        if (reference.uri) {
          data.references.push({
            uri: reference.uri,
            label: reference.label,
          })
        }
      }
    }

    delete data.json
  }

  data.deposit = drepData.deposit
  data.registered = drepData.registered
  data.active = drepData.active

  if (itemId === 'drep_always_abstain' || itemId === 'drep_always_no_confidence') {
    const {
      rows: [gapRow],
    } = await query(`
      SELECT COUNT(*) AS gap_count, COUNT(*) filter (WHERE type='NoConfidence') AS no_confidence_count
      FROM gov_action_proposal
    `)

    if (gapRow) {
      if (itemId === 'drep_always_abstain') {
        data.vote_abstain = gapRow.gap_count
      } else {
        data.vote_yes = gapRow.no_confidence_count
        data.vote_no = gapRow.gap_count - gapRow.no_confidence_count
      }
    }
  } else if (!drepData.voting_anchor_id) {
    const {
      rows: [errorRow],
    } = await query(
      `
        SELECT fetch_error
        FROM off_chain_vote_fetch_error
        WHERE voting_anchor_id = (
          SELECT voting_anchor_id
          FROM drep_registration
          WHERE drep_hash_id = $1
          ORDER BY id DESC
          LIMIT 1
        )
        ORDER BY id DESC
        LIMIT 1
      `,
      [drepData.id]
    )

    if (errorRow) {
      data.metadata_error = errorRow.fetch_error
    }
  }

  return {
    drepId: drepData.id,
    data,
  }
}

export const rowSortFieldMap = {
  votes: {
    tx_time: '',
  },
  delegators: {
    live_stake: 'a.amount',
    tx_time: 'rows.tx_id',
  },
  registrations: {
    tx_time: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  sort,
  dir,
  limit,
  after,
  rows: rowsType,
  drepId,
}: RowsQueryString<RowSortFieldMap> & { drepId: bigint }) => {
  const where: string[] = [],
    queryValues: any[] = [],
    cursorValues = decodeCursor(after)

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'votes') {
    queryValues.push(drepId)
    where.push('vp.drep_voter = $1')

    if (after) {
      queryValues.push(after)
      where.push(`vp.id ${dir === 'asc' ? '>' : '<'} $2`)
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      WITH lav AS (
        SELECT DISTINCT ON (vp.gov_action_proposal_id) vp.gov_action_proposal_id, vp.id, vp.vote
        FROM voting_procedure AS vp
        LEFT JOIN tx ON tx.id = vp.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        LEFT JOIN gov_action_proposal AS g ON g.id = vp.gov_action_proposal_id
        WHERE vp.drep_voter = $1 AND b.epoch_no < COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration)
        ORDER BY vp.gov_action_proposal_id, vp.id DESC
      ),
      drd AS (
        SELECT DISTINCT ON (b.epoch_no) dr.tx_id, dr.cert_index, b.epoch_no
        FROM drep_registration AS dr
        LEFT JOIN tx ON tx.id = dr.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        WHERE dr.drep_hash_id = $1 AND dr.deposit < 0
        ORDER BY b.epoch_no DESC, dr.id DESC
      ),
      gad AS (
        SELECT DISTINCT ON (g.id) g.id, drd.tx_id, drd.cert_index
        FROM gov_action_proposal AS g
        LEFT JOIN tx ON tx.id = g.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        LEFT JOIN drd ON drd.epoch_no >= b.epoch_no AND drd.epoch_no < COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration)
        WHERE drd.epoch_no IS NOT NULL
        ORDER BY g.id, drd.epoch_no DESC
      )
      SELECT vp.id AS cursor, encode(tx.hash::bytea, 'hex') AS tx_hash, vp.index AS tx_index, LOWER(vp.vote::text) AS vote, b.epoch_no AS submission_epoch, LOWER(g.type::text) AS type, encode(gtx.hash::bytea, 'hex') AS gtx_hash, g.index AS gtx_index, vd.title, g.id, EXTRACT(epoch FROM b.time)::integer AS tx_time, vva.url AS meta_url, encode(vva.data_hash::bytea, 'hex') AS meta_hash, vpd.json,
        CASE
          WHEN b.epoch_no >= COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration) THEN 'latecomer'
          WHEN (gad.tx_id, gad.cert_index) > (vp.tx_id, vp.index) THEN 'unregistered'
          WHEN vp.id < lav.id THEN 'obsolete'
          ELSE 'active'
        END AS status,
        CASE
          WHEN b.epoch_no >= COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration) THEN jsonb_build_object('reason', 'late')
          WHEN (gad.tx_id, gad.cert_index) > (vp.tx_id, vp.index) THEN jsonb_build_object('reason', 'deregistered')
          WHEN vp.id < lav.id THEN jsonb_build_object('reason', 'superseded', 'vote', LOWER(lav.vote::text))
          ELSE NULL
        END AS invalidation
      FROM voting_procedure AS vp
      LEFT JOIN lav ON lav.gov_action_proposal_id = vp.gov_action_proposal_id
      LEFT JOIN gad ON gad.id = vp.gov_action_proposal_id
      LEFT JOIN voting_anchor AS vva ON vva.id = vp.voting_anchor_id
      LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = vp.voting_anchor_id
      LEFT JOIN tx ON tx.id = vp.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN gov_action_proposal AS g ON g.id = vp.gov_action_proposal_id
      LEFT JOIN tx AS gtx ON gtx.id = g.tx_id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = g.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data AS vd ON vd.off_chain_vote_data_id = ovd.id
      WHERE ${where.join(' AND ')}
      ORDER BY vp.id ${dir}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit
    ))
  } else if (rowsType === 'delegators') {
    const drep = dreps.get(drepId)
    if (drep) {
      const delegationAddrIds: bigint[] = [],
        delegationTxIds: bigint[] = []

      for (const [addr_id, { tx_id }] of drep.delegators.entries()) {
        delegationAddrIds.push(addr_id)
        delegationTxIds.push(tx_id)
      }

      queryValues.push(delegationAddrIds, delegationTxIds)
    }

    where.push(`a.pool IS NOT NULL`)
    if (after) {
      queryValues.push(...cursorValues)
      where.push(
        `(${rowSortFieldMap[rowsType][sort]}, a.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT CONCAT(${rowSortFieldMap[rowsType][sort]}, '-', a.id) AS cursor, encode(sa.hash_raw, 'hex') AS base16, sa.view AS bech32, a.amount AS live_stake, encode(tx.hash::bytea, 'hex') AS tx_hash, EXTRACT(epoch FROM b.time)::integer AS tx_time, a.id, encode(l_tx.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM l_b.time)::integer AS last_tx_time
      FROM unnest($1::bigint[], $2::bigint[]) AS rows (addr_id, tx_id)
      LEFT JOIN adastat_account AS a ON a.id = rows.addr_id
      LEFT JOIN stake_address AS sa ON sa.id = a.id
      LEFT JOIN tx ON tx.id = rows.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN tx AS l_tx ON l_tx.id = a.last_tx
      LEFT JOIN block AS l_b ON l_b.id = l_tx.block_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${rowSortFieldMap[rowsType][sort]}+0 ${dir}, a.id ${dir}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit,
      (row) => {
        const delegation = delegations.get(row.id),
          prevDrep = dreps.get(delegation?.prev_hash_id ?? 0n)

        if (prevDrep) {
          row.prev_bech32 = prevDrep.bech32
          row.prev_base16 = prevDrep.base16
          row.prev_has_script = prevDrep.has_script
          row.prev_given_name = prevDrep.given_name
          row.prev_image = prevDrep.image
        }

        delete row.id
      }
    ))
  } else if (rowsType === 'registrations') {
    queryValues.push(drepId)
    where.push('dr.drep_hash_id = $1')

    if (after) {
      queryValues.push(after)
      where.push(`dr.id ${dir === 'asc' ? '>' : '<'} $2`)
    }
    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT dr.id AS cursor, dr.cert_index AS tx_index, dr.deposit AS deposit_amount, 'registration' AS type, encode(tx.hash::bytea, 'hex') AS tx_hash, EXTRACT(epoch FROM b.time)::integer AS tx_time, va.url AS meta_url, encode(va.data_hash::bytea, 'hex') AS meta_hash, ovd.json, ovdd.given_name
      FROM drep_registration AS dr
      LEFT JOIN tx ON tx.id = dr.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN voting_anchor AS va ON va.id = dr.voting_anchor_id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = dr.voting_anchor_id
      LEFT JOIN off_chain_vote_drep_data AS ovdd ON ovdd.off_chain_vote_data_id = ovd.id
      WHERE ${where.join(' AND ')}
      ORDER BY dr.id ${dir}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit
    ))
  }

  return {
    rows,
    cursor,
  }
}
