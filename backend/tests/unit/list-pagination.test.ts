import { clearCache } from '@/cache.ts'
import { item as getAccountItem } from '@/controllers/accounts.ts'
import * as accounts from '@/models/accounts.ts'
import * as addresses from '@/models/addresses.ts'
import * as blocks from '@/models/blocks.ts'
import * as epochs from '@/models/epochs.ts'
import * as govActions from '@/models/gov-actions.ts'
import * as policies from '@/models/policies.ts'
import * as tokens from '@/models/tokens.ts'
import * as transactions from '@/models/transactions.ts'
import type { QueryString } from '@/schema.ts'
import * as storage from '@/storage.ts'
import { describe, expect, it, vi } from 'vitest'

const { cursorQuery, query } = vi.hoisted(() => ({
  cursorQuery: vi.fn<(text: string, values: unknown[], limit: number) => Promise<unknown>>().mockResolvedValue({
    rows: [],
    cursor: undefined,
  }),
  query: vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>(() => {
    throw new Error('Database access is prohibited in pagination tests')
  }),
}))
vi.mock('@/db.ts', () => ({ cursorQuery, query }))
vi.mock('@/config.ts', () => ({
  networkParams: {
    isMainnet: true,
    genesisHash: '00',
    shelley: 0,
    byronSizeLimits: { epochs: [], blockSizes: [], txSizes: [] },
  },
}))
vi.mock('@/logger.ts', () => ({ default: { warn: vi.fn() } }))
vi.mock('@/storage.ts', () => ({
  getData: async () => ({
    nonParsedBlocks: new Map(),
    latestParsedEpoch: 2,
    epochs: new Map([
      [1, { firstTxId: 100n, exchangeRates: { usd: 0.125, eur: 0.25 } }],
      [2, { firstTxId: 200n, exchangeRates: { usd: 99, eur: 99 } }],
    ]),
  }),
  latestBlock: { epoch_no: 2 },
  exchangeRates: { usd: 1.5, eur: 2 },
}))
vi.mock('@/helpers/dreps.ts', () => ({
  delegations: new Map(),
  dreps: new Map(),
  idValues: [],
  votingAnchorIdValues: [],
  stakeValues: [],
  activeValues: [],
}))
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

describe.each(['usd', 'eur', 'jpy'] as const)('epoch monetary sorting (%s)', (currency) => {
  it.each(['exchange_rate', 'market_cap'] as const)(
    '%s uses the displayed rates in its order and cursor',
    async (sort) => {
      const load = (selection: PageRequest) => epochs.getList({ ...selection, sort, currency, meta_format: 'md' }),
        field = sort === 'exchange_rate' ? 'COALESCE(cr.price, 0)' : 'ae.circulating_supply * COALESCE(cr.price, 0)',
        value = sort === 'exchange_rate' ? '0.000000125' : '9007199254740993123456.125'

      for (const dir of ['asc', 'desc'] as const) {
        const request = { dir, limit: 12, after: '', page: 1 },
          first = await capture(load, request),
          numbered = await capture(load, { ...request, page: 3 }),
          continuation = await capture(load, { ...request, after: `${value}-531`, page: 3 })

        for (const result of [first, numbered, continuation]) {
          expect(result.sql).toContain('LEFT JOIN unnest($5::int[], $6::numeric[]) AS cr (no, price) ON cr.no = e.no')
          expect(result.sql).toContain(`SELECT CONCAT(${field},'-',e.no) AS cursor`)
          expect(result.sql).toContain('COALESCE(cr.price, 0)::float AS exchange_rate')
          expect(result.orders).toEqual([`ORDER BY ${field} ${dir}, e.no ${dir}`])
          expect(result.values.slice(4, 6)).toEqual([
            [2, 1],
            currency === 'usd' ? [1.5, 0.125] : currency === 'eur' ? [2, 0.25] : [0, 0],
          ])
        }
        expect(continuation.values.slice(6)).toEqual([value, '531'])
        expect(continuation.sql).toContain(`(${field}, e.no) ${dir === 'asc' ? '>' : '<'} ($7, $8)`)
        expect(numbered.sql).toContain('OFFSET 24')
        expect(continuation.sql).not.toContain('OFFSET')
      }
    }
  )
})

