import { rootDir } from '@/config.ts'
import { query } from '@/db.ts'
import { fetchBytes } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { latestBlock } from '@/storage.ts'
import type { HexString } from '@/types/shared.js'
import type { BlockTable, DrepDistrTable, DrepHashTable, VotingProcedureTable } from '@/types/tables.ts'
import { initials } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

export type Delegation = {
  hash_id: bigint
  tx_id: bigint
  cert_index: number
  prev_hash_id: bigint | null
}

export type Drep = {
  id: bigint
  delegators: Map<bigint, Delegation>
  delegator: number
  live_stake: bigint
  tx_id: bigint
  cert_index: number
  deposit: bigint
  last_tx_id: bigint
  voting_anchor_id: bigint
  registered: boolean | null
  last_active_epoch: number | null
  base16: HexString | null
  has_script: boolean
  bech32: string
  bech32_legacy: string
  given_name: string | null
  image: string | null
  active: boolean | null
}

type AutoDrepId = 'drep_always_abstain' | 'drep_always_no_confidence'

let latestDrepRegistrationId = 0,
  latestVoteId = 0n,
  latestDelegationTxId = 0n,
  currentEpoch = -1,
  lastCheckTime = 0,
  loading: Promise<void> | null = null

export const totalData = {
  dreps: 0,
  delegators: 0,
  liveStake: 0n,
  activeDReps: 0,
  inactiveStake: 0n,
  alwaysAbstainStake: 0n,
  alwaysNoConfidenceStake: 0n,
}

export const delegations = new Map<bigint, Delegation>()

export const dreps = new Map<bigint, Drep>()

export const autoDreps = new Map<AutoDrepId, Drep>()

export const idValues: bigint[] = []

export const txIdValues: bigint[] = []

export const votingAnchorIdValues: bigint[] = []

export const delegatorValues: number[] = []

export const stakeValues: bigint[] = []

export const activeValues: (boolean | null)[] = []

const logoDir = process.env.POOL_LOGO_DIR || join(rootDir, 'images', 'dreps')

const logoCache = new Map<
  bigint,
  {
    updateId: bigint
    time: number
  }
>()

const cacheTime = 60 * 60 * 1000 // 1 hour

const saveLogo = async (drepId: string, data: Buffer) => {
  await mkdir(logoDir, { recursive: true })

  await writeFile(join(logoDir, drepId + '.webp'), data, 'binary')
}

export const getLogo = async (drepId: string) => {
  try {
    return await readFile(join(logoDir, drepId + '.webp'))
  } catch (err) {
    if ((err as any)?.code !== 'ENOENT') {
      logger.error(err)
    }
  }
}

export const fetchLogo = async function (
  drepId: string,
  image?: string,
  updateParams?: { drepId: bigint; updateId: bigint }
) {
  if (updateParams) {
    const nowTime = Date.now(),
      cacheEntry = logoCache.get(updateParams.drepId)

    if (cacheEntry) {
      if (cacheEntry.updateId >= updateParams.updateId && cacheEntry.time + cacheTime >= nowTime) {
        return
      }
    }

    logoCache.set(updateParams.drepId, {
      updateId: updateParams.updateId,
      time: nowTime,
    })
  }

  let logoUrl = image?.trim()

  if (logoUrl) {
    if (logoUrl.startsWith('https://github.com/')) {
      logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'raw=true'
    }

    const bytes = await fetchBytes(logoUrl, 5 * 1024 * 1024, 10)

    if (bytes) {
      try {
        const imageBuffer = await sharp(bytes, { limitInputPixels: 50_000_000 })
          .resize({ width: 128, height: 128, fit: 'inside', withoutEnlargement: true })
          .webp()
          .toBuffer()

        void saveLogo(drepId, imageBuffer)

        return imageBuffer
      } catch (err) {
        logger.error(err, `DRep ${drepId} logo error`)
      }
    }
  }

  return false
}

