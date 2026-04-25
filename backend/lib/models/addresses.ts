import { networkParams } from '@/config.ts'
import { type Cursor, cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError } from '@/helper.ts'
import { delegations as drepDelegations, dreps } from '@/helpers/dreps.ts'
import { fill as fillTokenData } from '@/helpers/tokens.ts'
import type { QueryString, RowsQueryString } from '@/schema.ts'
import type { AnyObject } from '@/types/shared.js'

export const sortFieldMap = {
  balance: 'a.amount',
  token: 'a.token',
  first_tx: 'a.first_tx',
  last_tx: 'a.last_tx',
  tx: 'a.tx',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  address: 'a.address',
  balance: 'a.amount',
  token: 'a.token',
  first_tx_hash: "encode(ft.hash::bytea, 'hex')",
  first_tx_time: 'EXTRACT(epoch FROM fb.time)::integer',
  last_tx_hash: "encode(lt.hash::bytea, 'hex')",
  last_tx_time: 'EXTRACT(epoch FROM lb.time)::integer',
  tx: 'a.tx',
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
      `(${sortFieldMap[sort]}, a.id) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
    )
    orderBy += `, a.id ${dir}`
  }

  return await cursorQuery(
    `
    SELECT CONCAT(${sortFieldMap[sort]},'-',a.id) AS cursor, ${fields}
    FROM (
      SELECT a.id
      FROM adastat_address_byron AS a
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy} NULLS LAST
      LIMIT ${limit + 1}
      ${after || !page ? '' : 'OFFSET ' + (page - 1) * limit}
    ) AS rows
    LEFT JOIN adastat_address_byron AS a ON a.id = rows.id
    LEFT JOIN tx AS ft ON ft.id = a.first_tx
    LEFT JOIN block AS fb ON fb.id = ft.block_id
    LEFT JOIN tx AS lt ON lt.id = a.last_tx
    LEFT JOIN block AS lb ON lb.id = lt.block_id
    ${orderBy}
  `,
    queryValues,
    limit
  )
}

export const getItem = async (itemId: string) => {
  const queryValues: any[] = []

  if (itemId.slice(0, 1) === '$' && itemId.length > 1) {
    const {
      rows: [adaHandleRow],
    } = await query(
      `
      SELECT LOWER(COALESCE(adastat_address.address, adastat_address_byron.address)) AS address
      FROM multi_asset
      LEFT JOIN adastat_ma_holder ON adastat_ma_holder.ma_id = multi_asset.id
      LEFT JOIN adastat_address ON adastat_address.id = adastat_ma_holder.holder_id
      LEFT JOIN adastat_address_byron ON adastat_address_byron.id = -adastat_ma_holder.holder_id
      WHERE ((multi_asset.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND multi_asset.name = '\\x000de140'::bytea || CAST($1 AS bytea))
        OR  (multi_asset.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND multi_asset.name = '\\x00000000'::bytea || CAST($1 AS bytea))
        OR  (multi_asset.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND multi_asset.name = CAST($1 AS bytea)))
        AND (adastat_address.id IS NOT NULL OR adastat_address_byron.id IS NOT NULL)
    `,
      [itemId.slice(1)]
    )

    if (adaHandleRow?.address) {
      itemId = adaHandleRow?.address
    } else {
      return throwError(404)
    }
  }

  queryValues.push(itemId)

  let queryText: string

  if (networkParams.isMainnet ? itemId.slice(0, 4) === 'addr' : itemId.slice(0, 9) === 'addr_test') {
    queryText = `
      SELECT aa.*, encode(ft.hash::bytea, 'hex') AS first_tx_hash, EXTRACT(epoch FROM fb.time)::integer AS first_tx_time, encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, ac.amount AS account_balance, ac.reward AS account_reward_balance, ac.total_reward AS account_total_reward_amount, ac.active_amount AS account_active_stake, ac.snapshot_amount AS account_snapshot_stake, CASE WHEN ac.pool IS NULL THEN FALSE ELSE TRUE END AS registered_stake_key, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker, encode(ph_a.hash_raw::bytea, 'hex') AS active_pool_hash, ph_a.view AS active_pool_bech32, ap_a.name AS active_pool_name, ap_a.ticker AS active_pool_ticker, encode(ph_s.hash_raw::bytea, 'hex') AS snapshot_pool_hash, ph_s.view AS snapshot_pool_bech32, ap_s.name AS snapshot_pool_name, ap_s.ticker AS snapshot_pool_ticker,
      (
        SELECT ENCODE(multi_asset.name, 'hex')
        FROM adastat_ma_holder
        LEFT JOIN multi_asset ON multi_asset.id = adastat_ma_holder.ma_id
        WHERE adastat_ma_holder.holder_id = aa.id AND adastat_ma_holder.policy_id = (SELECT id FROM adastat_ma_policy WHERE policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a')
        LIMIT 1
      ) AS adahandle, encode(cardano.bech32_decode_data(aa.address), 'hex') AS base16
      FROM adastat_address AS aa
      LEFT JOIN tx AS ft ON ft.id = aa.first_tx
      LEFT JOIN block AS fb ON fb.id = ft.block_id
      LEFT JOIN tx AS lt ON lt.id = aa.last_tx
      LEFT JOIN block AS lb ON lb.id = lt.block_id
      LEFT JOIN stake_address AS sa ON sa.id = aa.account_id
      LEFT JOIN adastat_account AS ac ON ac.id = sa.id
      LEFT JOIN pool_hash AS ph ON ph.id = ac.pool
      LEFT JOIN adastat_pool AS ap ON ap.id = ac.pool
      LEFT JOIN pool_hash AS ph_a ON ph_a.id = ac.active_pool
      LEFT JOIN adastat_pool AS ap_a ON ap_a.id = ac.active_pool
      LEFT JOIN pool_hash AS ph_s ON ph_s.id = ac.snapshot_pool
      LEFT JOIN adastat_pool AS ap_s ON ap_s.id = ac.snapshot_pool
      WHERE aa.address = $1
    `
  } else {
    queryText = `
      SELECT ab.*, -ab.id AS id, encode(ft.hash::bytea, 'hex') AS first_tx_hash, EXTRACT(epoch FROM fb.time)::integer AS first_tx_time, encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time,
      (
        SELECT ENCODE(multi_asset.name, 'hex')
        FROM adastat_ma_holder
        LEFT JOIN multi_asset ON multi_asset.id = adastat_ma_holder.ma_id
        WHERE adastat_ma_holder.holder_id = -ab.id AND adastat_ma_holder.policy_id = (SELECT id FROM adastat_ma_policy WHERE policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a')
        LIMIT 1
      ) AS adahandle, encode(cardano.base58_decode(ab.address), 'hex') AS base16
      FROM adastat_address_byron AS ab
      LEFT JOIN tx AS ft ON ft.id = ab.first_tx
      LEFT JOIN block AS fb ON fb.id = ft.block_id
      LEFT JOIN tx AS lt ON lt.id = ab.last_tx
      LEFT JOIN block AS lb ON lb.id = lt.block_id
      WHERE ab.address = $1
    `
  }

  const {
    rows: [data],
  } = await query(queryText, queryValues)

  if (!data) {
    return throwError(404)
  }

  const {
    id: addressId,
    account_id: accountId,
    first_tx: firstTx,
    last_tx: lastTx,
  } = data as {
    id: bigint
    account_id: bigint
    first_tx: bigint
    last_tx: bigint
  }

  delete data.amount
  delete data.id
  delete data.account_id
  delete data.first_tx
  delete data.last_tx

  data.balance = data.amount

  if (data.snapshot_stake >= 0 && !data.snapshot_pool_hash) {
    data.snapshot_stake = null
  }

  if (addressId < 0) {
    data.type = 'byron'
    data.type_int = 8
  } else {
    data.type = data.base16.length === 114 ? 'base' : 'enterprise'
    data.type_int = parseInt(data.base16.slice(0, 1), 16)
  }

  if (data.registered_stake_key) {
    const drepDelegation = drepDelegations.get(accountId),
      drep = drepDelegation?.hash_id ? dreps.get(drepDelegation.hash_id) : undefined

    if (drep) {
      data.drep_bech32 = drep.bech32
      data.drep_base16 = drep.base16
      data.drep_has_script = drep.has_script
      data.drep_given_name = drep.given_name
      data.drep_image = drep.image
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
    rows: [adaHandleUtxoRow],
  } = await query(
    `
        SELECT COUNT(*) AS utxo, convert_asset_name($2) AS adahandle
        FROM adastat_utxo
        WHERE address_id = $1
      `,
    [addressId, '\\x' + adahandle]
  )

  if (adaHandleUtxoRow) {
    data.utxo = parseInt(adaHandleUtxoRow.utxo)
    data.adahandle = adaHandleUtxoRow.adahandle
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
        WHERE holder_id = $1
        GROUP BY policy_id
      ) AS col
      LEFT JOIN adastat_ma_policy AS p ON p.id = col.policy_id
    `,
      [addressId]
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
    addressId,
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
  utxos: {
    time: '',
  },
}

export type RowSortFieldMap = typeof rowSortFieldMap

export const getItemRows = async ({
  dir,
  limit,
  after,
  rows: rowsType,
  addressId,
  firstTx,
  lastTx,
  policy: policyFilter,
  data: item,
}: RowsQueryString<RowSortFieldMap> & { addressId: bigint; firstTx: bigint; lastTx: bigint; data: AnyObject }) => {
  const where: string[] = [],
    queryValues: any[] = [],
    cursorValues = decodeCursor(after)

  let rows: AnyObject[] = [],
    cursor: Cursor

  if (rowsType === 'activity') {
    if (item.tx > 0) {
      const maInIds: any[] = [],
        maInIdValues: any[] = [],
        maOutIds: any[] = [],
        maOutIdValues: any[] = [],
        txHashes: AnyObject = {}

      queryValues.push(addressId, item.address, cursorValues[0])

      if (!cursorValues[0]) {
        queryValues[1] = dir === 'desc' ? lastTx + 1n : firstTx - 1n
      }

      ;({ rows, cursor } = await cursorQuery(
        `
            WITH a AS (
              SELECT tx_id
              FROM adastat_tx_address
              WHERE address_id = $1 AND tx_id ${dir === 'desc' ? '<' : '>'} $3
              ORDER BY tx_id ${dir}
              LIMIT ${limit + 1}
            )
            SELECT t.tx_id AS cursor, encode(tx.hash::bytea, 'hex') AS tx_hash, tx.fee AS tx_fee, tx.deposit AS tx_deposit, COALESCE(b.block_no, 0) AS block_no, tx.block_index, encode(b.hash::bytea, 'hex') AS block_hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, SUM(t.amount) AS amount, STRING_AGG(t.tx_in_id::text, ',') AS tx_in_ids, STRING_AGG(t.tx_out_id::text, ',') AS tx_out_ids
            FROM (
              (
                SELECT tx_out.tx_id, tx_out.value AS amount, NULL AS tx_in_id, tx_out.id AS tx_out_id
                FROM tx_out
                WHERE tx_out.tx_id IN (SELECT tx_id FROM a) AND tx_out.address = $2
              )
              UNION ALL
              (
                SELECT tx_in.tx_in_id AS tx_id, -tx_out.value AS amount, tx_out.id AS tx_in_id, NULL AS tx_out_id
                FROM tx_in
                LEFT JOIN tx_out ON tx_out.tx_id = tx_in.tx_out_id AND tx_out.index = tx_in.tx_out_index
                WHERE tx_in.tx_in_id IN (SELECT tx_id FROM a) AND tx_out.address = $2
              )
            ) AS t
            LEFT JOIN tx ON tx.id = t.tx_id
            LEFT JOIN block AS b ON b.id = tx.block_id
            GROUP BY t.tx_id, tx.hash, tx.fee, tx.deposit, b.block_no, tx.block_index, b.hash, b.epoch_no, b.slot_no, b.epoch_slot_no, b.time
            ORDER BY t.tx_id ${dir}
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

          if (row.tx_hash) {
            txHashes[row.tx_hash] = row.cursor
          }

          delete row.tx_in_ids
          delete row.tx_out_ids
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
          const tokens = new Map<bigint, AnyObject>()
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
  } else if (rowsType === 'nfts') {
    if (item.token > 0) {
      queryValues.push(addressId)
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
              WHERE holder_id = $1
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
      where.push('amh.holder_id = $1 AND p.holder > p.token')
      queryValues.push(addressId)
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
  } else if (rowsType === 'utxos') {
    if (item.balance > 0) {
      const txHashes: AnyObject = {}

      where.push('u.address_id = $1')

      queryValues.push(addressId)

      if (after) {
        where.push(`u.tx_out_id ${dir === 'desc' ? '<' : '>'} $2`)
        queryValues.push(after)
      }

      ;({ rows, cursor } = await cursorQuery(
        `
        SELECT u.tx_out_id AS cursor, encode(tx.hash, 'hex') AS tx_hash, tx_out.index AS tx_index, tx_out.value AS amount, encode(tx_out.data_hash, 'hex') AS datum_hash
        FROM adastat_utxo AS u
        LEFT JOIN tx_out ON tx_out.id = u.tx_out_id
        LEFT JOIN tx ON tx.id = tx_out.tx_id
        WHERE ${where.join(' AND ')}
        ORDER BY u.tx_out_id ${dir}
        LIMIT ${limit + 1}
      `,
        queryValues,
        limit,
        (row) => {
          txHashes[row.tx_hash + '#' + row.tx_index] = row.cursor

          row.token = 0
          row.tokens = {
            rows: [],
          }
        }
      ))

      const outIds = Object.values(txHashes)
      if (outIds.length > 0) {
        const tokenIds = new Set(),
          tokenTxOut: AnyObject = {}

        const { rows: maTxOutRows } = await query(
          `
          SELECT quantity, ident, tx_out_id
          FROM ma_tx_out
          WHERE tx_out_id = ANY($1::bigint[])
        `,
          [outIds]
        )

        for (const row of maTxOutRows) {
          if (!tokenTxOut[row.tx_out_id]) {
            tokenTxOut[row.tx_out_id] = {}
          }
          tokenTxOut[row.tx_out_id][row.ident] = row.quantity

          tokenIds.add(row.ident)
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
            const txOutId = txHashes[row.tx_hash + '#' + row.tx_index]

            const tokenRows: AnyObject[] = []

            if (tokenTxOut[txOutId]) {
              for (const tokenId of Object.keys(tokenTxOut[txOutId])) {
                tokenRows.push({
                  ...tokens.get(tokenId as any),
                  quantity: tokenTxOut[txOutId][tokenId],
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
  }

  return {
    rows,
    cursor,
  }
}
