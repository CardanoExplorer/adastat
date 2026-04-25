import { clearCache } from '@/cache.ts'
import { loadNetworkEnv, networkParams } from '@/config.ts'
import { type Block, query } from '@/db.ts'
import { type AprPeriod, type PoolApr, aprPeriods, getEmptyApr } from '@/helpers/pools.ts'
import logger from '@/logger.ts'
import type { AnyObject, HexString } from '@/types/shared.js'
import type {
  AdaStatCurrencyPriceTable,
  BlockTable,
  EpochParamTable,
  MaTxOutTable,
  MetaTable,
  NonNullableFields,
  TxOutTable,
  TxTable,
} from '@/types/tables.ts'

let queueHandling: Promise<void> | null = null

export type Currency = keyof typeof exchangeRate

type NonParsedBlock = {
  id: bigint
  no: number
  size: number
  slotLeaderId: bigint
  txCount: number
  tokenTxCount: number
  txAmount: bigint
  txOutSum: bigint
  txFees: bigint
  txs: Map<
    bigint,
    {
      id: bigint
      blockId: bigint
      blockNo: number
      type: number
      amount: bigint
      outSum: bigint
      fee: bigint
      token: number
      accounts: Map<string, bigint>
    }
  >
}

type EpochData = {
  no: number
  firstBlockId: bigint
  firstTxBlockId: bigint
  firstSlotNo: bigint
  firstTxSlotNo: bigint
  firstEpochSlotNo: number
  firstTxEpochSlotNo: number
  firstTxId: bigint
}

const data = {
  minEpochBlocks: 0,
  maxEpochBlocks: 0,
  totalBlocks: 0,
  minEpochTxs: 0,
  maxEpochTxs: 0,
  totalTxs: 0,
  totalTxFees: 0n,
  totalTxOutSum: 0n,
  totalTxAmount: 0n,
  totalBlocksWithTxs: 0,
  totalPoolFees: 0n,
  totalDelegatorRewards: 0n,
  totalOrphanedRewards: 0n,
  totalRewardedAccounts: 0,
  liveSaturationPoint: 0n,
  activeSaturationPoint: 0n,
  totalRetiredPools: 0,
  totalTokenTxs: 0,
  minBlockSize: 0,
  maxBlockSize: 0,
  totalBlockSize: 0,
  circulatingSupply: 0n,
  minBlocksEpoch: 0,
  maxBlocksEpoch: 0,
  minTxsEpoch: 0,
  maxTxsEpoch: 0,
  avgBlocksPerEpoch: 0,
  avgTxsPerEpoch: 0,
  liveLoad: 0,
  liveTPS: 0,
  latestParsedEpoch: -1,
  account: 0n,
  holder: 0n,
  delegator: 0n,
  stakeHolder: 0n,
  stake: 0n,
  byron: 0n,
  byronHolder: 0n,
  byronAmount: 0n,
  holderRange: {
    byron: {} as Record<`${number}`, number>,
    account: {} as Record<`${number}`, number>,
    address: {} as Record<`${number}`, number>,
    delegator: {} as Record<`${number}`, number>,
  },
  accountRange: {} as Record<`${number}`, { qty: number; stake: `${number}` }>,
  byronRange: {} as Record<`${number}`, { qty: number; stake: `${number}` }>,
  latestEpochsData: [] as AnyObject[],
  token: 0n,
  tokenPolicy: 0n,
  tokenHolder: 0n,
  pool: 0,
  stakePool: 0,
  blockProducer: 0,
  newPool: 0,
  retiredPool: 0,
  nonParsedTxAmount: 0n,
  nonParsedTokenTxs: 0,
  nonParsedBlockSize: 0,
  nonParsedBlocksWithTxs: 0,
  nonParsedBlocks: new Map<number, NonParsedBlock>(),
  epochs: new Map<number, EpochData>(),
  poolApr: new Map<bigint, PoolApr>(),
}