it('includes the current epoch rate before historical storage contains that epoch', async () => {
  const stored = await storage.getData(),
    getData = vi.spyOn(storage, 'getData').mockResolvedValueOnce({ ...stored, epochs: new Map() })

  try {
    const result = await capture(
      (selection) => epochs.getList({ ...selection, sort: 'exchange_rate', currency: 'usd', meta_format: 'md' }),
      { dir: 'desc', limit: 12, after: '', page: 1 }
    )

    expect(result.values).toEqual([[], [], [], [], [2], [1.5]])
    expect(result.sql).toContain('AS cr (no, price) ON cr.no = e.no')
  } finally {
    getData.mockRestore()
  }
})

describe.each(['asc', 'desc'] as const)('epoch list rates and pagination (%s)', (dir) => {
  it('returns exchange rates while preserving epoch number sorting and pagination', async () => {
    const result = await capture(
      (selection) => epochs.getList({ ...selection, sort: 'no', currency: 'usd', meta_format: 'md' }),
      { dir, limit: 12, after: '531', page: 1 }
    )

    expect(result.sql).toContain('LEFT JOIN unnest($5::int[], $6::numeric[]) AS cr (no, price) ON cr.no = e.no')
    expect(result.sql).toContain('COALESCE(cr.price, 0)::float AS exchange_rate')
    expect(result.sql).toContain(`WHERE e.no ${dir === 'asc' ? '>' : '<'} $7`)
    expect(result.orders).toEqual([`ORDER BY e.no ${dir}`])
    expect(result.values.slice(4)).toEqual([[2, 1], [1.5, 0.125], '531'])
  })
})

