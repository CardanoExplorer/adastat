import * as accounts from '@/models/accounts.ts'
import * as addresses from '@/models/addresses.ts'
import * as blocks from '@/models/blocks.ts'
import * as epochs from '@/models/epochs.ts'
import * as govActions from '@/models/gov-actions.ts'
import * as policies from '@/models/policies.ts'
import * as tokens from '@/models/tokens.ts'
import * as transactions from '@/models/transactions.ts'
import type { QueryString } from '@/schema.ts'
import { describe, expect, it, vi } from 'vitest'

const { cursorQuery } = vi.hoisted(() => ({
  cursorQuery: vi.fn<(text: string, values: unknown[], limit: number) => Promise<unknown>>().mockResolvedValue({
    rows: [],
    cursor: undefined,
  }),
}))

vi.mock('@/db.ts', () => ({
  cursorQuery,
  query: () => {
    throw new Error('Database access is prohibited in pagination tests')
  },
}))
vi.mock('@/config.ts', () => ({ networkParams: { isMainnet: true, genesisHash: '00' } }))
vi.mock('@/logger.ts', () => ({ default: { warn: vi.fn() } }))
vi.mock('@/storage.ts', () => ({
  getData: async () => ({
    nonParsedBlocks: new Map(),
    latestParsedEpoch: 2,
    epochs: new Map([
      [1, { firstTxId: 100n }],
      [2, { firstTxId: 200n }],
    ]),
  }),
  latestBlock: { epoch_no: 2 },
  exchangeRates: new Map(),
}))
vi.mock('@/helpers/dreps.ts', () => ({ idValues: [], votingAnchorIdValues: [], stakeValues: [], activeValues: [] }))
vi.mock('@/helpers/gov-actions.ts', () => ({
  govActions: new Map(
    [1n, 2n].map((id) => [
      id,
      {
        id,
        tx_id: 10n,
        index: 0,
        expiration: 3,
        ratified_epoch: id === 2n ? 1 : undefined,
        last_tx_id: id === 2n ? 20n : undefined,
        pool_threshold: 1,
        drep_threshold: 1,
      },
    ])
  ),
}))
vi.mock('@/helpers/tokens.ts', () => ({}))
vi.mock('@/helpers/markdown.ts', () => ({}))
vi.mock('@/helpers/cip-0190.ts', () => ({}))

type PageRequest = Pick<QueryString, 'dir' | 'limit' | 'after' | 'page'>

function listCases<Sort extends string, Item>(
  name: string,
  model: {
    sortFieldMap: Record<Sort, string>
    getList: (request: QueryString<Sort>, item?: Item) => Promise<unknown>
  },
  tieId: (sort: Sort) => string,
  uniqueSort?: NoInfer<Sort>,
  items: { name: string; value?: Item }[] = [{ name: 'global' }]
) {
  return items.flatMap((item) =>
    (Object.keys(model.sortFieldMap) as Sort[]).map((sort) => ({
      name: `${name}/${item.name}/${sort}`,
      sort,
      unique: sort === uniqueSort,
      tieId: tieId(sort),
      load: (request: PageRequest) =>
        model.getList({ ...request, sort, currency: 'usd', meta_format: 'md' }, item.value),
    }))
  )
}

const cases = [
  ...listCases('blocks', blocks, (sort) => (sort === 'tx' || sort === 'size' ? 'b.id' : 'ab.id'), 'no', [
    { name: 'global' },
    { name: 'epoch', value: { type: 'epoch', id: 1 } },
    { name: 'pool', value: { type: 'pool', id: 9n } },
  ]),
  ...listCases(
    'transactions',
    transactions,
    (sort) => (sort === 'amount' || sort === 'token' ? 'at.id' : 'tx.id'),
    'time',
    [
      { name: 'global' },
      { name: 'epoch', value: { type: 'epoch', id: 1 } },
      { name: 'block', value: { type: 'block', id: 9n } },
    ]
  ),
  ...listCases('epochs', epochs, () => 'e.no', 'no'),
  ...listCases('accounts', accounts, () => 'a.id', undefined, [
    { name: 'global' },
    { name: 'pool', value: { type: 'pool', id: 9n } },
    { name: 'watchlist', value: { type: 'watchlist', id: 'stake1fixture' } },
  ]),
  ...listCases('addresses', addresses, () => 'a.id'),
  ...listCases('policies', policies, () => 'p.id'),
  ...listCases('tokens', tokens, () => 'am.id', undefined, [
    { name: 'global' },
    { name: 'policy', value: { type: 'policy', id: 9n } },
    { name: 'watchlist', value: { type: 'watchlist', id: 'asset1fixture' } },
  ]),
]

