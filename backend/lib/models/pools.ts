import { networkParams } from '@/config.ts'
import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError, toBech32 } from '@/helper.ts'
import { govActions } from '@/helpers/gov-actions.ts'
import { checkSigner } from '@/helpers/mithril-signers.ts'
import { type RelayRow, fetchLogo, getPoolAprAndLuck, resolveRelays } from '@/helpers/pools.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import { getData, getPoolApr, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  reg_time: 'p.registration_id',
  active_stake: 'COALESCE(ep_a.stake, 0)',
  live_stake: 'ep_l.stake',
  delegator: 'ep_l.delegator',
  block_epoch: 'p.epoch_with_block',
  total_block: 'p.block',
  block: 'COALESCE(ep_l.block, 0)',
  margin: 'COALESCE(pu_l.margin, pu_u.margin)',
  fixed_cost: 'COALESCE(pu_l.fixed_cost, pu_u.fixed_cost)',
  pledge: 'COALESCE(pu_l.pledge, pu_u.pledge)',
  owner_live_stake: 'ep_l.real_pledge',
  reward_amount: 'p.delegator_reward',
  pool_fee: 'p.pool_reward',
  live_leverage: 'COALESCE(COALESCE(ep_l.stake, 0) / NULLIF(COALESCE(pu_l.pledge, pu_u.pledge), 0), 0)',
  apr: 'COALESCE(apr.val, 0)',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  id: 'p.id',
  hash: "encode(ph.hash_raw::bytea, 'hex')",
  bech32: 'ph.view',
  name: 'p.name',
  ticker: 'p.ticker',
  valid_meta: 'p.valid_meta_hash > 0',
  itn: 'p.itn_ticker > 0',
  impersonator: 'p.impersonator > 0',
  active_stake: 'ep_a.stake',
  live_stake: 'ep_l.stake',
  owner_live_stake: 'ep_l.real_pledge',
  owner_active_stake: 'ep_a.real_pledge',
  delegator: 'ep_l.delegator::integer',
  active_delegator: 'ep_a.delegator::integer',
  block_epoch: 'p.epoch_with_block',
  total_block: 'p.block',
  block: 'ep_l.block::integer',
  margin: 'COALESCE(pu_l.margin, pu_u.margin)::numeric',
  fixed_cost: 'COALESCE(pu_l.fixed_cost, pu_u.fixed_cost)',
  pledge: 'COALESCE(pu_l.pledge, pu_u.pledge)',
  reward_amount: 'p.delegator_reward',
  pool_fee: 'p.pool_reward',
  reg_time: 'EXTRACT(epoch FROM b_r.time)::integer',
  retiring_epoch: 'pr.retiring_epoch',
  live_leverage: 'ROUND(COALESCE(ep_l.stake, 0) / NULLIF(COALESCE(pu_l.pledge, pu_u.pledge), 0))',
  active_leverage: 'ROUND(COALESCE(ep_a.stake, 0) / NULLIF(COALESCE(pu_l.pledge, pu_u.pledge), 0))',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

