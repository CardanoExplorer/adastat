import { primaryDB, secondaryDB } from '@/config.ts'
import logger from '@/logger.ts'
import type { AnyObject } from '@/types/shared.js'
import pg, { type QueryConfigValues, type QueryResultRow } from 'pg'
import createSubscriber from 'pg-listen'

const types = new pg.TypeOverrides()

types.setTypeParser(1016 as number, (val) =>
  (pg.types as any).arrayParser.create(val, (entry: string | null) => (entry === null ? null : BigInt(entry))).parse()
)

types.setTypeParser(20, BigInt)

export const db = new pg.Pool({
  ...secondaryDB,
  types,
})

db.on('error', (err) => {
  logger.error(err, 'Postgres error')
})

export type Block = {
  block_no: number
  block_hash: string
  epoch_no: number
  slot_no: number
  epoch_slot_no: number
  block_size: number
  tx_count: number
  slot_leader_id: number
}

const subscriber = createSubscriber.default(primaryDB)

export const listenToNewBlock = async (fn: (block: Block) => unknown): Promise<void> => {
  await subscriber.connect()

  await subscriber.listenTo('insert_block_event')

  subscriber.notifications.on('insert_block_event', (row: Block) => {
    if (row.block_no) {
      fn(row)
    }
  })
}

subscriber.events.on('error', (err) => {
  logger.fatal(err, 'Postgres subscriber error')

  process.exit(1)
})

export const shutdown = async (): Promise<void> => {
  try {
    await subscriber.close()

    await db.end()
  } finally {
    process.exit(0)
  }
}

// export const query = db.query.bind(db)

export const query = async <R extends QueryResultRow = AnyObject, I = any[]>(
  text: string,
  values?: QueryConfigValues<I>
) => db.query<R, I>(text, values)

export type Cursor =
  | {
      after: string
      next: boolean
    }
  | undefined

export const cursorQuery = async <R extends QueryResultRow = AnyObject, I = any[]>(
  text: string,
  values?: QueryConfigValues<I>,
  limit = Infinity,
  fn?: (row: R) => void
) => {
  const rows: R[] = [],
    res = await query<R>(text, values)

  let after!: string,
    next = false

  for (const row of res.rows) {
    if (rows.length < limit) {
      fn?.(row)

      after = row.cursor

      delete row.cursor

      rows.push(row)
    } else {
      next = true

      break
    }
  }

  const cursor: Cursor = after ? { after, next } : undefined

  return {
    rows,
    cursor,
  }
}
