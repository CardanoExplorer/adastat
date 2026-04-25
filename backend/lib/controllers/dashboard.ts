import { getEntry } from '@/cache.ts'
import { type ListSort as AccountListSort, getList as getAccountList } from '@/models/accounts.ts'
import { type ListSort as BlockListSort, getList as getBlockList } from '@/models/blocks.ts'
import { type ListSort as DRepListSort, getList as getDRepList } from '@/models/dreps.ts'
import { type ListSort as PoolListSort, getList as getPoolList } from '@/models/pools.ts'
import { type ListSort as TokenListSort, getList as getTokenList } from '@/models/tokens.ts'
import type { Handler, QueryString } from '@/schema.ts'
import { type Currency, exchangeRates, getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

const dashboard: Handler<
  AnyObject,
  AnyObject,
  {
    currency: Currency
    account: string
    drep: string
    pool: string
    token: string
  }
> = async ({ query }) => {
  const { currency, account, drep, pool, token } = query

  const storageData = await getData()

  const [{ rows: blockRows }, { rows: accountRows }, { rows: drepRows }, { rows: poolRows }, { rows: tokenRows }] =
    await Promise.all([
      getEntry(`blockList|no|desc|6||1`, () =>
        getBlockList({ sort: 'no', dir: 'desc', limit: 6, after: '', page: 1 } as QueryString<BlockListSort>)
      ),
      account
        ? getEntry(`watchlistAccountList|${account}`, () =>
            getAccountList(
              {
                sort: 'balance',
                dir: 'desc',
                limit: 12,
                after: '',
                page: 1,
              } as QueryString<AccountListSort>,
              { type: 'watchlist', id: account }
            )
          )
        : { rows: [] },
      drep
        ? getEntry(`watchlistDRepList|${drep}`, () =>
            getDRepList({ sort: 'reg_time', dir: 'desc', limit: 12, after: '', page: 1 } as QueryString<DRepListSort>, {
              type: 'watchlist',
              id: drep,
            })
          )
        : { rows: [] },
      pool
        ? getEntry(`watchlistPoolList|${pool}`, () =>
            getPoolList(
              { sort: 'live_stake', dir: 'desc', limit: 12, after: '', page: 1 } as QueryString<PoolListSort>,
              { type: 'watchlist', id: pool }
            )
          )
        : { rows: [] },
      token
        ? getEntry(`watchlistTokenList|${token}`, () =>
            getTokenList({ sort: 'holder', dir: 'desc', limit: 12, after: '', page: 1 } as QueryString<TokenListSort>, {
              type: 'watchlist',
              id: token,
            })
          )
        : { rows: [] },
    ])

  const latestEpochsData = [] as typeof storageData.latestEpochsData

  for (const latestEpochData of storageData.latestEpochsData) {
    latestEpochsData.push({
      ...latestEpochData,
      price: storageData.epochs.get(latestEpochData.no)?.exchangeRates?.[currency] || 0,
    })
  }

  const data = {
    epoch_no: latestBlock.epoch_no,
    epoch_slot_no: latestBlock.epoch_slot_no,
    slot_no: latestBlock.slot_no,
    latest_epochs_data: latestEpochsData,
    circulating_supply: storageData.circulatingSupply,
    total_stake: storageData.stake,
    holders: storageData.holder + storageData.byronHolder,
    pool: storageData.pool,
    pool_with_stake: storageData.stakePool,
    exchange_rate: exchangeRates[currency] || 0,
    saturation_point: storageData.liveSaturationPoint,
    blocks: {
      rows: blockRows,
    },
    accounts: {
      rows: accountRows,
    },
    dreps: {
      rows: drepRows,
    },
    pools: {
      rows: poolRows,
    },
    tokens: {
      rows: tokenRows,
    },
  }

  return {
    data,
  }
}

export default dashboard