const aprValues: {
  epoch: number
  id: bigint[]
  apr: number[]
  luck: number[]
} = {
  epoch: -1,
  id: [],
  apr: [],
  luck: [],
}

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'watchlist'; id: string }
) => {
  const where: string[] = [],
    queryValues: any[] = []

  const storageData = await getData()

  if (aprValues.epoch !== storageData.latestParsedEpoch) {
    aprValues.id = []
    aprValues.apr = []
    aprValues.luck = []

    for (const [poolId, { data: poolData }] of storageData.poolApr.entries()) {
      const poolData0 = poolData.get(0)
      if (poolData0) {
        aprValues.id.push(poolId)
        aprValues.apr.push(poolData0.apr)
        aprValues.luck.push(poolData0.luck)
      }
    }

    aprValues.epoch = storageData.latestParsedEpoch
  }

  queryValues.push(storageData.latestParsedEpoch, storageData.latestParsedEpoch - 2, aprValues.id, aprValues.apr)

  if (item?.type === 'watchlist') {
    const itemValues = item.id.split(',')

    const watchlistValues: string[] = []

    for (const itemValue of itemValues) {
      if (itemValue.length === 56 && /^[0-9A-Fa-f]+$/.test(itemValue)) {
        const bech32Str = toBech32('pool', itemValue)

        if (bech32Str) {
          watchlistValues.push(bech32Str)
        }
      } else if (itemValue.length <= 64) {
        watchlistValues.push(itemValue)
      }
    }

    if (!watchlistValues.length) {
      throwError(400)
    }

    queryValues.push(watchlistValues)

    where.push(`p.id IN (SELECT id FROM pool_hash WHERE view = ANY($${queryValues.length}::text[]))`)
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(...cursorValues)

    where.push(
      `(${sortFieldMap[sort]}, p.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )
  }

  if (item?.type !== 'watchlist') {
    queryValues.push(latestBlock.epoch_no)
    where.push(`(p.retirement_id IS NULL OR pr.retiring_epoch > $${queryValues.length})`)
  }

  return await cursorQuery(
    `
      SELECT CONCAT(${sortFieldMap[sort]},'-',p.id) AS cursor, ${fields}
      FROM adastat_pool AS p
      LEFT JOIN pool_hash AS ph ON ph.id = p.id
      LEFT JOIN pool_retire AS pr ON pr.id = p.retirement_id
      LEFT JOIN adastat_epoch_pool AS ep_l ON (ep_l.epoch_no = $1 AND ep_l.pool_id = p.id)
      LEFT JOIN adastat_epoch_pool AS ep_a ON (ep_a.epoch_no = $2 AND ep_a.pool_id = p.id)
      LEFT JOIN pool_update AS pu_l ON pu_l.id = ep_l.update_id
      LEFT JOIN pool_update AS pu_r ON pu_r.id = p.registration_id
      LEFT JOIN pool_update AS pu_u ON pu_u.id = p.update_id
      LEFT JOIN tx AS tx_r ON tx_r.id = pu_r.registered_tx_id
      LEFT JOIN block AS b_r ON b_r.id = tx_r.block_id
      LEFT JOIN unnest($3::bigint[], $4::float[]) AS apr (id, val) ON apr.id = p.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ${sortFieldMap[sort]} ${dir}, p.id ${dir}
      LIMIT ${limit + 1}
      ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
    `,
    queryValues,
    limit,
    (row) => {
      row.mithril = checkSigner(row.bech32)

      const { apr, luck } = getPoolAprAndLuck(row.id)

      row.apr = apr
      row.luck = luck

      delete row.id

      if (!row.retiring_epoch) {
        delete row.retiring_epoch
      } else if (row.retiring_epoch <= latestBlock.epoch_no) {
        row.retired = true
      }
    }
  )
}

export const getItem = async (itemId: string) => {
  const queryValues: any[] = []

  const storageData = await getData()

  queryValues.push(
    storageData.latestParsedEpoch,
    storageData.latestParsedEpoch - 2,
    itemId.startsWith('pool') ? itemId : '\\x' + itemId
  )

  const {
    rows: [data],
  } = await query(
    `
    SELECT ${fields}, p.description, p.homepage, p.extended_data, EXTRACT(epoch FROM b_u.time)::integer AS update_time, EXTRACT(epoch FROM b_t.time)::integer AS retire_announced_time, encode(tx_r.hash::bytea, 'hex') AS reg_tx_hash, encode(tx_u.hash::bytea, 'hex') AS update_tx_hash, encode(tx_t.hash::bytea, 'hex') AS retire_announced_tx_hash, pu_u.margin::numeric AS announced_margin, pu_u.fixed_cost AS announced_fixed_cost, pu_u.pledge AS announced_pledge, encode(sa.hash_raw::bytea, 'hex') AS reward_address_base16, sa.view AS reward_address_bech32, a.amount AS reward_address_live_stake, a.active_amount AS reward_address_active_stake, encode(ph_r.hash_raw::bytea, 'hex') AS reward_address_pool_hash, ph_r.view AS reward_address_pool_bech32, p_r.name AS reward_address_pool_name, p_r.ticker AS reward_address_pool_ticker, COALESCE(ep_l.update_id, p.update_id) AS update_id, p.update_id AS latest_update_id, sl.id AS slot_leader_id
    FROM adastat_pool AS p
    LEFT JOIN pool_hash AS ph ON ph.id = p.id
    LEFT JOIN slot_leader AS sl ON sl.pool_hash_id = ph.id
    LEFT JOIN pool_retire AS pr ON pr.id = p.retirement_id
    LEFT JOIN adastat_epoch_pool AS ep_l ON (ep_l.epoch_no = $1 AND ep_l.pool_id = p.id)
    LEFT JOIN adastat_epoch_pool AS ep_a ON (ep_a.epoch_no = $2 AND ep_a.pool_id = p.id)
    LEFT JOIN pool_update AS pu_l ON pu_l.id = ep_l.update_id
    LEFT JOIN pool_update AS pu_r ON pu_r.id = p.registration_id
    LEFT JOIN tx AS tx_r ON tx_r.id = pu_r.registered_tx_id
    LEFT JOIN block AS b_r ON b_r.id = tx_r.block_id
    LEFT JOIN pool_update AS pu_u ON pu_u.id = p.update_id
    LEFT JOIN tx AS tx_u ON tx_u.id = pu_u.registered_tx_id
    LEFT JOIN block AS b_u ON b_u.id = tx_u.block_id
    LEFT JOIN tx AS tx_t ON tx_t.id = pr.announced_tx_id
    LEFT JOIN block AS b_t ON b_t.id = tx_t.block_id
    LEFT JOIN adastat_account AS a ON a.id = COALESCE(pu_l.reward_addr_id, pu_u.reward_addr_id)
    LEFT JOIN stake_address AS sa ON sa.id = a.id
    LEFT JOIN pool_hash AS ph_r ON ph_r.id = a.pool
    LEFT JOIN adastat_pool AS p_r ON p_r.id = a.pool
    WHERE ph.${itemId.slice(0, 4) === 'pool' ? 'view' : 'hash_raw'} = $3
  `,
    queryValues
  )

  if (!data) {
    return throwError(404)
  }

  const poolId: bigint = data.id,
    updateId: bigint = data.update_id,
    latestUpdateId: bigint = data.latest_update_id,
    slotLeaderId: bigint = data.slot_leader_id

  delete data.id
  delete data.update_id
  delete data.latest_update_id
  delete data.slot_leader_id

  void fetchLogo(data.bech32, data.extended_data, { poolId, updateId: latestUpdateId })

  data.mithril = checkSigner(data.bech32)

  const { apr, luck } = getPoolAprAndLuck(poolId)

  data.apr = apr
  data.luck = luck

  if (data.retiring_epoch) {
    data.retired = data.retiring_epoch <= latestBlock.epoch_no
  } else {
    delete data.retiring_epoch
    delete data.retire_announced_time
    delete data.retire_announced_tx_hash
  }

  data.stake_snapshot = {
    pool_stake_mark: 0n,
    pool_stake_set: 0n,
    pool_stake_go: 0n,
    active_stake_mark: 0n,
    active_stake_set: 0n,
    active_stake_go: 0n,
  }

  const markEpochNo = storageData.latestParsedEpoch - 1,
    setEpochNo = storageData.latestParsedEpoch - 2,
    goEpochNo = storageData.latestParsedEpoch - 3

  const [
    { rows: snapshotRows },
    {
      rows: [epochRow],
    },
    {
      rows: [orphanRow],
    },
    {
      rows: [neglectedRow],
    },
    { rows: ownerRows },
    { rows: relayRows },
    {
      rows: [calidusRow],
    },
    {
      rows: [votingRow],
    },
  ] = await Promise.all([
    query(
      `
        SELECT ae.no AS epoch_no, COALESCE(ep.stake, 0)::bigint AS stake, ae.stake AS total_stake
        FROM adastat_epoch AS ae
        LEFT JOIN adastat_epoch_pool AS ep ON ep.epoch_no = ae.no AND ep.pool_id = $1
        WHERE ae.no IN ($2, $3, $4)
      `,
      [poolId, markEpochNo, setEpochNo, goEpochNo]
    ),

    query(
      `
        SELECT GREATEST(COUNT(*)-2, 0)::integer AS active_epoch, COUNT(*) FILTER (WHERE block > 0)::integer AS epoch_with_block
        FROM adastat_epoch_pool
        WHERE pool_id = $1 AND epoch_no > $2
      `,
      [poolId, networkParams.shelley]
    ),

    query(
      `
        SELECT o.block_no
        FROM adastat_block_orphan AS o
        LEFT JOIN block AS b ON (b.block_no = o.block_no AND (b.slot_leader_id <> o.slot_leader_id OR b.hash <> o.hash))
        WHERE o.slot_leader_id = $1 AND b.block_no IS NOT NULL
        LIMIT 1
      `,
      [slotLeaderId]
    ),

    data.retired
      ? query(
          `
        SELECT SUM(amount) AS live_stake, COUNT(*) AS delegator
        FROM adastat_account
        WHERE retired_pool = $1 AND pool = 0
      `,
          [poolId]
        )
      : { rows: [] },

    updateId
      ? query(
          `
        SELECT encode(sa.hash_raw::bytea, 'hex') AS hash, sa.view AS bech32, a.amount AS live_stake, a.active_amount AS active_stake, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker
        FROM pool_owner AS po
        LEFT JOIN adastat_account AS a ON a.id = po.addr_id
        LEFT JOIN stake_address AS sa ON sa.id = a.id
        LEFT JOIN pool_hash AS ph ON ph.id = a.pool
        LEFT JOIN adastat_pool AS p ON p.id = a.pool
        WHERE po.pool_update_id = $1
      `,
          [updateId]
        )
      : { rows: [] },

    latestUpdateId
      ? query<RelayRow>(
          `
        SELECT ipv4, ipv6, dns_name, dns_srv_name, port
        FROM pool_relay
        WHERE update_id = $1
      `,
          [latestUpdateId]
        )
      : { rows: [] },

    query(
      `
        SELECT x.nonce,
          ENCODE(x.raw_hash, 'hex') AS hash,
          cardano.bech32_encode('calidus', '\\xa1'::bytea || cardano.blake2b_hash(x.raw_hash, 28)) AS bech32,
          ENCODE(tx.hash, 'hex') AS tx_hash,
          x.raw_hash != '\\x00000000000000000000000000000000'::bytea AS registered
        FROM (
          SELECT nonce,
            raw_hash,
            tx_id
          FROM (
            SELECT id,
              nonce,
              raw_hash,
              tx_id,
              cardano.tools_verify_cip88_pool_key_registration(bytes) AS is_valid
            FROM (
              SELECT id,
                (json->'1'->>'4')::bigint AS nonce,
                json_hex_str_to_bytea(json->'1'->>'7') AS raw_hash,
                tx_id,
                bytes
              FROM tx_metadata
              WHERE key = 867
                AND json->'1'->'1'->>1 = '0x' || $1
                AND json->>'0' IN ('2','3') -- Filter for records using CIP-0088 version 2 (and placeholder 3)
                AND json->'1'->'1'->>0 ='1' -- Filter for Pool ID registrations only
                AND json->'1'->'3'->>0 = '2' -- Ensure Signature validation method is CIP-0008
            )
            WHERE LENGTH(raw_hash) = 32
          )
          WHERE is_valid = TRUE
          ORDER BY nonce DESC, id ASC
          LIMIT 1
        ) AS x
        LEFT JOIN tx ON tx.id = x.tx_id
      `,
      [data.hash]
    ),

    query(
      `
        WITH lav AS (
          SELECT DISTINCT ON (gov_action_proposal_id) vote
          FROM voting_procedure
          WHERE pool_voter = $1
          ORDER BY gov_action_proposal_id, id DESC
        )
        SELECT
          COUNT(*) FILTER (WHERE vote = 'Yes')::integer AS yes,
          COUNT(*) FILTER (WHERE vote = 'No')::integer AS no,
          COUNT(*) FILTER (WHERE vote = 'Abstain')::integer AS abstain
        FROM lav
      `,
      [poolId]
    ),
  ])

  const relayData = resolveRelays(poolId, relayRows, latestUpdateId)

  data.owners = ownerRows

  if (neglectedRow) {
    data.live_stake = neglectedRow.live_stake
    data.delegator = neglectedRow.delegator
  }

  data.live_saturation =
    data.live_stake > 0 && storageData.liveSaturationPoint > 0
      ? (Number(data.live_stake) / Number(storageData.liveSaturationPoint)).toFixed(4)
      : 0
  data.active_saturation =
    data.active_stake > 0 && storageData.activeSaturationPoint > 0
      ? (Number(data.active_stake) / Number(storageData.activeSaturationPoint)).toFixed(4)
      : 0

  for (const row of snapshotRows) {
    if (row.epoch_no === markEpochNo) {
      data.stake_snapshot.pool_stake_mark = row.stake
      data.stake_snapshot.active_stake_mark = row.total_stake
    } else if (row.epoch_no === setEpochNo) {
      data.stake_snapshot.pool_stake_set = row.stake
      data.stake_snapshot.active_stake_set = row.total_stake
    } else if (row.epoch_no === goEpochNo) {
      data.stake_snapshot.pool_stake_go = row.stake
      data.stake_snapshot.active_stake_go = row.total_stake
    }
  }

  data.active_epoch = epochRow?.active_epoch ?? 0
  data.epoch_with_block = epochRow?.epoch_with_block ?? 0

  data.orphan_block = Boolean(orphanRow)

  const poolApr = getPoolApr(poolId)
  if (!poolApr.blockProbability.length) {
    if (data.stake_snapshot.pool_stake_set > 0) {
      const n = networkParams.epochLength * networkParams.activeSlotsCoeff,
        p = parseFloat(data.stake_snapshot.pool_stake_set) / parseFloat(data.stake_snapshot.active_stake_set),
        lambda = n * p,
        s = 6 * Math.sqrt(lambda * (1 - p)),
        startRange = Math.max(Math.floor(lambda - s), 0),
        endRange = Math.ceil(lambda + s)

      const { rows: probRows } = await query<(typeof poolApr.blockProbability)[number]>(
        `
          WITH dist AS (
            SELECT
              k,
              exp(
                  lgamma($1 + 1)
                  - lgamma(k + 1)
                  - lgamma($1 - k + 1)
                  + k * ln($2)
                  + ($1 - k) * ln(1 - $2)
              ) AS v
            FROM generate_series($3::integer, $4::integer) AS k
          )
          SELECT *
          FROM dist
          WHERE v >= 0.00005
          ORDER BY k
        `,
        [n, p, startRange, endRange]
      )

      poolApr.blockProbability = probRows
    }
  }

  data.blocks_probability = poolApr.blockProbability

  for (const block of storageData.nonParsedBlocks.values()) {
    if (block.slotLeaderId === slotLeaderId) {
      if (data.block === 0) {
        data.block_epoch++
      }
      data.total_block++
      data.block++
    }
  }

  data.calidus = calidusRow

  data.vote_yes = votingRow?.yes ?? 0
  data.vote_no = votingRow?.no ?? 0
  data.vote_abstain = votingRow?.abstain ?? 0

  let totalValidGA = 0

  for (const ga of govActions.values()) {
    const gaDeadlineEpoch = ga.expired_epoch || ga.ratified_epoch || ga.dropped_epoch || ga.expiry_epoch,
      gaDeadlineTime = networkParams.startTime + gaDeadlineEpoch * networkParams.epochLength * networkParams.slotLength

    if (data.reg_time < gaDeadlineTime) {
      if (ga.type === 'InfoAction') {
        totalValidGA++
      } else if (ga.bootstrap_period) {
        if (ga.type === 'HardForkInitiation') {
          totalValidGA++
        }
      } else if (ga.type === 'ParameterChange') {
        const criticalParams = [
            'maxBlockBodySize',
            'maxTxSize',
            'maxBlockHeaderSize',
            'maxValueSize',
            'maxBlockExecutionUnits',
            'txFeePerByte',
            'txFeeFixed',
            'minFeeRefScriptCoinsPerByte',
            'utxoCostPerByte',
            'govDeposit',
          ],
          gaParams = Object.keys(ga.description?.contents?.[1] ?? {})

        let isCriticalParams = false

        for (const gaParam of gaParams) {
          if (criticalParams.includes(gaParam)) {
            isCriticalParams = true

            break
          }
        }

        if (isCriticalParams) {
          totalValidGA++
        }
      } else if (ga.type !== 'NewConstitution' && ga.type !== 'TreasuryWithdrawals') {
        totalValidGA++
      }
    }
  }

  data.not_voted = totalValidGA - data.vote_yes - data.vote_no - data.vote_abstain

  return {
    poolId,
    slotLeaderId,
    relayData,
    data,
  }
}

export const rowSortFieldMap = {
  epochs: {
    no: 'e.no',
    reward_amount: 'ep.delegator_reward',
    apr: 'COALESCE(ep.delegator_reward::numeric / NULLIF(ep_a.stake, 0), 0)',
    stake: 'ep_a.stake',
    delegator: 'ep_a.delegator',
    margin: 'pu_a.margin::numeric',
    fixed_cost: 'pu_a.fixed_cost',
    pledge: 'pu_a.pledge',
    pool_fee: 'ep.pool_reward',
    block: 'ep.block',
    epoch_stake: 'ep.stake',
  },
  blocks: {
    no: '',
    tx: '',
    tx_amount: '',
    tx_out_sum: '',
    tx_fee: '',
    size: '',
  },
  orphan_blocks: {
    no: 'o.block_no',
  },
  delegators: {
    live_stake: 'a.amount',
    total_reward_amount: 'a.total_reward',
  },
  delegations: {
    time: 'd.id',
  },
  updates: {
    time: 'pu.id',
    pledge: 'pu.pledge',
    margin: 'pu.margin::numeric',
    fixed_cost: 'pu.fixed_cost',
    active_epoch_no: 'pu.active_epoch_no',
  },
  votes: {
    time: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  sort,
  dir,
  limit,
  after,
  rows: rowsType,
  poolId,
  slotLeaderId,
  data: item,
}: RowsQueryString<RowSortFieldMap> & {
  poolId: bigint
  slotLeaderId: bigint
  data: AnyObject
}) => {
  const where: string[] = [],
    queryValues: any[] = [],
    cursorValues = decodeCursor(after)

  const storageData = await getData()

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'epochs') {
    let orderBy = `ORDER BY ${rowSortFieldMap[rowsType][sort]} ${dir}`
    if (sort !== 'no') {
      orderBy += `, ep.epoch_no ${dir}`
    }

    where.push('ep.pool_id = $1')
    queryValues.push(poolId, networkParams.epochLength * networkParams.activeSlotsCoeff)

    if (after) {
      if (sort === 'no') {
        queryValues.push(after)
        where.push(`ep.epoch_no ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
      } else {
        queryValues.push(...cursorValues)
        where.push(
          `(${rowSortFieldMap[rowsType][sort]}, ep.epoch_no) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
        )
      }
    }

    if (item.retiring_epoch > 0) {
      queryValues.push(Math.min(item.retiring_epoch + 2, latestBlock.epoch_no))
    } else {
      queryValues.push(latestBlock.epoch_no)
    }
    where.push(`e.no < $${queryValues.length}`)

    const epochsPerYear = (365 * 86_400) / (networkParams.epochLength * networkParams.slotLength)

    const tabFields = Object.entries(rowSortFieldMap[rowsType])
      .map(([k, v]) => `${v} AS ${k}`)
      .join(',')

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT ${
        sort === 'no'
          ? rowSortFieldMap[rowsType][sort]
          : 'CONCAT(' + rowSortFieldMap[rowsType][sort] + ",'-',ep.epoch_no)"
      } AS cursor, ${tabFields}, ep_a.real_pledge AS owner_live_stake, ep.orphaned_reward AS orphaned_reward_amount, ROUND((1-p.decentralisation)::numeric * $2 * ep_a.stake / NULLIF(ae_a.stake, 0), 2) AS estimated_block
      FROM adastat_epoch_pool AS ep
      LEFT JOIN adastat_epoch AS ae ON ae.no = ep.epoch_no
      LEFT JOIN epoch AS e ON e.no = ep.epoch_no
      LEFT JOIN epoch_param p ON p.epoch_no = e.no
      LEFT JOIN epoch AS e_a ON e_a.no = e.no - 2
      LEFT JOIN adastat_epoch AS ae_a ON ae_a.no = e_a.no
      LEFT JOIN adastat_epoch_pool AS ep_a ON ep_a.epoch_no = e_a.no AND ep_a.pool_id = ep.pool_id
      LEFT JOIN pool_update AS pu_a ON pu_a.id = ep_a.update_id
      WHERE ${where.join(' AND ')} AND ep_a.epoch_no IS NOT NULL
      ${orderBy}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit,
      (row) => {
        const poolApr = storageData.poolApr.get(poolId)

        if (row.no === storageData.latestParsedEpoch - 1 && !row.reward_amount && poolApr) {
          row.reward_amount = poolApr.rewards
          row.pool_fee = poolApr.fees
        }

        row.apr =
          poolApr?.ratio.has(row.no) || (row.reward_amount > 0 && row.stake > 0)
            ? (
                Math.pow(
                  (poolApr?.ratio.get(row.no) ?? parseInt(row.reward_amount) / parseInt(row.stake)) + 1,
                  epochsPerYear
                ) - 1
              ).toFixed(4)
            : '0'
      }
    ))
  } else if (rowsType === 'orphan_blocks') {
    if (item.orphan_block) {
      queryValues.push(slotLeaderId)
      where.push('o.slot_leader_id = $1')

      if (after) {
        queryValues.push(after)
        where.push(`o.block_no ${dir === 'asc' ? '>' : '<'} $2`)
      }
      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT o.block_no AS cursor, encode(o.hash::bytea, 'hex') AS orphan_hash, o.epoch_no AS orphan_epoch_no, o.epoch_slot_no AS orphan_epoch_slot_no, o.block_no AS orphan_no, o.slot_no::integer AS orphan_slot_no, o.size AS orphan_size, o.tx_count::integer AS orphan_tx, EXTRACT(epoch FROM o.time)::integer AS orphan_time, encode(b.hash::bytea, 'hex') AS hash, b.epoch_no, b.epoch_slot_no, b.block_no AS no, b.slot_no::integer, b.size, b.tx_count::integer AS tx, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker
        FROM adastat_block_orphan AS o
        LEFT JOIN block AS b ON b.block_no = o.block_no AND (b.slot_leader_id <> o.slot_leader_id OR b.hash <> o.hash)
        LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        WHERE ${where.join(' AND ')} AND b.block_no IS NOT NULL
        ORDER BY o.block_no ${dir}
        LIMIT ${limit + 1}
      `,
        queryValues,
        limit
      ))
    }
  } else if (rowsType === 'delegators') {
    const orderBy = `ORDER BY ${rowSortFieldMap[rowsType][sort]}+0 ${dir}, a.id ${dir}`

    queryValues.push(poolId)
    where.push(item.retired ? 'a.retired_pool = $1 AND a.pool = 0' : 'a.pool = $1')

    if (item.delegator) {
      const {
        rows: [delegatorRow],
      } = await query(
        `
        SELECT COUNT(*) FILTER (WHERE a.amount < 1000000)::integer AS qty_0,
               COUNT(*) FILTER (WHERE a.amount >= 1000000 AND a.amount < 10000000)::integer AS qty_1,
               COUNT(*) FILTER (WHERE a.amount >= 10000000 AND a.amount < 100000000)::integer AS qty_2,
               COUNT(*) FILTER (WHERE a.amount >= 100000000 AND a.amount < 1000000000)::integer AS qty_3,
               COUNT(*) FILTER (WHERE a.amount >= 1000000000 AND a.amount < 10000000000)::integer AS qty_4,
               COUNT(*) FILTER (WHERE a.amount >= 10000000000 AND a.amount < 100000000000)::integer AS qty_5,
               COUNT(*) FILTER (WHERE a.amount >= 100000000000 AND a.amount < 1000000000000)::integer AS qty_6,
               COUNT(*) FILTER (WHERE a.amount >= 1000000000000 AND a.amount < 10000000000000)::integer AS qty_7,
               COUNT(*) FILTER (WHERE a.amount >= 10000000000000)::integer AS qty_8,
               SUM(a.amount) FILTER (WHERE a.amount < 1000000)::numeric AS stake_0,
               SUM(a.amount) FILTER (WHERE a.amount >= 1000000 AND a.amount < 10000000)::numeric AS stake_1,
               SUM(a.amount) FILTER (WHERE a.amount >= 10000000 AND a.amount < 100000000)::numeric AS stake_2,
               SUM(a.amount) FILTER (WHERE a.amount >= 100000000 AND a.amount < 1000000000)::numeric AS stake_3,
               SUM(a.amount) FILTER (WHERE a.amount >= 1000000000 AND a.amount < 10000000000)::numeric AS stake_4,
               SUM(a.amount) FILTER (WHERE a.amount >= 10000000000 AND a.amount < 100000000000)::numeric AS stake_5,
               SUM(a.amount) FILTER (WHERE a.amount >= 100000000000 AND a.amount < 1000000000000)::numeric AS stake_6,
               SUM(a.amount) FILTER (WHERE a.amount >= 1000000000000 AND a.amount < 10000000000000)::numeric AS stake_7,
               SUM(a.amount) FILTER (WHERE a.amount >= 10000000000000)::numeric AS stake_8
        FROM adastat_account AS a
        WHERE ${where.join(' AND ')}
      `,
        queryValues
      )

      if (delegatorRow) {
        item.delegator_types = {
          0: { qty: delegatorRow.qty_0, stake: delegatorRow.stake_0 },
          1: { qty: delegatorRow.qty_1, stake: delegatorRow.stake_1 },
          2: { qty: delegatorRow.qty_2, stake: delegatorRow.stake_2 },
          3: { qty: delegatorRow.qty_3, stake: delegatorRow.stake_3 },
          4: { qty: delegatorRow.qty_4, stake: delegatorRow.stake_4 },
          5: { qty: delegatorRow.qty_5, stake: delegatorRow.stake_5 },
          6: { qty: delegatorRow.qty_6, stake: delegatorRow.stake_6 },
          7: { qty: delegatorRow.qty_7, stake: delegatorRow.stake_7 },
          8: { qty: delegatorRow.qty_8, stake: delegatorRow.stake_8 },
        }
      }

      if (after) {
        queryValues.push(...cursorValues)
        where.push(
          `(${rowSortFieldMap[rowsType][sort]}, a.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
        )
      }

      ;({ rows, cursor } = await cursorQuery(
        `
        WITH a AS (
          SELECT a.id, a.amount, a.total_reward, a.last_tx
          FROM adastat_account AS a
          WHERE ${where.join(' AND ')}
          ${orderBy}
          LIMIT ${limit + 1}
        ),
        d AS (
          SELECT DISTINCT ON (d.addr_id) d.addr_id, d.tx_id, ad.from_pool
          FROM delegation AS d
          LEFT JOIN adastat_delegation AS ad ON ad.id = d.id
          WHERE d.addr_id IN (SELECT id FROM a) AND d.pool_hash_id = $1
          ORDER BY d.addr_id, d.id DESC
        )
        SELECT CONCAT(${
          rowSortFieldMap[rowsType][sort]
        }, '-', a.id) AS cursor, encode(s.hash_raw::bytea, 'hex') AS base16, s.view AS bech32, a.amount AS live_stake, a.total_reward AS total_reward_amount, encode(tx.hash::bytea, 'hex') AS tx_hash, EXTRACT(epoch FROM b.time)::integer AS tx_time, encode(ph.hash_raw::bytea, 'hex') AS prev_pool_hash, ph.view AS prev_pool_bech32, p.name AS prev_pool_name, p.ticker AS prev_pool_ticker, encode(l_tx.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM l_b.time)::integer AS last_tx_time
        FROM a
        LEFT JOIN stake_address AS s ON s.id = a.id
        LEFT JOIN d ON d.addr_id = s.id
        LEFT JOIN pool_hash AS ph ON ph.id = d.from_pool
        LEFT JOIN adastat_pool AS p ON p.id = ph.id
        LEFT JOIN tx ON tx.id = d.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        LEFT JOIN tx AS l_tx ON l_tx.id = a.last_tx
        LEFT JOIN block AS l_b ON l_b.id = l_tx.block_id
        ${orderBy}
      `,
        queryValues,
        limit
      ))
    } else {
      item.delegator_types = {
        0: { qty: 0, stake: 0n },
        1: { qty: 0, stake: 0n },
        2: { qty: 0, stake: 0n },
        3: { qty: 0, stake: 0n },
        4: { qty: 0, stake: 0n },
        5: { qty: 0, stake: 0n },
        6: { qty: 0, stake: 0n },
        7: { qty: 0, stake: 0n },
        8: { qty: 0, stake: 0n },
      }
    }
  } else if (rowsType === 'delegations') {
    const orderBy = `ORDER BY d.tx_id+0 ${dir}, d.cert_index+0 ${dir}`

    queryValues.push(poolId)

    if (after) {
      queryValues.push(...cursorValues)
      where.push(
        `(d.tx_id, d.cert_index) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT CONCAT(d.tx_id, '-', d.cert_index) AS cursor, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, encode(tx.hash::bytea, 'hex') AS tx_hash, b.epoch_no, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker, d.active_epoch_no, CASE
        WHEN d.to_pool = $1 THEN d.amount::text
        WHEN d.amount > 0 THEN (-d.amount)::text
        ELSE '-0'
      END AS stake
      FROM (
        (
          SELECT d.tx_id, d.cert_index, d.addr_id, NULL AS to_pool, ad.from_pool, ad.amount, d.epoch_no+2 AS active_epoch_no
          FROM adastat_stake_deregistration AS ad
          LEFT JOIN stake_deregistration AS d ON d.id = ad.id
          WHERE ad.from_pool = $1 ${
            where.length
              ? ' AND ad.id ' +
                (dir === 'asc' ? '>=' : '<=') +
                '(SELECT id FROM stake_deregistration AS d WHERE ' +
                where.join(' AND ') +
                ' ' +
                orderBy +
                ' LIMIT 1)'
              : ''
          }
          ORDER BY ad.id+0 ${dir}
          LIMIT ${limit + 1}
        ) UNION (
          SELECT d.tx_id, d.cert_index, d.addr_id, d.pool_hash_id AS to_pool, ad.from_pool, ad.amount, d.active_epoch_no
          FROM (
            SELECT id
            FROM (
              (
                SELECT d.id
                FROM delegation AS d
                WHERE d.pool_hash_id = $1 ${where.length ? ' AND ' + where.join(' AND ') : ''}
                ORDER BY d.id+0 ${dir}
                LIMIT ${limit + 1}
              ) UNION (
                SELECT id
                FROM adastat_delegation AS d
                WHERE d.from_pool = $1 ${
                  where.length
                    ? ' AND d.id ' +
                      (dir === 'asc' ? '>=' : '<=') +
                      '(SELECT id FROM delegation AS d WHERE ' +
                      where.join(' AND ') +
                      ' ' +
                      orderBy +
                      ' LIMIT 1)'
                    : ''
                }
                ORDER BY d.id+0 ${dir}
                LIMIT ${limit + 1}
              )
            ) AS d
            ORDER BY d.id+0 ${dir}
            LIMIT ${limit + 1}
          ) AS rows
          LEFT JOIN delegation AS d ON d.id = rows.id
          LEFT JOIN adastat_delegation AS ad ON ad.id = d.id
        )
        ORDER BY tx_id ${dir}, cert_index ${dir}
        LIMIT ${limit + 1}
      ) AS d
      LEFT JOIN stake_address AS sa ON sa.id = d.addr_id
      LEFT JOIN tx ON tx.id = d.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN pool_hash AS ph ON ph.id = CASE WHEN d.from_pool = d.to_pool THEN $1 ELSE COALESCE(NULLIF(d.from_pool, $1), NULLIF(d.to_pool, $1)) END
      LEFT JOIN adastat_pool AS p ON p.id = ph.id
      ${orderBy}
    `,
      queryValues,
      limit
    ))
  } else if (rowsType === 'updates') {
    let orderBy = `ORDER BY ${rowSortFieldMap[rowsType][sort]} ${dir}`
    if (sort !== 'time') {
      orderBy += `, pu.id ${dir}`
    }

    queryValues.push(poolId, networkParams.startTime, networkParams.epochLength * networkParams.slotLength)
    where.push('pu.hash_id = $1')

    if (after) {
      queryValues.push(cursorValues[0])
      if (sort === 'time') {
        where.push(`pu.id ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
      } else {
        queryValues.push(cursorValues[1])
        where.push(
          `(${rowSortFieldMap[rowsType][sort]}, pu.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
        )
      }
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT ${sort === 'time' ? 'pu.id' : 'CONCAT(' + rowSortFieldMap[rowsType][sort] + ",'-',pu.id)"} AS cursor, pu.pledge, pu.active_epoch_no, pu.margin::numeric, pu.fixed_cost, pu.active_epoch_no::integer, $2 + pu.active_epoch_no::integer * $3 AS active_time, pu.deposit AS deposit_amount, encode(pu.vrf_key_hash::bytea, 'hex') AS vrf_key_hash, sa.view AS reward_address_bech32, encode(sa.hash_raw::bytea, 'hex') AS reward_address_base16, mr.url AS meta_url, encode(mr.hash::bytea, 'hex') AS meta_hash,
      COALESCE(convert_pool_meta(pd.bytes), '{}'::jsonb) AS meta_json, encode(tx.hash::bytea, 'hex') AS tx_hash, pu.cert_index, b.epoch_no, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS tx_time, coalesce(jsonb_agg(DISTINCT jsonb_build_object('base16', encode(so.hash_raw::bytea, 'hex'), 'bech32', so.view)) FILTER (WHERE po.addr_id IS NOT NULL), '[]'::jsonb) AS owners, coalesce(jsonb_agg(DISTINCT jsonb_build_object('relay', coalesce(pr.ipv4, pr.ipv6, pr.dns_name, pr.dns_srv_name), 'port', pr.port)), '[]'::jsonb) AS relays
      FROM pool_update AS pu
      LEFT JOIN stake_address AS sa ON sa.id = pu.reward_addr_id
      LEFT JOIN pool_metadata_ref AS mr ON mr.id = pu.meta_id
      LEFT JOIN off_chain_pool_data AS pd ON pd.pmr_id = mr.id
      LEFT JOIN tx ON tx.id = pu.registered_tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN pool_owner AS po ON po.pool_update_id = pu.id
      LEFT JOIN stake_address AS so ON so.id = po.addr_id
      LEFT JOIN pool_relay AS pr ON pr.update_id = pu.id
      WHERE ${where.join(' AND ')}
      GROUP BY pu.id, sa.id, mr.id, pd.id, tx.id, b.id
      ${orderBy}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit
    ))
  } else if (rowsType === 'votes') {
    queryValues.push(poolId)
    where.push('vp.pool_voter = $1')

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
        WHERE vp.pool_voter = $1 AND b.epoch_no < COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration)
        ORDER BY vp.gov_action_proposal_id, vp.id DESC
      )
      SELECT vp.id AS cursor, encode(tx.hash::bytea, 'hex') AS tx_hash, vp.index AS cert_index, LOWER(vp.vote::text) AS vote, b.epoch_no AS submission_epoch, LOWER(g.type::text) AS type, encode(gtx.hash::bytea, 'hex') AS gtx_hash, g.index AS gtx_index, ovd.json->'body'->>'title' AS title, EXTRACT(epoch FROM b.time)::integer AS tx_time, vva.url AS meta_url, encode(vva.data_hash::bytea, 'hex') AS meta_hash, vpd.json,
        CASE
          WHEN b.epoch_no >= COALESCE(g.ratified_epoch, g.expired_epoch, g.expiration) THEN jsonb_build_object('reason', 'late')
          WHEN vp.id < lav.id THEN jsonb_build_object('reason', 'superseded', 'vote', LOWER(lav.vote::text))
          ELSE NULL
        END AS invalidation
      FROM voting_procedure AS vp
      LEFT JOIN lav ON lav.gov_action_proposal_id = vp.gov_action_proposal_id
      LEFT JOIN voting_anchor AS vva ON vva.id = vp.voting_anchor_id
      LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = vp.voting_anchor_id
      LEFT JOIN tx ON tx.id = vp.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      LEFT JOIN gov_action_proposal AS g ON g.id = vp.gov_action_proposal_id
      LEFT JOIN tx AS gtx ON gtx.id = g.tx_id
      LEFT JOIN voting_anchor AS gva ON gva.id = g.voting_anchor_id
      LEFT JOIN off_chain_vote_data AS ovd ON ovd.voting_anchor_id = gva.id AND ovd.hash = gva.data_hash
      WHERE ${where.join(' AND ')}
      ORDER BY vp.id ${dir}
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