describe.each(['asc', 'desc'] as const)('transaction deposit pagination (%s)', (dir) => {
  const depositCases = cases.filter(({ name, sort }) => name.startsWith('transactions/') && sort === 'deposit')

  it.each(depositCases)(
    '$name continues after signed values and includes NULL only in ascending order',
    async ({ load }) => {
      const request = { dir, limit: 12, after: '', page: 1 },
        first = await capture(load, request),
        id = '9007199254740993',
        comparison = dir === 'asc' ? '>' : '<'

      for (const value of ['-9007199254740995', '-2000000', '0', '2000000', '9007199254740995']) {
        const continuation = await capture(load, { ...request, after: `${value}-${id}`, page: 3 }),
          valueIndex = first.values.length + 1,
          idIndex = first.values.length + 2,
          boundary = `(tx.deposit, tx.id) ${comparison} ($${valueIndex}, $${idIndex})`

        expect(continuation.values).toEqual([...first.values, value, id])
        expect(continuation.sql).toContain(dir === 'asc' ? `(${boundary} OR tx.deposit IS NULL)` : boundary)
        if (dir === 'desc') {
          expect(continuation.sql).not.toContain('IS NULL')
        }
        expect(continuation.orders).toEqual(first.orders)
        expect(continuation.sql).not.toContain('OFFSET')
      }
    }
  )

  it.each(depositCases)(
    '$name continues within NULL rows and reaches numbers only in descending order',
    async ({ load }) => {
      const request = { dir, limit: 12, after: '', page: 1 },
        first = await capture(load, request),
        id = '9007199254740993',
        continuation = await capture(load, { ...request, after: `-${id}`, page: 3 }),
        comparison = dir === 'asc' ? '>' : '<',
        boundary = `tx.deposit IS NULL AND tx.id ${comparison} $${first.values.length + 1}`

      expect(continuation.values).toEqual([...first.values, id])
      expect(continuation.sql).toContain(dir === 'asc' ? boundary : `(${boundary} OR tx.deposit IS NOT NULL)`)
      if (dir === 'asc') {
        expect(continuation.sql).not.toContain('IS NOT NULL')
      }
      expect(continuation.sql).not.toContain('(tx.deposit, tx.id)')
      expect(continuation.orders).toEqual(first.orders)
      expect(continuation.sql).not.toContain('OFFSET')
    }
  )
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

it('uses the indexed account epoch for the estimate, staking history and cached pages across a rollover', async () => {
  const hash = 'ab'.repeat(28),
    amount = '9007199254740993',
    previousTipEpoch = storage.latestBlock.epoch_no
  let indexedEpoch = 600
  const load = (itemId: string) =>
    getAccountItem(
      {
        params: { itemId },
        query: { rows: 'staking', sort: 'rewards', dir: 'desc', limit: 12, after: '' },
      } as Parameters<typeof getAccountItem>[0],
      {} as Parameters<typeof getAccountItem>[1]
    )

  clearCache()
  cursorQuery.mockClear()
  try {
    storage.latestBlock.epoch_no = 601
    await query.withImplementation(
      async (sql, values) => {
        if (sql.includes('AS pending_reward_amount,')) {
          return {
            rows: [
              {
                account_id: 42n,
                active_epoch_no: indexedEpoch,
                previous_pool_id: 9007199254740995n,
                base16: 'e1' + hash,
                pending_reward_amount: null,
                stake_history: true,
              },
            ],
          }
        }
        if (sql.includes('AS is_pledge_met,')) {
          expect(values?.[5]).toBe(indexedEpoch)
          return { rows: [{ is_pledge_met: true, member_rewards: amount }] }
        }
        return { rows: [] }
      },
      async () => {
        const old = await load(hash)
        indexedEpoch = 601
        const fresh = await load('e1' + hash)
        await load(hash)

        expect(old.data).toMatchObject({ active_epoch_no: 600, pending_reward_amount: amount })
        expect(fresh.data).toMatchObject({ active_epoch_no: 601, pending_reward_amount: amount })
        expect(cursorQuery.mock.calls.map(([, values]) => values)).toEqual([
          [42n, 600, 1, [599], [amount]],
          [42n, 601, 1, [600], [amount]],
        ])
      }
    )
  } finally {
    storage.latestBlock.epoch_no = previousTipEpoch
    clearCache()
  }
})

describe.each(['asc', 'desc'] as const)('account staking pagination (%s)', (dir) => {
  const getPage = (
    sort: 'epoch' | 'stake' | 'rewards',
    after = '',
    amount: string | null = null,
    stakeKeys: { epoch_no: number; stake_key_register: boolean }[] = []
  ) =>
    capture(
      (selection) => {
        query.mockResolvedValueOnce({ rows: stakeKeys })
        return accounts.getItemRows({
          ...selection,
          rows: 'staking',
          sort,
          accountId: 42n,
          firstTx: 1n,
          lastTx: 9n,
          data: { active_epoch_no: 600, stake_history: true, pending_reward_amount: amount },
          currency: 'usd',
          meta_format: 'md',
        })
      },
      { dir, limit: 1, after, page: 1 }
    )

  it.each([
    ['stake', 'h.stake'],
    ['rewards', 'h.amount'],
  ] as const)('paginates %s by the full row boundary for ties and missing amounts', async (sort, column) => {
    const first = await getPage(sort)
    const order = `ORDER BY ${column} ${dir} NULLS LAST, h.earned_epoch_no ${dir}, h.entry_key ${dir}`
    expect(first.orders).toEqual([order, order])
    expect(first.sql.indexOf(order)).toBeLessThan(first.sql.indexOf('LIMIT'))
    expect(first.sql).toContain(`CONCAT(${column}, '-', h.earned_epoch_no, '-', h.entry_key) AS cursor`)
    const entry = '9007199254740999:11:member:515'
    for (const amount of ['9007199254740993', '0', '']) {
      const next = await getPage(sort, `${amount}-513-${entry}`)
      expect(next.values).toEqual([...first.values, amount || null, '513', entry])
      expect(next.orders).toEqual(first.orders)
      expect(next.sql).toContain(
        `${column} IS NOT DISTINCT FROM $6::numeric AND (h.earned_epoch_no, h.entry_key) ${dir === 'asc' ? '>' : '<'} ($7, $8)`
      )
    }
  })

  it.each(['stake', 'rewards'] as const)('finishes a legacy %s cursor using the original epoch order', async (sort) => {
    const legacy = await getPage(sort, '2')
    expect(legacy).toEqual(await getPage('epoch', '2'))
    expect(legacy.orders[0]).toBe(`ORDER BY h.earned_epoch_no ${dir}`)
    expect(legacy.sql).toContain('SELECT h.earned_epoch_no AS cursor')
  })

  it('keeps the pending reward through deregistration and re-registration before payout', async () => {
    const amount = '9007199254740993'
    const registered = { epoch_no: 599, stake_key_register: true }
    const deregistered = { epoch_no: 600, stake_key_register: false }
    const page = await getPage('rewards', '', amount, [registered])
    expect(page.values).toEqual([42n, 600, 1, [599], [amount]])
    const unknown = await getPage('rewards', '', null, [registered])
    expect(unknown.values.slice(3)).toEqual([[599], [null]])
    expect(unknown.sql).toContain('COALESCE(r.amount, p.amount, 0) AS amount')
    const afterDeregistration = await getPage('rewards', '', amount, [registered, deregistered])
    expect(afterDeregistration.values).toEqual(page.values)
    const reregistered = { epoch_no: 600, stake_key_register: true }
    const afterReregistration = await getPage('rewards', '', amount, [registered, deregistered, reregistered])
    expect(afterReregistration.values).toEqual(page.values)
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