export const createLogo = async (drepId: string, name?: string) => {
  try {
    const avatar = createAvatar(initials, {
      seed: name || drepId,
      size: 128,
    })

    const imageBuffer = await sharp(Buffer.from(avatar.toString())).webp().toBuffer()

    void saveLogo(drepId, imageBuffer)

    return imageBuffer
  } catch (err) {
    logger.error(err, `DRep ${drepId} avatar error`)
  }
}

const loadData = async () => {
  logger.trace('DReps loadData start')

  if (!autoDreps.size) {
    const { rows: autoDrepRows } = await query<Pick<DrepHashTable, 'id' | 'view' | 'has_script'>>(`
      SELECT id, view, has_script
      FROM drep_hash
      WHERE raw IS NULL
    `)

    for (const row of autoDrepRows) {
      const drep: Drep = {
        id: row.id,
        delegators: new Map(),
        delegator: 0,
        live_stake: 0n,
        tx_id: 0n,
        cert_index: 0,
        deposit: 0n,
        last_tx_id: 0n,
        voting_anchor_id: 0n,
        registered: null,
        last_active_epoch: Number.MAX_SAFE_INTEGER,
        base16: null,
        has_script: row.has_script,
        bech32: row.view,
        bech32_legacy: row.view,
        given_name: null,
        image: null,
        active: null,
      }

      dreps.set(row.id, drep)
      autoDreps.set(row.view as AutoDrepId, drep)
    }
  }

  const { rows: drepRegRows } = await query(
    `
    SELECT dr.id, dr.drep_hash_id, dr.deposit, dr.tx_id, dr.cert_index, dr.voting_anchor_id, off_chain_vote_drep_data.id AS drep_data_id, off_chain_vote_drep_data.given_name, COALESCE(off_chain_vote_data.json->'body'->'image'->>'contentUrl', off_chain_vote_drep_data.image_url) AS image, (22 + dh.has_script::int) || encode(dh.raw, 'hex') AS base16, dh.has_script, cardano.bech32_encode('drep', ('\\x2' || 2 + dh.has_script::int)::bytea || dh.raw) AS bech32, CASE WHEN dh.has_script THEN cardano.bech32_encode('drep_script', dh.raw) ELSE dh.view END AS bech32_legacy, block.epoch_no + 20 AS active_until
    FROM drep_registration AS dr
    LEFT JOIN drep_hash AS dh ON dh.id = dr.drep_hash_id
    LEFT JOIN off_chain_vote_data ON off_chain_vote_data.voting_anchor_id = dr.voting_anchor_id
    LEFT JOIN off_chain_vote_drep_data ON off_chain_vote_drep_data.off_chain_vote_data_id = off_chain_vote_data.id
    LEFT JOIN tx ON tx.id = dr.tx_id
    LEFT JOIN block ON block.id = tx.block_id
    WHERE dr.id > $1
    ORDER BY dr.id ASC
  `,
    [latestDrepRegistrationId]
  )

  logger.trace('DReps loadData drepRegRows %s', drepRegRows.length)

  for (const row of drepRegRows) {
    const drep: Drep = dreps.get(row.drep_hash_id) || {
      id: row.id,
      delegators: new Map(),
      delegator: 0,
      live_stake: 0n,
      tx_id: 0n,
      cert_index: 0,
      deposit: 0n,
      last_tx_id: 0n,
      voting_anchor_id: 0n,
      registered: null,
      last_active_epoch: null,
      base16: row.base16,
      has_script: row.has_script,
      bech32: row.bech32,
      bech32_legacy: row.bech32_legacy,
      given_name: null,
      image: null,
      active: null,
    }

    if (!dreps.has(row.drep_hash_id)) {
      dreps.set(row.drep_hash_id, drep)
    }

    if (row.deposit === null) {
      // update
      if (row.active_until > drep.last_active_epoch!) {
        drep.last_active_epoch = row.active_until
      }
    } else if (row.deposit > 0) {
      // registration
      drep.deposit = row.deposit
      drep.tx_id = row.tx_id
      drep.cert_index = row.cert_index
      drep.registered = true
      if (row.active_until > drep.last_active_epoch!) {
        drep.last_active_epoch = row.active_until
      }
    } else {
      // deregistration
      drep.deposit = 0n
      drep.registered = false
      drep.last_active_epoch = null
    }

    drep.last_tx_id = row.tx_id

    if (row.drep_data_id) {
      if (row.image === '') {
        row.image = null
      }

      drep.voting_anchor_id = row.voting_anchor_id
      drep.given_name = row.given_name
      drep.image = row.image
    }

    latestDrepRegistrationId = row.id
  }

  if (latestBlock.epoch_no > currentEpoch) {
    const { rows: drepDistRows } = await query<Pick<DrepDistrTable, 'hash_id' | 'active_until'>>(
      `
      SELECT hash_id, active_until
      FROM drep_distr
      WHERE epoch_no = $1
    `,
      [latestBlock.epoch_no]
    )

    logger.trace('DReps loadData drepDistRows %s', drepDistRows.length)

    if (drepDistRows.length) {
      currentEpoch = latestBlock.epoch_no

      for (const { hash_id, active_until } of drepDistRows) {
        const drep = dreps.get(hash_id)
        if (drep?.registered && active_until! > drep.last_active_epoch!) {
          drep.last_active_epoch = active_until
        }
      }
    }
  }

  const { rows: vpRows } = await query<{
    id: VotingProcedureTable['id']
    hash_id: NonNullable<VotingProcedureTable['drep_voter']>
    active_until: NonNullable<BlockTable['epoch_no']>
  }>(
    `
    SELECT vp.id, vp.drep_voter AS hash_id, b.epoch_no + 20 AS active_until
    FROM voting_procedure AS vp
    LEFT JOIN tx ON tx.id = vp.tx_id
    LEFT JOIN block AS b ON b.id = tx.block_id
    WHERE vp.id > $1 AND vp.voter_role = 'DRep'
    ORDER BY vp.id ASC
  `,
    [latestVoteId]
  )

  logger.trace('DReps loadData vpRows %s', vpRows.length)

  for (const { id, hash_id, active_until } of vpRows) {
    const drep = dreps.get(hash_id)
    if (drep?.registered && active_until > drep.last_active_epoch!) {
      drep.last_active_epoch = active_until
    }

    latestVoteId = id
  }

  const { rows: delegRows } = await query<{ addr_id: bigint; drep_hash_id: bigint; tx_id: bigint; cert_index: number }>(
    `
    (
      SELECT addr_id, drep_hash_id, tx_id, cert_index
      FROM delegation_vote
      WHERE tx_id > $1
    ) UNION ALL (
      SELECT addr_id, 0 AS drep_hash_id, tx_id, cert_index
      FROM stake_deregistration
      WHERE tx_id > $1
    )
    ORDER BY tx_id ASC, cert_index ASC
  `,
    [latestDelegationTxId]
  )

  logger.trace('DReps loadData delegRows %s', delegRows.length)

  for (const { addr_id, drep_hash_id, tx_id, cert_index } of delegRows) {
    const oldDelegation = delegations.get(addr_id)

    if (oldDelegation?.hash_id) {
      dreps.get(oldDelegation.hash_id)?.delegators.delete(addr_id)
    }

    const drep = drep_hash_id ? dreps.get(drep_hash_id) : undefined

    if (drep) {
      const delegation = {
        hash_id: drep_hash_id,
        tx_id: tx_id,
        cert_index: cert_index,
        prev_hash_id: oldDelegation?.hash_id ?? 0n,
      }
      delegations.set(addr_id, delegation)

      drep.delegators.set(addr_id, delegation)
    } else {
      delegations.delete(addr_id)
    }

    latestDelegationTxId = tx_id
  }

  const now = Date.now()

  if (delegRows.length || now - lastCheckTime > 3 * 60 * 1000) {
    lastCheckTime = now

    const addrIdValues: bigint[] = [],
      hashIdValues: bigint[] = []

    for (const [addr_id, data] of delegations.entries()) {
      const drep = dreps.get(data.hash_id)!

      if (data.tx_id > drep.tx_id || (data.tx_id === drep.tx_id && data.cert_index > drep.cert_index)) {
        addrIdValues.push(addr_id)
        hashIdValues.push(data.hash_id)
      }
    }

    const { rows: accountRows } = await query<{ drep_hash_id: bigint; delegator: number; live_stake: `${number}` }>(
      `
      WITH deposit AS (
        SELECT return_address, SUM(deposit) AS amount
        FROM gov_action_proposal AS gap
        WHERE gap.dropped_epoch IS NULL AND gap.enacted_epoch IS NULL
        GROUP BY return_address
      )
      SELECT rows.drep_hash_id, COUNT(*)::int AS delegator, SUM(a.amount + COALESCE(deposit.amount, 0)) AS live_stake
      FROM unnest($1::bigint[], $2::bigint[]) AS rows (addr_id, drep_hash_id)
      LEFT JOIN adastat_account AS a ON a.id = rows.addr_id
      LEFT JOIN deposit ON deposit.return_address = rows.addr_id
      WHERE rows.drep_hash_id > 0
      GROUP BY rows.drep_hash_id
    `,
      [addrIdValues, hashIdValues]
    )

    logger.trace('DReps loadData accountRows %s', accountRows.length)

    const delegatorStakeMap = new Map<
      bigint,
      {
        delegator: number
        live_stake: bigint
      }
    >()
    for (const row of accountRows) {
      delegatorStakeMap.set(row.drep_hash_id, {
        delegator: row.delegator,
        live_stake: BigInt(row.live_stake),
      })
    }

    totalData.dreps = 0
    totalData.delegators = 0
    totalData.liveStake = 0n
    totalData.activeDReps = 0
    totalData.inactiveStake = 0n
    totalData.alwaysAbstainStake = 0n
    totalData.alwaysNoConfidenceStake = 0n

    idValues.length = 0
    txIdValues.length = 0
    votingAnchorIdValues.length = 0
    delegatorValues.length = 0
    stakeValues.length = 0
    activeValues.length = 0

    for (const [drepHashId, drep] of dreps.entries()) {
      const delegatorStake = delegatorStakeMap.get(drepHashId)

      drep.delegator = delegatorStake?.delegator ?? 0
      drep.live_stake = delegatorStake?.live_stake ?? 0n

      if (drep.registered === false) {
        drep.active = null
      } else {
        drep.active = drep.last_active_epoch! >= latestBlock.epoch_no

        totalData.dreps++
        totalData.delegators += drep.delegator
        totalData.liveStake += drep.live_stake

        if (drep.active) {
          if (drep.bech32 === 'drep_always_abstain') {
            totalData.alwaysAbstainStake = drep.live_stake
          } else if (drep.bech32 === 'drep_always_no_confidence') {
            totalData.alwaysNoConfidenceStake = drep.live_stake
          }

          totalData.activeDReps++
        } else {
          totalData.inactiveStake += drep.live_stake
        }
      }

      idValues.push(drepHashId)
      txIdValues.push(drep.tx_id)
      votingAnchorIdValues.push(drep.voting_anchor_id)
      delegatorValues.push(drep.delegator)
      stakeValues.push(drep.live_stake)
      activeValues.push(drep.active)
    }
  }

  logger.trace('DReps loadData end')
}

export const init = async () => {
  if (!loading) {
    loading = loadData()
  }

  try {
    await loading
  } catch (err) {
    logger.error(err, 'DReps error')
  }

  loading = null
}