export const exchangeRate = {
  aed: 0,
  ars: 0,
  aud: 0,
  bdt: 0,
  bhd: 0,
  bmd: 0,
  brl: 0,
  cad: 0,
  chf: 0,
  clp: 0,
  cny: 0,
  czk: 0,
  dkk: 0,
  eur: 0,
  gbp: 0,
  hkd: 0,
  huf: 0,
  idr: 0,
  ils: 0,
  inr: 0,
  jpy: 0,
  krw: 0,
  kwd: 0,
  lkr: 0,
  mmk: 0,
  mxn: 0,
  myr: 0,
  ngn: 0,
  nok: 0,
  nzd: 0,
  php: 0,
  pkr: 0,
  pln: 0,
  rub: 0,
  sar: 0,
  sek: 0,
  sgd: 0,
  thb: 0,
  try: 0,
  twd: 0,
  uah: 0,
  usd: 0,
  vef: 0,
  vnd: 0,
  zar: 0,
}

export const latestBlock: Block = {
  block_no: 0,
  block_hash: '',
  epoch_no: 0,
  slot_no: 0,
  epoch_slot_no: 0,
  block_size: 0,
  tx_count: 0,
  slot_leader_id: 0,
}

export const getPoolApr = (poolId: bigint) => {
  if (!data.poolApr.has(poolId)) {
    data.poolApr.set(poolId, getEmptyApr())
  }

  return data.poolApr.get(poolId)!
}

const setPoolAprMap = async (latestEpochNo: number) => {
  logger.trace('Storage setPoolAprMap start')

  const { rows: aprRows } = await query(
    `
    WITH params AS (
      SELECT ep.epoch_no,
        $1::float8 - ap.reserves::float8 AS circulation_supply,
        FLOOR(ap.reserves * ep.monetary_expand_rate * CASE
          WHEN ep.decentralisation < 0.8 THEN LEAST(1, p.blocks / ($2 * (1 - ep.decentralisation)))
          ELSE 1
        END + ap.fees)::float8 AS total_reward_pot,
        ep.decentralisation,
        ep.treasury_growth_rate::float8,
        ep.influence::float8,
        1 / ep.optimal_pool_count::float8 AS relative_saturation,
        p.blocks
      FROM epoch_param AS ep
      LEFT JOIN ada_pots AS ap ON ap.epoch_no = ep.epoch_no + 1
      LEFT JOIN (
        SELECT epoch_no, SUM(block) AS blocks
        FROM adastat_epoch_pool
        GROUP BY epoch_no
      ) AS p ON p.epoch_no = ep.epoch_no
      WHERE ap.id IS NOT NULL AND p.blocks > 0
    )
    SELECT params.epoch_no,
      params.total_reward_pot,
      params.treasury_growth_rate,
      params.influence,
      params.relative_saturation,
      aep.pool_id,
      aep_a.stake::float8 AS pool_stake,
      aep_a.delegator_with_stake,
      pu.margin::float8,
      pu.fixed_cost::float8,
      LEAST(params.relative_saturation, aep_a.stake::float8 / params.circulation_supply) AS relative_pool_stake,
      LEAST(params.relative_saturation, pu.pledge::float8 / params.circulation_supply) AS relative_pledge,
      CASE
        WHEN params.blocks = 0 OR aep_a.stake = 0 THEN 0
        WHEN params.decentralisation < 0.8 THEN aep.block * ae.stake::float8 / (params.blocks * aep_a.stake::float8)
        ELSE 1
      END AS pool_perfomance
    FROM params
    LEFT JOIN adastat_epoch_pool AS aep ON aep.epoch_no = params.epoch_no
    LEFT JOIN adastat_epoch AS ae ON ae.no = aep.epoch_no - 2
    LEFT JOIN adastat_epoch_pool AS aep_a ON aep_a.epoch_no = ae.no AND aep_a.pool_id = aep.pool_id
    LEFT JOIN pool_update AS pu ON pu.id = aep_a.update_id
    WHERE params.epoch_no ${data.poolApr.size ? '=' : '<='} $3
  `,
    [networkParams.totalSupply, networkParams.epochLength * networkParams.activeSlotsCoeff, latestEpochNo]
  )

  logger.trace('Storage setPoolAprMap aprRows %s', aprRows.length)

  for (const row of aprRows) {
    const rewardPot = Math.floor(
        Math.floor(
          ((row.total_reward_pot - Math.floor(row.total_reward_pot * row.treasury_growth_rate)) / (1 + row.influence)) *
            (row.relative_pool_stake +
              row.relative_pledge *
                row.influence *
                ((row.relative_pool_stake -
                  row.relative_pledge *
                    ((row.relative_saturation - row.relative_pool_stake) / row.relative_saturation)) /
                  row.relative_saturation))
        ) * row.pool_perfomance
      ),
      fixedCost = rewardPot < row.fixed_cost ? rewardPot : row.fixed_cost,
      poolFees = Math.floor(fixedCost + (rewardPot - fixedCost) * row.margin),
      memberRewards = Math.floor((rewardPot - fixedCost) * (1 - row.margin))

    const poolApr = getPoolApr(row.pool_id)

    if (row.epoch_no === latestEpochNo) {
      poolApr.fees = BigInt(poolFees)
      poolApr.rewards = BigInt(memberRewards)
      poolApr.holders = Number(row.delegator_with_stake)
    }

    if (row.pool_stake > 0) {
      poolApr.ratio.set(row.epoch_no, memberRewards / row.pool_stake)
      poolApr.luck.set(row.epoch_no, row.pool_perfomance)
    }
  }

  const epochsPerYear = (365 * 86_400) / (networkParams.epochLength * networkParams.slotLength)

  for (const poolApr of data.poolApr.values()) {
    const poolData = new Map<AprPeriod, { apr: number[]; luck: number[] }>()

    for (const aprPeriod of aprPeriods) {
      poolData.set(aprPeriod, {
        apr: [],
        luck: [],
      })
    }

    for (const [epochNo, epochRatio] of poolApr.ratio.entries()) {
      const epochDiff = latestEpochNo - epochNo,
        epochLuck = poolApr.luck.get(epochNo)!

      for (const aprPeriod of poolApr.data.keys()) {
        if (epochDiff < aprPeriod || !aprPeriod) {
          const poolDataPeriod = poolData.get(aprPeriod)!
          poolDataPeriod.apr.push(epochRatio)
          poolDataPeriod.luck.push(epochLuck)
        }
      }
    }

    for (const [aprPeriod, { apr, luck }] of poolData.entries()) {
      const periodPoolData = {
        apr: 0,
        luck: 0,
      }

      if (apr.length) {
        let totalGrowthFactor = 1

        for (const epochApr of apr) {
          totalGrowthFactor *= 1 + epochApr
        }

        periodPoolData.apr = Math.pow(totalGrowthFactor, epochsPerYear / apr.length) - 1
      }

      if (luck.length) {
        periodPoolData.luck = luck.reduce((acc: number, curr: number) => acc + curr) / luck.length
      }

      poolApr.data.set(aprPeriod, periodPoolData)
    }

    poolApr.blockProbability = []
  }

  logger.trace('Storage setPoolAprMap end')
}