async function capture(load: (selection: PageRequest) => Promise<unknown>, request: PageRequest) {
  cursorQuery.mockClear()
  await load(request)
  expect(cursorQuery).toHaveBeenCalledOnce()
  const [sql, values, limit] = cursorQuery.mock.calls[0]!
  const orders = [...sql.matchAll(/^\s*(ORDER BY[^\n]+)/gm)].map((match) => match[1]!.trim())
  expect(orders.length).toBeGreaterThan(0)
  expect(limit).toBe(request.limit)
  expect(sql).toContain(`LIMIT ${request.limit + 1}`)
  return { sql, values, orders }
}

describe.each(['asc', 'desc'] as const)('list pagination (%s)', (dir) => {
  it.each(cases)('$name uses the cursor order on the first and numbered pages', async ({ load, unique, tieId }) => {
    const request = { dir, limit: 12, after: '', page: 1 }
    const first = await capture(load, request)
    const numbered = await capture(load, { ...request, page: 3 })
    const id = tieId === 'e.no' ? '531' : '9007199254740993'
    const continuation = await capture(load, { ...request, page: 3, after: unique ? id : `42-${id}` })

    // LIMIT and OFFSET must select from the same total order as the cursor boundary.
    expect(new Set(first.orders).size).toBe(1)
    expect(numbered.orders).toEqual(first.orders)
    expect(continuation.orders).toEqual(first.orders)
    expect(numbered.sql).toContain('OFFSET 24')
    expect(continuation.sql).not.toContain('OFFSET')
    expect(continuation.values).toContain(id)

    if (unique) {
      expect(first.orders[0]).not.toContain(',')
    } else {
      for (const order of first.orders) {
        expect(order).toMatch(new RegExp(`, ${tieId.replace('.', '\\.')} ${dir}$`))
      }
      expect(continuation.sql).toMatch(
        new RegExp(`, ${tieId.replace('.', '\\.')}\\) ${dir === 'asc' ? '>' : '<'} \\(\\$\\d+, \\$\\d+\\)`)
      )
      expect(continuation.values).toContain('42')
    }
  })
})

