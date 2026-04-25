import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError, toBech32 } from '@/helper.ts'
import { delegations, dreps } from '@/helpers/dreps.ts'
import { fill as fillTokenData, mintingCheck, get as tokenRegistryGet } from '@/helpers/tokens.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'
import { decodeFirst } from 'cbor'

export const sortFieldMap = {
  first_tx: 'am.first_tx',
  last_tx: 'am.last_tx',
  supply: 'am.supply',
  tx: 'am.tx',
  holder: 'am.holder',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  policy: "encode(m.policy::bytea, 'hex')",
  asset_name: 'convert_asset_name(m.name)',
  asset_name_hex: "encode(m.name::bytea, 'hex')",
  fingerprint: 'm.fingerprint',
  supply: 'am.supply',
  first_tx_hash: "encode(ft.hash::bytea, 'hex')",
  first_tx_time: 'EXTRACT(epoch FROM fb.time)::integer',
  last_tx_hash: "encode(lt.hash::bytea, 'hex')",
  last_tx_time: 'EXTRACT(epoch FROM lb.time)::integer',
  tx: 'am.tx',
  holder: 'am.holder',
  meta_data: 'md.json',
  meta_id: 'md.id',
  genuine: 'amp.genuine',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'watchlist'; id: string } | { type: 'policy'; id: bigint }
) => {
  const where: string[] = [],
    queryValues: any[] = []

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`

  if (item?.type === 'policy') {
    queryValues.push(item.id)

    where.push(`am.policy_id = $${queryValues.length}`)

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}, am.id ${dir}`
  } else if (item?.type === 'watchlist') {
    const itemValues = item.id.split(',')

    const watchlistValues: string[] = []

    for (const itemValue of itemValues) {
      if (itemValue.length <= 64) {
        watchlistValues.push(itemValue)
      }
    }

    if (!watchlistValues.length) {
      throwError(400)
    }

    queryValues.push(watchlistValues)

    where.push(`am.id IN (SELECT id FROM multi_asset WHERE fingerprint = ANY($${queryValues.length}::text[]))`)

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}, am.id ${dir}`
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(...cursorValues)

    where.push(
      `(${sortFieldMap[sort]}, am.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )
  }

  if (item?.type !== 'watchlist') {
    queryValues.push(0)
    where.push(`am.supply > $${queryValues.length}`)
  }

  return await cursorQuery(
    `
    SELECT CONCAT(${sortFieldMap[sort]},'-',am.id) AS cursor, ${fields}
    FROM (
      SELECT am.id
      FROM adastat_multi_asset AS am
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy}
      LIMIT ${limit + 1}
      ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
    ) AS rows
    LEFT JOIN adastat_multi_asset AS am ON am.id = rows.id
    LEFT JOIN adastat_ma_policy AS amp ON amp.id = am.policy_id
    LEFT JOIN multi_asset AS m ON m.id = am.id
    LEFT JOIN tx AS ft ON ft.id = am.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = am.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
    ${orderBy}
  `,
    queryValues,
    limit,
    (row) => {
      row.image = ''

      fillTokenData(row)

      row.holder = parseInt(row.holder)
    }
  )
}

export const getItem = async (itemId: string) => {
  const fingerprint = itemId.startsWith('asset') ? itemId : toBech32('asset', itemId)

  const {
    rows: [data],
  } = await query(
    `
    SELECT ${fields}, encode(cardano.bech32_decode_data(m.fingerprint), 'hex') AS base16, LOWER(s.type::text) AS script_type, s.json AS timelock_script, encode(s.bytes, 'hex') AS plutus_script, tm.quantity AS mint_quantity, am.id, amp.token AS policy_token, amp.holder AS policy_holder
    FROM adastat_multi_asset AS am
    LEFT JOIN multi_asset AS m ON m.id = am.id
    LEFT JOIN adastat_ma_policy AS amp ON amp.policy = m.policy
    LEFT JOIN tx AS ft ON ft.id = am.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = am.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
    LEFT JOIN ma_tx_mint AS tm ON tm.ident = am.id AND tm.tx_id = am.first_tx
    LEFT JOIN script AS s ON s.hash = m.policy
    WHERE m.fingerprint = $1
    LIMIT 1
  `,
    [fingerprint]
  )

  if (!data) {
    return throwError(404)
  }

  const tokenId = data.id

  data.description = ''
  data.url = ''
  data.image = ''

  fillTokenData(data, true)

  data.holder = parseInt(data.holder)
  data.policy_token = parseInt(data.policy_token)
  data.policy_holder = parseInt(data.policy_holder)

  data.script = data.timelock_script || data.plutus_script

  delete data.id
  delete data.timelock_script
  delete data.plutus_script

  data.nft = false
  data.locked = false

  if (data.supply === '1') {
    // maybe nft
    const { rows: txMintRows } = await query(
      `
        SELECT quantity
        FROM ma_tx_mint
        WHERE ident = $1
        LIMIT 2
      `,
      [tokenId]
    )
    if (txMintRows.length === 1) {
      data.nft = true
    }
  }

  if (data.script_type === 'timelock' && Array.isArray(data.script?.scripts)) {
    data.locked = !mintingCheck(data.script, latestBlock.slot_no)
  }
  delete data.mint_quantity

  data.registry = Boolean(tokenRegistryGet(data.policy + data.asset_name_hex))

  const {
    rows: [maTxOutRow],
  } = await query(
    `
      SELECT encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time
      FROM ma_tx_out
      LEFT JOIN tx_out ON tx_out.id = ma_tx_out.tx_out_id
      LEFT JOIN tx AS lt ON lt.id = tx_out.tx_id
      LEFT JOIN block AS lb ON lb.id = lt.block_id
      WHERE ma_tx_out.ident = $1
      ORDER BY ma_tx_out.tx_out_id DESC
      LIMIT 1
    `,
    [tokenId]
  )

  if (maTxOutRow) {
    data.last_tx_hash = maTxOutRow.last_tx_hash
    data.last_tx_time = maTxOutRow.last_tx_time
  }

  if (!data.ticker) {
    const maybeCIP68 = data.asset_name_hex.slice(0, 8)

    if (maybeCIP68 === '000de140' || maybeCIP68 === '0014df10' || maybeCIP68 === '001bc280') {
      const {
        rows: [cip68Row],
      } = await query(
        `
          SELECT datum.bytes AS datum
          FROM tx_out
          LEFT JOIN datum ON datum.hash = tx_out.data_hash
          WHERE tx_out.id = (
            SELECT tx_out_id
            FROM ma_tx_out
            WHERE ident = (SELECT id FROM multi_asset AS ma WHERE ma.policy = $1 AND ma.name = $2 LIMIT 1)
            ORDER BY tx_out_id+0 DESC
            LIMIT 1
          )
        `,
        ['\\x' + data.policy, '\\x000643b0' + data.asset_name_hex.slice(8)]
      )

      if (cip68Row) {
        try {
          const val = await decodeFirst(cip68Row.datum)
          data.meta_data = {
            [data.policy]: {
              [data.asset_name_hex]: {},
            },
          }

          if (val?.value?.[0] instanceof Map) {
            for (const [key, value] of val.value[0]) {
              data.meta_data[data.policy][data.asset_name_hex]['' + key] = '' + value
            }
          }

          fillTokenData(data, true)
        } catch {}
      }
    }
  }

  return {
    tokenId,
    data,
  }
}