const loadHolderRange = async () => {
  for (const type of ['accountRange', 'byronRange'] as const) {
    const {
      rows: [row],
    } = await query(`
      SELECT jsonb_object_agg(
        bucket,
        jsonb_build_object('qty', qty, 'stake', stake)
      ) AS res
      FROM (
        SELECT
          WIDTH_BUCKET(
            amount,
            ARRAY[1000000, 10000000, 100000000, 1000000000,
                  10000000000, 100000000000, 1000000000000,
                  10000000000000]::bigint[]
          ) AS bucket,
          COUNT(*)::integer AS qty,
          SUM(amount)::numeric AS stake
        FROM ${type === 'accountRange' ? 'adastat_account' : 'adastat_address_byron'}
        GROUP BY bucket
      ) t
    `)

    if (row) {
      data[type] = row.res
    }
  }
}

const getLiveData = async (latestParserBlockId: bigint) => {
  const { block_no, block_hash } = latestBlock

  const { rows: nonParsedBlockRows } = await query<
    NonNullableFields<
      Pick<BlockTable, 'id' | 'block_no' | 'slot_no' | 'epoch_no' | 'size' | 'tx_count' | 'slot_leader_id'> &
        Pick<EpochParamTable, 'max_block_size' | 'max_tx_size'>
    >
  >(
    `
    SELECT b.id, b.block_no, b.slot_no, b.epoch_no, b.size, b.tx_count, COALESCE(b.slot_leader_id, 0) AS slot_leader_id, COALESCE(ep.max_block_size, 2 * 1024 * 1024) AS max_block_size, COALESCE(ep.max_tx_size, 64 * 1024) AS max_tx_size
    FROM block AS b
    LEFT JOIN epoch_param AS ep ON ep.epoch_no = b.epoch_no
    WHERE b.id > $1
    LIMIT 100
  `,
    [latestParserBlockId]
  )

  const nonParsedBlocks: typeof data.nonParsedBlocks = new Map()

  let blockSize = 0,
    maxBlockSize = 0,
    blocksWithTxs = 0,
    txCount = 0,
    tokenTxCount = 0,
    txAmount = 0n,
    firstSlot = Infinity,
    lastSlot = 0

  for (const nonParsedBlockRow of nonParsedBlockRows) {
    const rowSlotNo = Number(nonParsedBlockRow.slot_no),
      rowTxCount = Number(nonParsedBlockRow.tx_count)

    blockSize += nonParsedBlockRow.size
    maxBlockSize += nonParsedBlockRow.max_block_size
    txCount += rowTxCount

    if (nonParsedBlockRow.tx_count > 0) {
      blocksWithTxs++
    }

    if (firstSlot > rowSlotNo) {
      firstSlot = rowSlotNo
    }

    if (lastSlot < rowSlotNo) {
      lastSlot = rowSlotNo
    }

    const _nonParsedBlock = data.nonParsedBlocks.get(nonParsedBlockRow.block_no)
    if (_nonParsedBlock?.id === nonParsedBlockRow.id) {
      txAmount += _nonParsedBlock.txAmount
      tokenTxCount += _nonParsedBlock.tokenTxCount

      nonParsedBlocks.set(nonParsedBlockRow.block_no, _nonParsedBlock)
    } else if (nonParsedBlockRows.length < 100) {
      const nonParsedBlock: NonParsedBlock = {
        id: nonParsedBlockRow.id,
        no: nonParsedBlockRow.block_no,
        size: nonParsedBlockRow.size,
        slotLeaderId: nonParsedBlockRow.slot_leader_id,
        txCount: rowTxCount,
        tokenTxCount: 0,
        txAmount: 0n,
        txOutSum: 0n,
        txFees: 0n,
        txs: new Map(),
      }

      if (rowTxCount > 0) {
        const { rows: txRows } = await query<Pick<TxTable, 'id' | 'out_sum' | 'fee'>>(
          `SELECT id, out_sum, fee FROM tx WHERE block_id = $1`,
          [nonParsedBlockRow.id]
        )

        for (const txRow of txRows) {
          nonParsedBlock.txs.set(txRow.id, {
            id: txRow.id,
            blockId: nonParsedBlockRow.id,
            blockNo: nonParsedBlockRow.block_no,
            type: 0,
            amount: 0n,
            outSum: BigInt(txRow.out_sum),
            fee: BigInt(txRow.fee),
            token: 0,
            accounts: new Map(),
          })
        }

        const { rows: txInOutRows } = await query<
          Pick<TxOutTable, 'value' | 'address' | 'stake_address_id' | 'tx_id' | 'id'> & {
            type: 'input' | 'output' | 'withdrawal'
          }
        >(
          `
          (
            SELECT 'input' AS type, -tx_out.value AS value, tx_out.address, tx_out.stake_address_id, tx_in.tx_in_id AS tx_id, tx_out.id AS id
            FROM tx_in
            LEFT JOIN tx_out ON (tx_out.tx_id = tx_in.tx_out_id AND tx_out.index = tx_in.tx_out_index)
            WHERE tx_in.tx_in_id = ANY($1::bigint[])
          )
          UNION ALL
          (
            SELECT 'output' AS type, tx_out.value, tx_out.address, tx_out.stake_address_id, tx_out.tx_id, tx_out.id
            FROM tx_out
            WHERE tx_out.tx_id = ANY($1::bigint[])
          )
          UNION ALL
          (
            SELECT 'withdrawal' AS type, -withdrawal.amount AS value, '' AS address, withdrawal.addr_id AS stake_address_id, withdrawal.tx_id, 0 AS id
            FROM withdrawal
            WHERE withdrawal.tx_id = ANY($1::bigint[])
          )
        `,
          [[...nonParsedBlock.txs.keys()]]
        )

        const inputOutputTxId = new Map<bigint, bigint>(),
          inputOutputMA = new Map<bigint, Set<bigint>>()

        for (const txInOutRow of txInOutRows) {
          const txAccounts = nonParsedBlock.txs.get(txInOutRow.tx_id)!.accounts,
            accountId = txInOutRow.stake_address_id ? String(txInOutRow.stake_address_id) : '_' + txInOutRow.address,
            accountAmount = txAccounts.get(accountId) ?? 0n

          txAccounts.set(accountId, accountAmount + BigInt(txInOutRow.value))

          if (txInOutRow.type !== 'withdrawal') {
            inputOutputTxId.set(txInOutRow.id, txInOutRow.tx_id)
          }
        }

        if (inputOutputTxId.size > 0) {
          const { rows: maTxOutRows } = await query<Pick<MaTxOutTable, 'ident' | 'tx_out_id'>>(
            `
            SELECT ident, tx_out_id
            FROM ma_tx_out
            WHERE tx_out_id = ANY($1::bigint[])
          `,
            [[...inputOutputTxId.keys()]]
          )

          for (const maTxOutRow of maTxOutRows) {
            const txId = inputOutputTxId.get(maTxOutRow.tx_out_id)!,
              inputOutputMASet = inputOutputMA.get(txId) ?? new Set()

            inputOutputMASet.add(maTxOutRow.ident)

            inputOutputMA.set(txId, inputOutputMASet)
          }
        }

        for (const tx of nonParsedBlock.txs.values()) {
          for (const accountId of tx.accounts.keys()) {
            const amount = tx.accounts.get(accountId)!
            if (amount > 0) {
              tx.amount += amount
            }
          }

          txAmount += tx.amount

          const inputOutputMAValues = inputOutputMA.get(tx.id)

          if (inputOutputMAValues) {
            tx.token = inputOutputMAValues.size

            if (tx.token > 0) {
              nonParsedBlock.tokenTxCount++
            }
          }

          nonParsedBlock.txAmount += tx.amount
          nonParsedBlock.txOutSum += tx.outSum
          nonParsedBlock.txFees += tx.fee
        }

        tokenTxCount += nonParsedBlock.tokenTxCount
      }

      nonParsedBlocks.set(nonParsedBlockRow.block_no, nonParsedBlock)
    }
  }

  if (latestBlock.block_no > block_no || (latestBlock.block_no === block_no && latestBlock.block_hash !== block_hash)) {
    return await getLiveData(latestParserBlockId)
  }

  return {
    live:
      maxBlockSize > 0
        ? {
            load: blockSize / maxBlockSize,
            tps: txCount / ((lastSlot - firstSlot + 1) * networkParams.slotLength),
          }
        : undefined,
    txAmount,
    tokenTxCount,
    blockSize,
    blocksWithTxs,
    nonParsedBlocks,
  }
}

