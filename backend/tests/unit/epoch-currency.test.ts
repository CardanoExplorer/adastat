import { clearCache } from '@/cache.ts'
import { item, list } from '@/controllers/epochs.ts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  getEpochList: vi.fn(),
  getBlockList: vi.fn(),
  getTxList: vi.fn(),
  getData: vi.fn(),
}))

vi.mock('@/models/epochs.ts', () => ({
  getItem: mocks.getItem,
  getList: mocks.getEpochList,
  sortFieldMap: { no: 'e.no' },
}))
vi.mock('@/models/blocks.ts', () => ({ getList: mocks.getBlockList, sortFieldMap: { no: 'b.block_no' } }))
vi.mock('@/models/transactions.ts', () => ({ getList: mocks.getTxList, sortFieldMap: { time: 'tx.id' } }))
vi.mock('@/storage.ts', () => ({
  getData: mocks.getData,
  latestBlock: { epoch_no: 601, epoch_slot_no: 40, slot_no: 10000 },
  exchangeRates: { usd: 3, eur: 4 },
}))
vi.mock('@/config.ts', () => ({ networkParams: {} }))
vi.mock('@/logger.ts', () => ({ default: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('@/db.ts', () => {
  throw new Error('Database access is prohibited in epoch currency tests')
})

beforeEach(() => {
  clearCache()
  vi.resetAllMocks()
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

const loadItem = (currency: 'usd' | 'eur', rows?: 'blocks' | 'transactions') =>
  item(
    {
      params: { itemId: 600 },
      query: { currency, rows, sort: rows === 'blocks' ? 'no' : 'time', dir: 'desc', limit: 12, after: '' },
    } as Parameters<typeof item>[0],
    {} as Parameters<typeof item>[1]
  )

const loadList = (currency: 'usd' | 'eur', withRows = true) =>
  list(
    {
      query: {
        currency,
        rows: withRows ? 'epochs' : undefined,
        sort: 'no',
        dir: 'desc',
        limit: 12,
        after: '',
        page: 1,
      },
    } as Parameters<typeof list>[0],
    {} as Parameters<typeof list>[1]
  )

describe.each(['blocks', 'transactions'] as const)('epoch currency during %s loading', (rows) => {
  it.each([false, true])(
    'isolates concurrent currencies when the second request is main-only: %s',
    async (mainOnly) => {
      const cachedData = { no: 600, tx_amount: '9007199254740993123456' }
      mocks.getItem.mockResolvedValue({ data: cachedData, exchangeRates: { usd: 1, eur: 2 } })

      const portion = { rows: [{ hash: 'a'.repeat(64) }], cursor: { after: '123', next: true } },
        rowResult = deferred<typeof portion>(),
        rowsStarted = deferred<void>(),
        getRows = rows === 'blocks' ? mocks.getBlockList : mocks.getTxList

      getRows.mockImplementation(() => {
        rowsStarted.resolve()
        return rowResult.promise
      })

      const usdRequest = loadItem('usd', rows)
      await rowsStarted.promise
      const eurRequest = loadItem('eur', mainOnly ? undefined : rows)
      if (mainOnly) {
        await eurRequest
      }
      rowResult.resolve(portion)
      const [usd, eur] = await Promise.all([usdRequest, eurRequest])

      expect(usd.data).toEqual({ no: 600, tx_amount: '9007199254740993123456', exchange_rate: 1 })
      expect(eur.data).toEqual({ no: 600, tx_amount: '9007199254740993123456', exchange_rate: 2 })
      expect(cachedData).not.toHaveProperty('exchange_rate')
      expect(usd.rows).toBe(portion.rows)
      expect(usd.cursor).toBe(portion.cursor)
      expect(eur.rows).toBe(mainOnly ? undefined : portion.rows)
      expect(eur.cursor).toBe(mainOnly ? undefined : portion.cursor)
      expect(mocks.getItem).toHaveBeenCalledOnce()
      expect(getRows).toHaveBeenCalledOnce()
    }
  )
})

describe('epoch currency cache isolation', () => {
  it('keeps an earlier response unchanged when a cached item is requested in another currency', async () => {
    const cachedData = { no: 600 }
    mocks.getItem.mockResolvedValue({ data: cachedData, exchangeRates: { usd: 1 } })

    const usd = await loadItem('usd')
    const eur = await loadItem('eur')

    expect(usd.data).toEqual({ no: 600, exchange_rate: 1 })
    expect(eur.data).toEqual({ no: 600, exchange_rate: 0 })
    expect(cachedData).toEqual({ no: 600 })
    expect(mocks.getItem).toHaveBeenCalledOnce()
  })

  it('isolates concurrent list responses while reusing cached rows and their cursor', async () => {
    const cachedRows = [
        { no: 601, tx_amount: '9007199254740993123456' },
        { no: 600, tx_amount: '2000000' },
        { no: 599, tx_amount: '0' },
      ],
      cursor = { after: '599', next: true }
    mocks.getEpochList.mockResolvedValue({ rows: cachedRows, cursor })
    mocks.getData.mockResolvedValue({ epochs: new Map([[600, { exchangeRates: { usd: 1, eur: 2 } }]]) })

    const [usd, eur] = await Promise.all([loadList('usd'), loadList('eur')])

    expect(usd.rows).toEqual(cachedRows.map((row, index) => ({ ...row, exchange_rate: [3, 1, 0][index] })))
    expect(eur.rows).toEqual(cachedRows.map((row, index) => ({ ...row, exchange_rate: [4, 2, 0][index] })))
    for (const row of cachedRows) {
      expect(row).not.toHaveProperty('exchange_rate')
    }
    expect(usd.data).toEqual({ epoch_no: 601, epoch_slot_no: 40, slot_no: 10000 })
    expect(eur.data).toEqual(usd.data)
    expect(usd.cursor).toBe(cursor)
    expect(eur.cursor).toBe(cursor)
    expect(mocks.getEpochList).toHaveBeenCalledOnce()
  })

  it('keeps main-only list requests independent of the row cache', async () => {
    const result = await loadList('usd', false)

    expect(result).toEqual({
      data: { epoch_no: 601, epoch_slot_no: 40, slot_no: 10000 },
      rows: undefined,
      cursor: undefined,
    })
    expect(mocks.getEpochList).not.toHaveBeenCalled()
    expect(mocks.getData).not.toHaveBeenCalled()
  })
})
