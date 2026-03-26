import { networkParams } from '@/config.ts'
import { cursorQuery, query } from '@/db.ts'
import { decodeCursor, throwError } from '@/helper.ts'
import type { QueryString } from '@/schema.ts'
import { getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'
import type { BlockTable, NonNullableFields } from '@/types/tables.ts'

export const sortFieldMap = {
  no: 'b.id',
  tx_amount: 'ab.tx_amount',
  tx_out_sum: 'ab.tx_out_sum',
  tx_fee: 'ab.tx_fee',
  tx: 'b.tx_count',
  size: 'b.size',
}

export type ListSort = keyof typeof sortFieldMap

const fieldMap = {
  no: 'b.block_no',
  hash: "encode(b.hash::bytea, 'hex')",
  epoch_no: 'b.epoch_no',
  slot_no: 'b.slot_no::integer',
  epoch_slot_no: 'b.epoch_slot_no',
  time: 'EXTRACT(epoch FROM b.time)::integer',
  size: 'b.size',
  proto_major: 'b.proto_major',
  proto_minor: 'b.proto_minor',
  tx_amount: 'COALESCE(ab.tx_amount, np.tx_amount)',
  tx_out_sum: 'COALESCE(ab.tx_out_sum, np.tx_out_sum)',
  tx_fee: 'COALESCE(ab.tx_fee, np.tx_fee)',
  tx: 'b.tx_count::integer',
  pool_hash: "encode(ph.hash_raw::bytea, 'hex')",
  pool_bech32: 'ph.view',
  pool_name: 'COALESCE(ap.name, sl.description)',
  pool_ticker: 'ap.ticker',
}

const fields = Object.entries(fieldMap)
  .map(([k, v]) => `${v} AS ${k}`)
  .join(',')

const getNonParsedValues = async () => {
  const { nonParsedBlocks } = await getData(),
    nonParsedBlockNo: number[] = [],
    nonParsedBlockTxAmount: bigint[] = [],
    nonParsedBlockTxOutSum: bigint[] = [],
    nonParsedBlockTxFees: bigint[] = []

  for (const nonParsedBlock of nonParsedBlocks.values()) {
    nonParsedBlockNo.push(nonParsedBlock.no)
    nonParsedBlockTxAmount.push(nonParsedBlock.txAmount)
    nonParsedBlockTxOutSum.push(nonParsedBlock.txOutSum)
    nonParsedBlockTxFees.push(nonParsedBlock.txFees)
  }

  return [nonParsedBlockNo, nonParsedBlockTxAmount, nonParsedBlockTxOutSum, nonParsedBlockTxFees]
}

export const getList = async (
  { sort, dir, limit, after, page }: QueryString<ListSort>,
  item?: { type: 'epoch'; id: number } | { type: 'pool'; id: bigint }
) => {
  const where: string[] = [],
    queryValues: any[] = await getNonParsedValues()

  let orderBy = `ORDER BY ${sortFieldMap[sort]} ${dir}`,
    queryText: string

  if (item) {
    queryValues.push(item.id)

    where.push(
      item.type === 'epoch'
        ? `b.epoch_no = $${queryValues.length}`
        : `b.slot_leader_id = (SELECT id FROM slot_leader WHERE pool_hash_id = $${queryValues.length})`
    )

    orderBy = `ORDER BY ${sortFieldMap[sort]}+0 ${dir}`
  }

  if (after) {
    const cursorValues = decodeCursor(after)

    queryValues.push(cursorValues[0])
    if (sort === 'no') {
      where.push(`b.id ${dir === 'asc' ? '>' : '<'} $${queryValues.length}`)
    } else {
      const tableId = sort === 'tx' || sort === 'size' ? 'b.id' : 'ab.id'

      queryValues.push(cursorValues[1])

      where.push(
        `(${sortFieldMap[sort]}, ${tableId}) ${dir === 'asc' ? '>' : '<'} ($${queryValues.length - 1}, $${queryValues.length})`
      )

      orderBy += `, ${tableId} ${dir}`
    }
  }

  if (sort === 'no' || sort === 'tx' || sort === 'size' || item) {
    queryValues.push(networkParams.genesisHash)
    where.push(`(b.block_no IS NOT NULL OR b.hash = $${queryValues.length})`)

    if (sort !== 'no' && sort !== 'tx' && sort !== 'size') {
      where.push(`ab.id IS NOT NULL`)
    }

    queryText = `
      SELECT b.id
      FROM block AS b
      ${sort === 'no' || sort === 'tx' || sort === 'size' ? '' : 'LEFT JOIN adastat_block AS ab ON ab.id = b.id'}
    `
  } else {
    queryText = `
      SELECT ab.id
      FROM adastat_block AS ab
    `
  }

  return await cursorQuery(
    `
    SELECT ${sort === 'no' ? 'b.id' : 'CONCAT(' + sortFieldMap[sort] + ",'-',b.id)"} AS cursor, ${fields}
    FROM (
      ${queryText}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ${orderBy}
      LIMIT ${limit + 1}
      ${after ? '' : 'OFFSET ' + (page - 1) * limit}
    ) AS rows
    LEFT JOIN block AS b ON b.id = rows.id
    LEFT JOIN adastat_block AS ab ON ab.id = b.id
    LEFT JOIN unnest($1::int[], $2::bigint[], $3::bigint[], $4::bigint[]) AS np (block_no, tx_amount, tx_out_sum, tx_fee) ON np.block_no = b.block_no
    LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
    LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
    LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
    ${orderBy}
  `,
    queryValues,
    limit
  )
}

export const getItem = async (itemId: string | number) => {
  let blockNo!: number, data: AnyObject | undefined, previous: AnyObject | undefined, next: AnyObject | undefined

  if (typeof itemId === 'number') {
    blockNo = itemId
  } else if (itemId === networkParams.genesisHash || itemId === 'genesis') {
    blockNo = -1
  } else {
    const {
      rows: [blockRow],
    } = await query<NonNullableFields<Pick<BlockTable, 'block_no'>>>(
      `
      SELECT block_no
      FROM block
      WHERE hash = $1 AND block_no IS NOT NULL
    `,
      ['\\x' + itemId]
    )

    if (blockRow) {
      blockNo = blockRow.block_no
    }
  }

  if (blockNo <= latestBlock.block_no) {
    const where: string[] = [],
      queryValues: any[] = await getNonParsedValues()

    if (blockNo! > networkParams.firstBlockNo) {
      where.push('b.block_no IN ($5, $6, $7)')
      queryValues.push(blockNo! - 1, blockNo!, blockNo! + 1)
    } else {
      where.push('b.hash = $5 OR b.block_no IN ($6, $7)')
      queryValues.push('\\x' + networkParams.genesisHash, networkParams.firstBlockNo, networkParams.firstBlockNo + 1)
    }

    const { rows: blockRows } = await query(
      `
      SELECT b.id, ${fields}, COALESCE(ep.max_block_size, 2 * 1024 * 1024) AS max_size
      FROM block AS b
      LEFT JOIN adastat_block AS ab ON ab.id = b.id
      LEFT JOIN unnest($1::int[], $2::bigint[], $3::bigint[], $4::bigint[]) AS np (block_no, tx_amount, tx_out_sum, tx_fee) ON np.block_no = b.block_no
      LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
      LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
      LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
      LEFT JOIN epoch_param AS ep ON ep.epoch_no = b.epoch_no
      WHERE ${where[0]}
    `,
      queryValues
    )

    for (const blockRow of blockRows) {
      if (blockRow.no === (blockNo === -1 ? null : blockNo)) {
        data = blockRow
        data.confirmation = latestBlock.block_no - (blockNo === -1 ? networkParams.firstBlockNo - 1 : blockNo)
        data.battles = 0
      } else if (blockRow.no === (blockNo === -1 ? networkParams.firstBlockNo : blockNo + 1)) {
        next = blockRow
        delete next.id
        delete next.max_size
      } else if (
        (blockNo === networkParams.firstBlockNo && blockRow.no === null) ||
        (blockNo > networkParams.firstBlockNo && blockRow.no === blockNo - 1)
      ) {
        previous = blockRow
        delete previous.id
        delete previous.max_size
      }
    }
  }

  if (!data) {
    return throwError(404)
  }

  const { rows: battleRows } =
    data.epoch_no > networkParams.shelley + 1
      ? await query(
          `
    SELECT DISTINCT COALESCE(ob.block_no, 0) AS no, encode(ob.hash::bytea, 'hex') AS hash, ob.epoch_no AS epoch_no, ob.slot_no::integer AS slot_no, ob.epoch_slot_no AS epoch_slot_no, EXTRACT(epoch FROM ob.time)::integer AS time, ob.size AS size, ob.tx_count::integer AS tx, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.ticker AS pool_ticker, COALESCE(ap.name, sl.description) AS pool_name
    FROM adastat_block_orphan AS ob
    LEFT JOIN slot_leader AS sl ON sl.id = ob.slot_leader_id
    LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
    LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
    WHERE (ob.block_no = $1 OR ob.slot_no = $2) AND ob.slot_leader_id <> (SELECT id FROM slot_leader WHERE hash = $3)
  `,
          [data.no, data.slot_no, '\\x' + data.pool_hash]
        )
      : { rows: [] }

  data.battle = battleRows.length
  data.battles = {
    rows: battleRows,
  }

  data.previous = previous
  data.next = next

  const blockId = data.id
  delete data.id

  return {
    blockId,
    data,
  }
}