const loadData = async () => {
  const {
    rows: [dataRow],
  } = await query(
    `
    WITH bl AS (
      SELECT min(size) AS min_block_size, max(size) AS max_block_size
      FROM block
      WHERE block_no IS NOT NULL
    ), ep AS (
      SELECT MIN(e.blk_count) FILTER (WHERE e.no < $1) AS min_block, MAX(e.blk_count) AS max_block, SUM(e.blk_count) AS total_block, MAX(e.blk_count) FILTER (WHERE e.no = $1) AS live_block, MIN(e.tx_count) FILTER (WHERE e.no < $1) AS min_tx, MAX(e.tx_count) AS max_tx, SUM(e.tx_count) AS total_tx, MAX(e.tx_count) FILTER (WHERE e.no = $1) AS live_tx, SUM(e.fees) AS fees_sum, SUM(e.out_sum) AS out_sum_sum, SUM(ae.tx_amount) AS tx_amount_sum, SUM(ae.block_with_tx) AS total_block_with_tx, SUM(ae.token_tx) AS total_token_tx
      FROM epoch AS e
      LEFT JOIN adastat_epoch AS ae ON ae.no = e.no
    ), ae AS (
      SELECT no AS latest_parsed_epoch_no, circulating_supply, account, account_with_stake, delegator, delegator_with_stake, stake, byron, byron_with_amount, byron_amount, token, token_policy, token_holder, pool, pool_with_stake, pool_register, pool_retire, blockchain_size, holder_range
      FROM adastat_epoch
      ORDER BY no DESC
      LIMIT 1
    )
    SELECT *,
      (SELECT COUNT(*) FROM adastat_pool WHERE block > 0) AS pool_with_block,
      (SELECT MIN(no) FROM epoch WHERE blk_count = ep.min_block) AS min_block_epoch,
      (SELECT MIN(no) FROM epoch WHERE blk_count = ep.max_block) AS max_block_epoch,
      (SELECT MIN(no) FROM epoch WHERE tx_count = ep.min_tx) AS min_tx_epoch,
      (SELECT MIN(no) FROM epoch WHERE tx_count = ep.max_tx) AS max_tx_epoch,
      (SELECT MAX(id) FROM adastat_block) AS latest_parsed_block_id
    FROM ep
    LEFT JOIN bl ON true
    LEFT JOIN ae ON true
  `,
    [latestBlock.epoch_no]
  )

  if (dataRow) {
    const {
      txAmount = 0n,
      tokenTxCount = 0,
      blockSize = 0,
      blocksWithTxs = 0,
      nonParsedBlocks,
      live,
    } = dataRow.latest_parsed_block_id ? await getLiveData(dataRow.latest_parsed_block_id) : {}

    if (dataRow.latest_parsed_epoch_no > data.latestParsedEpoch) {
      const { rows: epochRows } = await query(
        `
        SELECT DISTINCT ON (e.no) e.no, b.first_block_id, b.first_tx_block_id, b.first_slot_no, b.first_tx_slot_no, b.first_epoch_slot_no, b.first_tx_epoch_slot_no, tx.id AS first_tx_id
        FROM epoch AS e
        LEFT JOIN (
          SELECT epoch_no, MIN(id) AS first_block_id, MIN(id) FILTER (WHERE tx_count > 0) AS first_tx_block_id, MIN(slot_no) AS first_slot_no, MIN(slot_no) FILTER (WHERE tx_count > 0) AS first_tx_slot_no, MIN(epoch_slot_no) AS first_epoch_slot_no, MIN(epoch_slot_no) FILTER (WHERE tx_count > 0) AS first_tx_epoch_slot_no
          FROM block
          WHERE epoch_no > $1
          GROUP BY epoch_no
        ) AS b ON b.epoch_no = e.no
        LEFT JOIN tx ON tx.block_id = b.first_tx_block_id
        WHERE e.no > $1
        ORDER BY e.no ASC, tx.id ASC
      `,
        [data.latestParsedEpoch]
      )

      for (const epochRow of epochRows) {
        data.epochs.set(epochRow.no, {
          no: epochRow.no,
          firstBlockId: epochRow.first_block_id,
          firstTxBlockId: epochRow.first_tx_block_id,
          firstSlotNo: epochRow.first_slot_no,
          firstTxSlotNo: epochRow.first_tx_slot_no,
          firstEpochSlotNo: epochRow.first_epoch_slot_no,
          firstTxEpochSlotNo: epochRow.first_tx_epoch_slot_no,
          firstTxId: epochRow.first_tx_id,
        })
      }

      const {
        rows: [poolRow],
      } = await query(
        `
        SELECT SUM(pool_reward) AS pool_reward, SUM(delegator_reward) AS delegator_reward, SUM(orphaned_reward) AS orphaned_reward, COUNT(*) FILTER (WHERE r.id IS NOT NULL) AS pool_retired
        FROM adastat_pool AS p
        LEFT JOIN pool_retire AS r ON r.id = p.retirement_id AND r.retiring_epoch <= $1
        `,
        [dataRow.latest_parsed_epoch_no]
      )

      if (poolRow) {
        data.totalPoolFees = BigInt(poolRow.pool_reward)
        data.totalDelegatorRewards = BigInt(poolRow.delegator_reward)
        data.totalOrphanedRewards = BigInt(poolRow.orphaned_reward)
        data.totalRetiredPools = Number(poolRow.pool_retired)
      }

      const {
        rows: [accountRow],
      } = await query(`
        SELECT COUNT(*) AS rewarded_account
        FROM adastat_account
        WHERE total_reward > 0
      `)

      if (accountRow) {
        data.totalRewardedAccounts = Number(accountRow.rewarded_account)
      }

      const { rows: spRows } = await query(
        `
        SELECT floor(($2 - ada_pots.reserves) / epoch_param.optimal_pool_count) AS saturation_point
        FROM ada_pots
        LEFT JOIN epoch_param ON epoch_param.epoch_no = ada_pots.epoch_no
        WHERE ada_pots.epoch_no >= $1
        ORDER BY ada_pots.epoch_no DESC
        LIMIT 3
      `,
        [dataRow.latest_parsed_epoch_no - 2, networkParams.totalSupply]
      )

      if (spRows.length === 3) {
        data.liveSaturationPoint = BigInt(spRows[0]!.saturation_point)
        data.activeSaturationPoint = BigInt(spRows[2]!.saturation_point)
      }

      const { rows: latestEpochRows } = await query(
        `
        SELECT e.no, ae.tx_amount, e.tx_count AS tx, ae.circulating_supply AS supply, ae.stake, ae.account_with_stake + ae.byron_with_amount AS holders, ae.pool AS pools
        FROM adastat_epoch AS ae
        LEFT JOIN epoch AS e ON e.no = ae.no
        WHERE ae.no < $1
        ORDER BY ae.no DESC
        LIMIT 24
      `,
        [dataRow.latest_parsed_epoch_no]
      )

      data.latestEpochsData = latestEpochRows

      await setPoolAprMap(prevEpochNo)
    }

    data.minEpochBlocks = Number(dataRow.min_block)
    data.maxEpochBlocks = Number(dataRow.max_block)
    data.totalBlocks = Number(dataRow.total_block) + 1 // Genesis
    data.minEpochTxs = Number(dataRow.min_tx)
    data.maxEpochTxs = Number(dataRow.max_tx)
    data.totalTxs = Number(dataRow.total_tx) + networkParams.genesisTxs
    data.totalTxFees = BigInt(dataRow.fees_sum)
    data.totalTxOutSum = BigInt(dataRow.out_sum_sum)
    data.totalTxAmount = BigInt(dataRow.tx_amount_sum) + txAmount
    data.totalBlocksWithTxs = Number(dataRow.total_block_with_tx) + blocksWithTxs
    data.totalTokenTxs = Number(dataRow.total_token_tx) + tokenTxCount
    data.minBlockSize = Number(dataRow.min_block_size)
    data.maxBlockSize = Number(dataRow.max_block_size)
    data.totalBlockSize = Number(dataRow.blockchain_size) + blockSize
    data.latestParsedEpoch = Number(dataRow.latest_parsed_epoch_no)
    data.account = BigInt(dataRow.account)
    data.holder = BigInt(dataRow.account_with_stake)
    data.delegator = BigInt(dataRow.delegator)
    data.stakeHolder = BigInt(dataRow.delegator_with_stake)
    data.stake = BigInt(dataRow.stake)
    data.byron = BigInt(dataRow.byron)
    data.byronHolder = BigInt(dataRow.byron_with_amount)
    data.byronAmount = BigInt(dataRow.byron_amount)
    data.circulatingSupply = BigInt(dataRow.circulating_supply)
    data.holderRange = dataRow.holder_range
    data.token = BigInt(dataRow.token)
    data.tokenPolicy = BigInt(dataRow.token_policy)
    data.tokenHolder = BigInt(dataRow.token_holder)
    data.pool = Number(dataRow.pool)
    data.stakePool = Number(dataRow.pool_with_stake)
    data.blockProducer = Number(dataRow.pool_with_block)
    data.newPool = Number(dataRow.pool_register)
    data.retiredPool = Number(dataRow.pool_retire)
    data.minBlocksEpoch = Number(dataRow.min_block_epoch)
    data.maxBlocksEpoch = Number(dataRow.max_block_epoch)
    data.minTxsEpoch = Number(dataRow.min_tx_epoch)
    data.maxTxsEpoch = Number(dataRow.max_tx_epoch)

    data.avgBlocksPerEpoch = Math.round((data.totalBlocks - Number(dataRow.live_block)) / latestBlock.epoch_no)
    data.avgTxsPerEpoch = Math.round((data.totalTxs - Number(dataRow.live_tx)) / latestBlock.epoch_no)

    if (nonParsedBlocks) {
      data.nonParsedBlocks = nonParsedBlocks
    }

    if (live) {
      data.liveLoad = live.load
      data.liveTPS = live.tps
    }
  }

  if (latestBlock.block_no % 100 === 0) {
    void loadHolderRange()
  }

}