export const rowSortFieldMap = {
  transactions: {
    time: '',
  },
  holders: {
    amount: '',
  },
  minting: {
    time: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  dir,
  limit,
  after,
  tokenId,
  rows: rowsType,
  data: item,
}: RowsQueryString<RowSortFieldMap> & {
  tokenId: bigint
  data: AnyObject
}) => {
  const where: string[] = [],
    queryValues: any[] = []

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'transactions') {
    const txOutIds = [],
      txIds = new Set()

    let needMoreTx = true

    while (needMoreTx) {
      queryValues.length = 0

      queryValues.push(tokenId)
      where.push('ma_tx_out.ident = $1')

      if (after) {
        queryValues.push(after)
        where.push(`ma_tx_out.tx_out_id ${dir === 'asc' ? '>' : '<'} $2`)
      }
      const { rows: maTxOutRows } = await query(
        `
        SELECT ma_tx_out.tx_out_id, tx_out.tx_id
        FROM ma_tx_out
        LEFT JOIN tx_out ON tx_out.id = ma_tx_out.tx_out_id
        WHERE ${where.join(' AND ')}
        ORDER BY ma_tx_out.tx_out_id ${dir}
        LIMIT ${limit + 1}
      `,
        queryValues
      )

      for (const row of maTxOutRows) {
        if (txIds.size <= limit) {
          txOutIds.push(row.tx_out_id)
          txIds.add(row.tx_id)
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
        SELECT ma.cursor, ma.quantity, encode(tx.hash::bytea, 'hex') AS tx_hash, b.block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time
        FROM (
          SELECT tx_out.tx_id, SUM(ma_tx_out.quantity) AS quantity, ${dir === 'asc' ? 'MAX' : 'MIN'}(ma_tx_out.tx_out_id) AS cursor
          FROM ma_tx_out
          LEFT JOIN tx_out ON tx_out.id = ma_tx_out.tx_out_id
          WHERE ma_tx_out.ident = $1 AND ma_tx_out.tx_out_id = ANY($2::bigint[])
          GROUP BY tx_out.tx_id
        ) AS ma
        LEFT JOIN tx ON tx.id = ma.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        ORDER BY ma.tx_id ${dir}
        LIMIT ${limit + 1}
      `,
        [tokenId, txOutIds],
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
    queryValues.push(tokenId)
    where.push('mm.ident = $1')

    if (after) {
      queryValues.push(after)
      where.push(`mm.tx_id ${dir === 'asc' ? '>' : '<'} $2`)
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT mm.tx_id AS cursor, mm.quantity, encode(tx.hash::bytea, 'hex') AS tx_hash, b.block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time
      FROM ma_tx_mint AS mm
      LEFT JOIN tx ON tx.id = mm.tx_id
      LEFT JOIN block AS b ON b.id = tx.block_id
      WHERE ${where.join(' AND ')}
      ORDER BY mm.tx_id ${dir}
      LIMIT ${limit + 1}
    `,
      queryValues,
      limit
    ))
  } else if (rowsType === 'holders') {
    queryValues.push(tokenId)

    if (after) {
      const cursorValues = decodeCursor(after)

      queryValues.push(...cursorValues)

      where.push(`(quantity, holder_id) ${dir === 'asc' ? '>' : '<'} ($2, $3)`)
    }

    ;({ rows, cursor } = await cursorQuery(
      `
      SELECT CONCAT(mh.quantity,'-',mh.holder_id) AS cursor, mh.quantity, COALESCE(ad.address, ab.address) AS address, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, COALESCE(a.amount, ad.amount, ab.amount) AS balance, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker, a.id
      FROM (
        SELECT account_id, holder_id, quantity
        FROM (
          (
            SELECT account_id, MAX(holder_id) AS holder_id, SUM(quantity) AS quantity
            FROM adastat_ma_holder
            WHERE ma_id = $1 AND account_id IS NOT NULL
            GROUP BY account_id
          ) UNION (
            SELECT NULL AS account_id, holder_id, quantity
            FROM adastat_ma_holder
            WHERE ma_id = $1 AND account_id IS NULL
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
