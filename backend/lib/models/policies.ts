import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError } from '@/helper.ts'
import { delegations, dreps } from '@/helpers/dreps.ts'
import { mintingCheck } from '@/helpers/tokens.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  first_tx: 'p.first_tx',
  last_tx: 'p.last_tx',
  token: 'p.token',
  tx: 'p.tx',
  holder: 'p.holder',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  hash: "encode(p.policy::bytea, 'hex')",
  token: 'p.token',
  first_tx_hash: "encode(ft.hash::bytea, 'hex')",
  first_tx_time: 'EXTRACT(epoch FROM fb.time)::integer',
  last_tx_hash: "encode(lt.hash::bytea, 'hex')",
  last_tx_time: 'EXTRACT(epoch FROM lb.time)::integer',
  tx: 'p.tx',
  holder: 'p.holder',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

export const getList = async ({ sort, dir, limit, after, page }: QueryString<ListSort>) => {
  const where: string[] = [],
    queryValues: any[] = []

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(...cursorValues)

    where.push(
      `(${sortFieldMap[sort]}, p.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )

    orderBy += `, p.id ${dir}`
  }

  return await cursorQuery(
    `
      SELECT CONCAT(${sortFieldMap[sort]},'-',p.id) AS cursor, ${fields}
      FROM (
        SELECT p.id
        FROM adastat_ma_policy AS p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ${orderBy}
    LIMIT ${limit + 1}
    ${after ? '' : 'OFFSET ' + (page - 1) * limit}
      ) AS rows
      LEFT JOIN adastat_ma_policy AS p ON p.id = rows.id
      LEFT JOIN tx AS ft ON ft.id = p.first_tx
      LEFT JOIN block AS fb ON fb.id = ft.block_id
      LEFT JOIN tx AS lt ON lt.id = p.last_tx
      LEFT JOIN block AS lb ON lb.id = lt.block_id
      ${orderBy}
    `,
    queryValues,
    limit,
    (row) => {
      row.token = Number(row.token)
      row.tx = Number(row.tx)
      row.holder = Number(row.holder)
    }
  )
}

export const getItem = async (itemId: string) => {
  const queryValues: any[] = ['\\x' + itemId]

  const {
    rows: [data],
  } = await query(
    `
    SELECT ${fields}, LOWER(s.type::text) AS script_type, s.json AS timelock_script, encode(s.bytes, 'hex') AS plutus_script, p.id, p.first_tx, p.last_tx
    FROM adastat_ma_policy AS p
    LEFT JOIN tx AS ft ON ft.id = p.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = p.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    LEFT JOIN script AS s ON s.hash = p.policy
    WHERE p.policy = $1
    LIMIT 1
  `,
    queryValues
  )

  if (!data) {
    return throwError(404)
  }

  const policyId = data.id,
    firstTx = data.first_tx,
    lastTx = data.last_tx

  data.token = Number(data.token)
  data.tx = parseInt(data.tx)
  data.holder = Number(data.holder)
  data.script = data.timelock_script || data.plutus_script

  delete data.id
  delete data.first_tx
  delete data.last_tx
  delete data.timelock_script
  delete data.plutus_script

  data.nft = false
  data.locked = false

  if (data.script_type === 'timelock' && Array.isArray(data.script?.scripts)) {
    data.locked = !mintingCheck(data.script, latestBlock.slot_no)
  }

  const {
    rows: [maRow],
  } = await query(
    `
      SELECT array_agg(multi_asset.id) AS ids, bool_and(adastat_multi_asset.supply = 1) AS nft
      FROM multi_asset
      LEFT JOIN adastat_multi_asset ON adastat_multi_asset.id = multi_asset.id
      WHERE multi_asset.policy = $1
    `,
    queryValues
  )

  if (maRow) {
    data.nft = maRow.nft
  }

  return {
    policyId,
    firstTx,
    lastTx,
    tokenIds: maRow?.ids ?? [],
    data,
  }
}

export const rowSortFieldMap = {
  tokens: {
    first_tx: '',
    last_tx: '',
    supply: '',
    tx: '',
    holder: '',
  },
  transactions: {
    time: '',
  },
  minting: {
    time: '',
  },
  holders: {
    token: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  dir,
  limit,
  after,
  policyId,
  rows: rowsType,
  firstTx,
  lastTx,
  tokenIds,
  data: item,
}: RowsQueryString<RowSortFieldMap> & {
  policyId: bigint
  firstTx: bigint
  lastTx: bigint
  tokenIds: bigint[]
  data: AnyObject
}) => {
  const where: string[] = [],
    queryValues: any[] = []

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'transactions') {
    const txOutIds = [],
      maIds = new Set(),
      txIds = new Set()

    let needMoreTx = true,
      minTxOutId = 0n,
      maxTxOutId = 0n

    const {
      rows: [txOutRow],
    } = await query(
      `
      SELECT MIN(id) AS min_tx_out_id, MAX(id) AS max_tx_out_id
      FROM tx_out
      WHERE tx_id = $1 OR tx_id = $2
    `,
      [firstTx, lastTx]
    )

    if (txOutRow) {
      minTxOutId = txOutRow.min_tx_out_id
      maxTxOutId = txOutRow.max_tx_out_id
    }

    while (needMoreTx) {
      queryValues.push(tokenIds)
      where.push(`ma_tx_out.ident = ANY($1::bigint[])`)

      if (after) {
        queryValues.push(after)
        where.push(`ma_tx_out.tx_out_id ${dir === 'asc' ? '>' : '<'} $2`)

        queryValues.push(dir === 'asc' ? maxTxOutId : minTxOutId)
        where.push(`ma_tx_out.tx_out_id ${dir === 'asc' ? '<=' : '>='} $3`)
      } else {
        queryValues.push(minTxOutId, maxTxOutId)
        where.push(`ma_tx_out.tx_out_id >= $2 AND ma_tx_out.tx_out_id <= $3`)
      }
      const { rows: maTxOutRows } = await query(
        `
        SELECT ma_tx_out.tx_out_id, tx_out.tx_id, ma_tx_out.ident
        FROM ma_tx_out
        LEFT JOIN tx_out ON tx_out.id = ma_tx_out.tx_out_id
        LEFT JOIN adastat_tx ON adastat_tx.id = tx_out.tx_id
        WHERE ${where.join(' AND ')}
        ORDER BY ma_tx_out.tx_out_id ${dir}
        LIMIT ${limit + 1}
      `,
        queryValues
      )
      for (const row of maTxOutRows) {
        if (txIds.size <= limit) {
          txOutIds.push(row.tx_out_id)
          maIds.add(row.ident)
          txIds.add(row.tx_id + '-' + row.ident)
          after = row.tx_out_id
        } else {
          needMoreTx = false
          break
        }
      }
      if (maTxOutRows.length < limit + 1) {
        needMoreTx = false
      }
    }

    if (txOutIds.length) {
      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT ma.cursor, ma.token, encode(tx.hash::bytea, 'hex') AS tx_hash, b.block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time
        FROM (
          SELECT tx_out.tx_id, COUNT(DISTINCT ma_tx_out.ident) AS token, ${dir === 'asc' ? 'MAX' : 'MIN'}(ma_tx_out.tx_out_id) AS cursor
          FROM ma_tx_out
          LEFT JOIN tx_out ON tx_out.id = ma_tx_out.tx_out_id
          WHERE ma_tx_out.tx_out_id = ANY($1::bigint[]) AND ma_tx_out.ident = ANY($2::bigint[])
          GROUP BY tx_out.tx_id
        ) AS ma
        LEFT JOIN tx ON tx.id = ma.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        ORDER BY ma.tx_id ${dir}
        LIMIT ${limit + 1}
      `,
        [txOutIds, [...maIds.values()]],
        limit,
        (row) => {
          if (row.time > item.last_tx_time) {
            item.last_tx_hash = row.tx_hash
            item.last_tx_time = row.time
          }
        }
      ))
    }
  } else if (rowsType === 'minting') {
    queryValues.push(tokenIds)
    where.push(`ident = ANY($1::bigint[])`)

    if (after) {
      queryValues.push(after)
      where.push(`tx_id ${dir === 'asc' ? '>' : '<'} $2`)

      queryValues.push(dir === 'asc' ? firstTx : lastTx)
      where.push(`tx_id ${dir === 'asc' ? '<=' : '>='} $3`)
    } else {
      queryValues.push(firstTx, lastTx)
      where.push(`tx_id >= $2 AND tx_id <= $3`)
    }
    ;({ rows, cursor } = await cursorQuery(
      `
      WITH mm AS (
        SELECT tx_id, COUNT(DISTINCT ident) AS token
        FROM ma_tx_mint
        WHERE ${where.join(' AND ')}
        GROUP BY tx_id
        ORDER BY tx_id ${dir}
        LIMIT ${limit + 1}
      )
      SELECT mm.tx_id AS cursor, mm.token, encode(tx.hash::bytea, 'hex') AS tx_hash, b.block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time
      FROM mm
      LEFT JOIN tx ON tx.id = mm.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      ORDER BY mm.tx_id ${dir}
    `,
      queryValues,
      limit
    ))
  } else if (rowsType === 'holders') {
    queryValues.push(policyId)

    if (after) {
      const cursorValues = decodeCursor(after)

      queryValues.push(...cursorValues)

      where.push(`(quantity, holder_id) ${dir === 'asc' ? '>' : '<'} ($2, $3)`)
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT CONCAT(mh.quantity,'-',mh.holder_id) AS cursor, mh.quantity AS token, COALESCE(ad.address, ab.address) AS address, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, COALESCE(a.amount, ad.amount, ab.amount) AS balance, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker, a.id
      FROM (
        SELECT account_id, holder_id, quantity
        FROM (
          (
            SELECT account_id, MAX(holder_id) AS holder_id, COUNT(distinct ma_id) AS quantity
            FROM adastat_ma_holder
            WHERE policy_id = $1 AND account_id IS NOT NULL
            GROUP BY account_id
          ) UNION (
            SELECT NULL AS account_id, holder_id, COUNT(DISTINCT ma_id) AS quantity
            FROM adastat_ma_holder
            WHERE policy_id = $1 AND account_id IS NULL
            GROUP BY holder_id
          )
        ) AS t
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY quantity ${dir}, holder_id ${dir}
        LIMIT ${limit + 1}
      ) AS mh
      LEFT JOIN adastat_address AS ad ON ad.id = mh.holder_id
      LEFT JOIN adastat_account AS a ON a.id = ad.account_id
      LEFT JOIN stake_address AS sa ON sa.id = a.id
      LEFT JOIN adastat_address_byron AS ab ON ab.id = -mh.holder_id
      LEFT JOIN pool_hash AS ph ON ph.id = a.pool
      LEFT JOIN adastat_pool AS p ON p.id = a.pool
      ORDER BY mh.quantity ${dir}, mh.holder_id ${dir}
    `,
      queryValues,
      limit,
      (row) => {
        const accountId = row.id ?? 0n,
          drep = dreps.get(delegations.get(accountId)?.hash_id ?? 0n)

        if (
          drep &&
          (drep.registered || drep.bech32 === 'drep_always_abstain' || drep.bech32 === 'drep_always_no_confidence')
        ) {
          row.drep_bech32 = drep.bech32
          row.drep_base16 = drep.base16
          row.drep_has_script = drep.has_script
          row.drep_given_name = drep.given_name
          row.drep_image = drep.image
        }

        delete row.id
      }
    ))
  }

  return {
    rows,
    cursor,
  }
}