const loadExchangeRates = async () => {
  const { rows: ExchangeRateRows } = await query<AdaStatCurrencyPriceTable>(
    `SELECT currency, price FROM adastat_currency_price`
  )

  for (const { currency, price } of ExchangeRateRows) {
    if (currency in exchangeRate) {
      exchangeRate[currency as Currency] = price
    }
  }
}

export const getData = async () => {
  if (queueHandling) {
    await queueHandling
  }

  return data
}

export const getTip = (currency?: Currency) => ({
  epoch_no: latestBlock.epoch_no,
  slot_no: latestBlock.slot_no,
  epoch_slot_no: latestBlock.epoch_slot_no,
  block_no: latestBlock.block_no,
  block_hash: latestBlock.block_hash,
  ...(currency
    ? {
        exchange_rate: exchangeRate[currency],
        circulating_supply: data.circulatingSupply,
      }
    : undefined),
})

export const handleQueue = async (block: Block) => {
  if (
    block.block_no > latestBlock.block_no ||
    (block.block_no === latestBlock.block_no && block.block_hash !== latestBlock.block_hash)
  ) {
    Object.assign(latestBlock, block)

    logger.info('New block %d', block.block_no)
  }

  if (!queueHandling) {
    logger.debug('handleQueue start')

    void loadExchangeRates()

    queueHandling = loadData()

    await queueHandling

    clearCache()

    queueHandling = null

    logger.debug('handleQueue end')

    return true
  }

  return false
}