describe('nullable holder sorting', () => {
  it.each(cases.filter(({ name }) => /^(accounts|addresses)\//.test(name)))(
    '$name keeps NULLS LAST on the primary field in both query levels',
    async ({ load }) => {
      for (const after of ['', '42-9']) {
        const { orders } = await capture(load, { dir: 'desc', limit: 12, after, page: 1 })
        for (const order of orders) {
          expect(order).toMatch(/ DESC NULLS LAST, a\.id desc$/i)
        }
      }
    }
  )
})

describe.each(['asc', 'desc'] as const)('nullable holder pagination (%s)', (dir) => {
  const nullableCases = cases.filter(
    ({ name, sort }) => /^(accounts|addresses)\//.test(name) && (sort === 'first_tx' || sort === 'last_tx')
  )

  it.each(nullableCases)('$name includes NULL rows after a numeric cursor', async ({ load, sort }) => {
    const request = { dir, limit: 12, after: '', page: 1 },
      first = await capture(load, request),
      id = '9007199254740993',
      comparison = dir === 'asc' ? '>' : '<'

    for (const value of ['0', '9007199254740995']) {
      const continuation = await capture(load, { ...request, after: `${value}-${id}`, page: 3 }),
        valueIndex = first.values.length + 1,
        idIndex = first.values.length + 2

      expect(continuation.values).toEqual([...first.values, value, id])
      expect(continuation.sql).toContain(
        `((a.${sort}, a.id) ${comparison} ($${valueIndex}, $${idIndex}) OR a.${sort} IS NULL)`
      )
      expect(continuation.orders).toEqual(first.orders)
      expect(continuation.sql).not.toContain('OFFSET')
    }
  })

  it.each(nullableCases)('$name continues within NULL rows using only the id', async ({ load, sort }) => {
    const request = { dir, limit: 12, after: '', page: 1 },
      first = await capture(load, request),
      id = '9007199254740993',
      continuation = await capture(load, { ...request, after: `-${id}`, page: 3 }),
      comparison = dir === 'asc' ? '>' : '<'

    expect(continuation.values).toEqual([...first.values, id])
    expect(continuation.sql).toContain(`a.${sort} IS NULL AND a.id ${comparison} $${first.values.length + 1}`)
    expect(continuation.sql).not.toContain(`(a.${sort}, a.id)`)
    expect(continuation.orders).toEqual(first.orders)
    expect(continuation.sql).not.toContain('OFFSET')
  })
})

describe.each([1n, 2n])('governance action %s', (govActionId) => {
  describe.each(['asc', 'desc'] as const)('pagination (%s)', (dir) => {
    it.each(['tx_time', 'voting_power'] as const)('votes sorted by %s follow the cursor direction', async (sort) => {
      const load = (selection: PageRequest) =>
        govActions.getItemRows({ ...selection, govActionId, rows: 'votes', sort, currency: 'usd', meta_format: 'md' })
      const request = { dir, limit: 12, after: '', page: 1 }
      const first = await capture(load, request)
      const id = '9007199254740993'
      const continuation = await capture(load, { ...request, after: sort === 'tx_time' ? id : `42-${id}` })

      expect(continuation.orders).toEqual(first.orders)
      expect(first.orders.at(-1)).toMatch(new RegExp(`vp\\.id ${dir}$`))
      expect(continuation.values.at(-1)).toBe(id)
      if (sort === 'voting_power') {
        expect(first.orders.at(-1)).toContain(`${dir} NULLS LAST,`)
        expect(continuation.sql).toMatch(new RegExp(`, vp\\.id\\) ${dir === 'asc' ? '>' : '<'} \\(\\$\\d+, \\$\\d+\\)`))
      }
      // Latest-vote selection is independent of the requested page order.
      expect(first.orders[0]).toBe('ORDER BY vp.drep_voter, vp.pool_voter, vp.committee_voter, vp.id DESC')
    })

    const filterCases = ([undefined, 'drep', 'spo'] as const).flatMap((role) =>
      ([undefined, 'yes', 'not_voted'] as const).map((vote) => ({ role, vote }))
    )
    it.each(filterCases)(
      'voters with role=$role and vote=$vote use the same order before and after UNION',
      async (filters) => {
        const load = (selection: PageRequest) =>
          govActions.getItemRows({
            ...selection,
            ...filters,
            govActionId,
            rows: 'voters',
            sort: 'voting_power',
            currency: 'usd',
            meta_format: 'md',
          })
        const request = { dir, limit: 12, after: '', page: 1 }
        const first = await capture(load, request)
        const id = '9007199254740993'
        const continuation = await capture(load, { ...request, after: `42-${filters.role ?? 'drep'}-${id}` })

        expect(continuation.orders).toEqual(first.orders)
        expect(continuation.values.slice(-3)).toEqual(['42', filters.role ?? 'drep', id])
        expect(first.orders.at(-1)).toBe(`ORDER BY v.voting_power ${dir}, v.role ${dir}, v.id ${dir}`)
        const branches = first.orders.slice(1, -1)
        expect(branches).toHaveLength(filters.role ? 1 : 2)
        for (const order of branches) {
          expect(order).toMatch(new RegExp(`^ORDER BY voting_power ${dir}, (dh|p)\\.id ${dir}$`))
        }
        expect(continuation.sql).toMatch(
          new RegExp(
            `WHERE \\(v\\.voting_power, v\\.role, v\\.id\\) ${dir === 'asc' ? '>' : '<'} \\(\\$\\d+, \\$\\d+, \\$\\d+\\)`
          )
        )
        expect(first.orders[0]).toBe('ORDER BY vp.drep_voter, vp.pool_voter, vp.id DESC')
      }
    )
  })
})