export const init = async () => {
  const {
    rows: [metaRow],
  } = await query<Pick<MetaTable, 'network_name'> & { start_time: number }>(`
    SELECT network_name, EXTRACT(EPOCH FROM start_time)::int AS start_time
    FROM meta
    ORDER BY id ASC
    LIMIT 1
  `)

  const { rows: blockRows } = await query<Pick<BlockTable, 'block_no' | 'tx_count'> & { hash: HexString }>(`
    SELECT block_no, tx_count, encode(hash, 'hex') AS hash
    FROM block
    WHERE (epoch_no IS NULL AND block_no IS NULL) OR block_no IS NOT NULL
    ORDER BY id ASC
    LIMIT 2
  `)

  const {
    rows: [txRow],
  } = await query<{ hash: HexString }>(`
    SELECT encode(hash, 'hex') AS hash
    FROM tx
    ORDER BY id ASC
    LIMIT 1
  `)

  if (metaRow && txRow && blockRows.length === 2) {
    loadNetworkEnv(
      metaRow.network_name,
      metaRow.start_time,
      blockRows[0]!.hash,
      blockRows[0]!.tx_count,
      blockRows[1]!.block_no!,
      txRow.hash
    )

    if (!networkParams.name) {
      throw new Error(`Config .env.${metaRow.network_name} error`)
    }
  } else {
    throw new Error('No meta / blocks')
  }

  const {
    rows: [latestBlockRow],
  } = await query<Block>(`
    SELECT block_no, encode(hash, 'hex') AS block_hash, epoch_no, slot_no::int, epoch_slot_no, size AS block_size, tx_count::int, slot_leader_id::int
    FROM block
    ORDER BY id DESC
    LIMIT 1
  `)

  if (latestBlockRow) {
    Object.assign(latestBlock, latestBlockRow)
  }

  await loadExchangeRates()

  await loadData()

  await loadHolderRange()
}
