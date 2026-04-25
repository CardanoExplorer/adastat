import { networkParams } from '@/config.ts'
import { query } from '@/db.ts'
import { toBech32 } from '@/helper.ts'
import { dreps as drepsData } from '@/helpers/dreps.ts'
import { govActions } from '@/helpers/gov-actions.ts'
import { find as findRegistryToken } from '@/helpers/tokens.ts'
import { getData, latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'
import { bech32 } from 'bech32'
import punycode from 'punycode'

export const getSearch = async (queryStr: string) => {
  const queryLower = queryStr.toLowerCase(),
    storageData = await getData()

  let epochs: any[] = [],
    blocks: any[] = [],
    orphan_blocks: any[] = [],
    transactions: any[] = [],
    accounts: any[] = [],
    addresses: any[] = [],
    tokens: any[] = [],
    policies: any[] = [],
    pools: any[] = [],
    dreps: any[] = [],
    gov_actions: any[] = [],
    drepHash,
    govActionHash

  const uniqueAccounts: any = {},
    intQuery = parseInt(queryLower),
    isInt = intQuery >= 0 && queryLower === intQuery.toString(),
    isHex = /^[0-9A-Fa-f]+$/.test(queryLower),
    isEven = queryLower.length % 2 === 0,
    isPolicyDotName =
      queryLower.length > 57 &&
      queryLower.length <= 121 &&
      queryLower[56] === '.' &&
      /^[0-9A-Fa-f]+$/.test(queryLower.slice(0, 56)),
    isTxHashIdx = queryLower.length > 65 && queryLower[64] === '#' && /^[0-9A-Fa-f]+$/.test(queryLower.slice(0, 64))

  if (queryLower.slice(0, 4) === 'drep') {
    try {
      const hash = Buffer.from(bech32.fromWords(bech32.decode(queryLower, 128).words)).toString('hex')
      if (hash.length === 56) {
        drepHash = ['\\x' + hash, queryLower.slice(0, 11) === 'drep_script']
      } else if (hash.length === 58) {
        const hashPrefix = hash.slice(0, 2)
        if (hashPrefix === '22' || hashPrefix === '23') {
          drepHash = ['\\x' + hash.slice(2), hashPrefix === '23']
        }
      }
    } catch {}
  } else if (queryLower.slice(0, 10) === 'gov_action') {
    try {
      const hash = Buffer.from(bech32.fromWords(bech32.decode(queryLower, 128).words)).toString('hex')
      govActionHash = ['\\x' + hash.slice(0, 64), parseInt(hash.slice(64), 16)]
    } catch {}
  }

  if (queryLower.length >= 56 && (isHex || isPolicyDotName || drepHash || govActionHash || isTxHashIdx)) {
    let addr,
      tokenWhere = ''

    const tokenValues: string[] = [],
      hashPrefix = queryLower.slice(0, 2)

    if (isHex && isEven && queryLower.length >= 58) {
      if (networkParams.isMainnet) {
        if (hashPrefix !== 'e1' && hashPrefix !== 'f1') {
          addr = toBech32('addr', queryLower)
        }
      } else {
        if (hashPrefix !== 'e0' && hashPrefix !== 'f0') {
          addr = toBech32('addr_test', queryLower)
        }
      }
    }

    if (isHex && queryLower.length === 58 && (hashPrefix === '22' || hashPrefix === '23')) {
      drepHash = ['\\x' + queryLower.slice(2), hashPrefix === '23']
    } else if (isHex && queryLower.length === 56) {
      drepHash = ['\\x' + queryLower]
    }

    if (isHex && queryLower.length === 66) {
      govActionHash = ['\\x' + queryLower.slice(0, 64), parseInt(queryLower.slice(64), 16)]
    } else if (isTxHashIdx) {
      const tail = queryLower.slice(65),
        idx = parseInt(tail)

      if (idx >= 0 && idx <= 255 && idx.toString() === tail) {
        govActionHash = ['\\x' + queryLower.slice(0, 64), idx]
      }
    }

    if ((isHex && isEven && queryLower.length <= 120) || isPolicyDotName) {
      const tokenPolicy = queryLower.slice(0, 56),
        tokenName = queryLower.slice(isPolicyDotName ? 57 : 56)

      if (isPolicyDotName) {
        if (tokenName.length % 2 === 0 && /^[0-9A-Fa-f]*$/.test(tokenName)) {
          tokenValues.push('\\x' + tokenPolicy, '\\x' + tokenName, tokenName.toLowerCase())

          tokenWhere = `(m.policy = $1 AND (m.name = $2 OR LOWER(ENCODE(m.name, 'escape')) = $3 COLLATE "C"))`
        } else {
          tokenValues.push('\\x' + tokenPolicy, tokenName.toLowerCase())

          tokenWhere = `(m.policy = $1 AND LOWER(ENCODE(m.name, 'escape')) = $2 COLLATE "C")`
        }
      } else {
        tokenValues.push('\\x' + tokenPolicy, '\\x' + tokenName)

        tokenWhere = '(m.policy = $1 AND m.name = $2)'
      }

      if (isHex && isEven && tokenName.length <= 8) {
        tokenValues.push('\\x' + tokenPolicy + tokenName)
        tokenWhere += ` OR (LOWER(ENCODE(m.name, 'escape')) = LOWER(ENCODE($${tokenValues.length}, 'escape')) COLLATE "C" AND m.name = $${tokenValues.length})`
      }
    }

    const [block, orphan_block, transaction, token, pool, account, policy, address, drep, gov_action] =
      await Promise.all([
        isHex && queryLower.length === 64
          ? query(
              `
        SELECT COALESCE(b.block_no, 0) AS no, encode(b.hash::bytea, 'hex') AS hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, COALESCE(ap.name, sl.description) AS pool_name, ap.ticker AS pool_ticker
        FROM block AS b
        LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        WHERE b.hash = $1
      `,
              ['\\x' + queryLower]
            )
          : { rows: [] },
        isHex && queryLower.length === 64
          ? query(
              `
        SELECT encode(o.hash::bytea, 'hex') AS orphan_hash, o.epoch_no AS orphan_epoch_no, o.epoch_slot_no AS orphan_epoch_slot_no, o.block_no AS orphan_no, o.slot_no::integer AS orphan_slot_no, EXTRACT(epoch FROM o.time)::integer AS orphan_time, encode(b.hash::bytea, 'hex') AS hash, b.epoch_no, b.epoch_slot_no, b.block_no AS no, b.slot_no::integer, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph_o.hash_raw::bytea, 'hex') AS orphan_pool_hash, ph_o.view AS orphan_pool_bech32, ap_o.name AS orphan_pool_name, ap_o.ticker AS orphan_pool_ticker, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker
        FROM adastat_block_orphan AS o
        LEFT JOIN slot_leader AS sl_o ON sl_o.id = o.slot_leader_id
        LEFT JOIN pool_hash AS ph_o ON ph_o.id = sl_o.pool_hash_id
        LEFT JOIN adastat_pool AS ap_o ON ap_o.id = ph_o.id
        LEFT JOIN block AS b ON (b.block_no = o.block_no AND (b.slot_leader_id <> o.slot_leader_id OR b.hash <> o.hash))
        LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        WHERE o.hash = $1 AND b.block_no IS NOT NULL
      `,
              ['\\x' + queryLower]
            )
          : { rows: [] },
        isHex && queryLower.length === 64
          ? query(
              `
        SELECT encode(tx.hash::bytea, 'hex') AS hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, at.amount, tx.fee, encode(b.hash::bytea, 'hex') AS block_hash, b.block_no, tx.id
        FROM tx
        LEFT JOIN adastat_tx AS at ON at.id = tx.id
        LEFT JOIN block AS b ON b.id = tx.block_id
        WHERE tx.hash = $1
      `,
              ['\\x' + queryLower]
            )
          : { rows: [] },
        tokenWhere.length
          ? query(
              `
        SELECT encode(m.policy::bytea, 'hex') AS policy, convert_asset_name(m.name) AS asset_name, encode(m.name::bytea, 'hex') AS asset_name_hex, m.fingerprint, am.supply, am.holder::int, am.tx::int, md.json AS meta_data
        FROM adastat_multi_asset AS am
        LEFT JOIN multi_asset AS m ON m.id = am.id
        LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
        WHERE ${tokenWhere}
      `,
              tokenValues
            )
          : { rows: [] },
        isHex && queryLower.length === 56
          ? query(
              `
        SELECT encode(ph.hash_raw::bytea, 'hex') AS hash, ph.view AS bech32, p.name AS name, p.ticker AS ticker, p.itn_ticker > 0 AS itn, ep_l.stake AS live_stake, ep_l.delegator, COALESCE(ep_l.real_pledge, 0)::numeric AS owner_stake, COALESCE(pu_l.pledge, pu_u.pledge) AS pledge, pu_l.margin::numeric AS margin, pu_l.fixed_cost AS fixed_cost, p.impersonator > 0 AS impersonator, 8192 - (p.impersonator > 0)::int * 32768 AS score
        FROM adastat_pool AS p
        LEFT JOIN pool_hash AS ph ON ph.id = p.id
        LEFT JOIN pool_retire AS pr ON pr.id = p.retirement_id
        LEFT JOIN adastat_epoch_pool AS ep_l ON (ep_l.epoch_no = $2 AND ep_l.pool_id = p.id)
        LEFT JOIN pool_update AS pu_l ON pu_l.id = ep_l.update_id
        LEFT JOIN pool_update AS pu_u ON pu_u.id = p.update_id
        WHERE ph.hash_raw = $1
      `,
              ['\\x' + queryLower, latestBlock.epoch_no]
            )
          : { rows: [] },

        isHex &&
        queryLower.length === 58 &&
        (networkParams.isMainnet
          ? hashPrefix === 'e1' || hashPrefix === 'f1'
          : hashPrefix === 'e0' || hashPrefix === 'f0')
          ? query(
              `
        SELECT encode(s.hash_raw::bytea, 'hex') AS base16, s.view AS bech32, a.amount AS balance, a.reward AS reward_amount, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker
        FROM adastat_account AS a
        LEFT JOIN stake_address AS s ON s.id = a.id
        LEFT JOIN pool_hash AS ph ON ph.id = a.pool
        LEFT JOIN adastat_pool AS p ON p.id = a.pool
        WHERE s.hash_raw = $1
      `,
              ['\\x' + queryLower]
            )
          : { rows: [] },
        isHex && queryLower.length === 56
          ? query(
              `
        SELECT encode(p.policy::bytea, 'hex') AS hash, p.token::int, p.tx::int, p.holder::int, encode(ft.hash::bytea, 'hex') AS first_tx_hash, EXTRACT(epoch FROM fb.time)::integer AS first_tx_time, encode(lt.hash::bytea, 'hex') AS last_tx_hash, EXTRACT(epoch FROM lb.time)::integer AS last_tx_time
        FROM adastat_ma_policy AS p
        LEFT JOIN tx AS ft ON ft.id = p.first_tx
        LEFT JOIN block AS fb ON fb.id = ft.block_id
        LEFT JOIN tx AS lt ON lt.id = p.last_tx
        LEFT JOIN block AS lb ON lb.id = lt.block_id
        WHERE p.policy = $1
      `,
              ['\\x' + queryLower]
            )
          : { rows: [] },
        addr
          ? query(
              `
        SELECT a.address, a.amount AS balance, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, ac.amount AS account_balance, ac.reward AS account_reward_amount, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker
        FROM adastat_address AS a
        LEFT JOIN stake_address AS sa ON sa.id = a.account_id
        LEFT JOIN adastat_account AS ac ON ac.id = sa.id
        LEFT JOIN pool_hash AS ph ON ph.id = ac.pool
        LEFT JOIN adastat_pool AS p ON p.id = ac.pool
        WHERE a.address = $1
      `,
              [addr]
            )
          : { rows: [] },
        drepHash
          ? query(
              `
        SELECT id, (22 + has_script::int) || encode(raw, 'hex') AS base16, view AS bech32_legacy, has_script
        FROM drep_hash
        WHERE raw = $1 ${drepHash.length === 2 ? 'AND has_script = $2' : ''}
      `,
              drepHash
            )
          : { rows: [] },
        govActionHash
          ? query(
              `
        SELECT gap.id, gap.expiration, gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch, LOWER(gap.type::text) as type, encode(tx.hash, 'hex') AS tx_hash, gap.index, d.json->'body'->>'title' AS title, 1024 - 2048 * (gap.ratified_epoch IS NOT NULL OR gap.expired_epoch IS NOT NULL)::int AS score
        FROM gov_action_proposal AS gap
        LEFT JOIN tx ON tx.id = gap.tx_id
        LEFT JOIN voting_anchor AS va ON va.id = gap.voting_anchor_id
        LEFT JOIN off_chain_vote_data AS d ON d.voting_anchor_id = va.id AND d.hash = va.data_hash
        WHERE gap.tx_id = (SELECT id FROM tx WHERE hash = $1 LIMIT 1) AND gap.index = $2
      `,
              govActionHash
            )
          : { rows: [] },
      ])

    if (block?.rows?.length) {
      blocks = block.rows
    }

    if (orphan_block?.rows?.length) {
      orphan_blocks = orphan_block.rows
    }

    if (transaction?.rows?.length) {
      transactions = transaction.rows
      for (const row of transactions) {
        if (row.id) {
          if (row.amount === null) {
            const nonParsedBlock = storageData.nonParsedBlocks.get(row.block_no)

            if (nonParsedBlock) {
              const tx = nonParsedBlock.txs.get(row.id)

              if (tx) {
                row.amount = tx.amount
              }
            }
          }

          delete row.id
        }
      }
    }

    if (token?.rows?.length) {
      tokens = token.rows
    }

    if (pool?.rows?.length) {
      pools = pool.rows
    }

    if (account?.rows?.length) {
      accounts = account.rows
    }

    if (policy?.rows?.length) {
      policies = policy.rows
    }

    if (address?.rows?.length) {
      addresses = address.rows
    }

    if (drep?.rows?.length) {
      for (const row of drep.rows) {
        const drepData = drepsData.get(row.id)
        if (drepData) {
          row.bech32 = drepData.bech32
          row.given_name = drepData.given_name
          row.image = drepData.image
          row.live_stake = drepData.live_stake
          row.delegator = drepData.delegator
          row.active = drepData.active
          row.score = drepData.active ? 1024 : -1024
        } else {
          row.bech32 = row.base16 ? toBech32('drep', row.base16) : row.bech32_legacy
        }

        delete row.id
      }

      dreps = drep.rows
    }

    if (gov_action?.rows?.length) {
      const row = gov_action?.rows[0] as AnyObject

      row.bech32 = toBech32('gov_action', row.tx_hash + ('0' + parseInt(row.index).toString(16)).slice(-2))

      delete row.id

      gov_actions = gov_action.rows
    }
  } else {
    if (isInt && intQuery >= 0 && intQuery <= latestBlock.epoch_no) {
      epochs = [
        {
          no: intQuery,
        },
      ]
    }

    const blockWhere: any[] = [],
      orphanBlockWhere: any[] = [],
      blockValues: any[] = []

    let slot_no, block_no, adahandleDrep

    if (isInt) {
      if (intQuery <= latestBlock.slot_no) {
        slot_no = intQuery
        blockValues.push(slot_no)
        blockWhere.push(`(SELECT id FROM block WHERE slot_no >= $${blockValues.length} ORDER BY slot_no ASC LIMIT 1)`)
        blockWhere.push(`(SELECT id FROM block WHERE slot_no <= $${blockValues.length} ORDER BY slot_no DESC LIMIT 1)`)
        orphanBlockWhere.push(`o.slot_no = $${blockValues.length}`)
      }
      if (intQuery <= latestBlock.block_no) {
        block_no = intQuery
        blockValues.push(block_no)
        blockWhere.push(`(SELECT id FROM block WHERE block_no = $${blockValues.length})`)
        orphanBlockWhere.push(`o.block_no = $${blockValues.length}`)
      }
    } else if (/^(\d|[1-9]\d+)(\s*)(\.|\/)(\s*)(\d|[1-9]\d+)$/.test(queryLower)) {
      // block - epoch / slot or epoch . slot - i.e. block
      const [_epoch_no, _epoch_slot_no] = queryLower.split(/\s*[.|/]\s*/),
        epoch_no = Number(_epoch_no),
        epoch_slot_no = Number(_epoch_slot_no)

      if (
        intQuery >= 0 &&
        intQuery <= latestBlock.epoch_no &&
        epoch_slot_no <=
          (epoch_no >= networkParams.shelley
            ? networkParams.epochLength
            : networkParams.epochLength * networkParams.activeSlotsCoeff)
      ) {
        const s =
          (epoch_no >= networkParams.shelley
            ? networkParams.shelley * networkParams.epochLength * networkParams.activeSlotsCoeff +
              (epoch_no - networkParams.shelley) * networkParams.epochLength
            : epoch_no * networkParams.epochLength * networkParams.activeSlotsCoeff) + +epoch_slot_no
        if (s <= latestBlock.slot_no) {
          slot_no = s
          blockValues.push(slot_no)
          blockWhere.push(`(SELECT id FROM block WHERE slot_no >= $${blockValues.length} ORDER BY slot_no ASC LIMIT 1)`)
          blockWhere.push(
            `(SELECT id FROM block WHERE slot_no <= $${blockValues.length} ORDER BY slot_no DESC LIMIT 1)`
          )
          orphanBlockWhere.push(`o.slot_no = $${blockValues.length}`)
        }
      }
    } else if (queryLower === 'genesis') {
      blockWhere.push(`(SELECT id FROM block ORDER BY id ASC LIMIT 1)`)
    }

    const safeQuery = queryLower.replace(/[%_\\]/g, '\\$&')

    const tokenWhere = `LOWER(ENCODE(m.name, 'escape')) LIKE $1 || '%' ESCAPE '\\' COLLATE "C"`,
      tokenValues = [safeQuery]

    let tokenDirectScore = 0,
      addr = queryStr

    if (queryLower.length === 44 && queryLower.slice(0, 6) === 'asset1') {
      tokenValues.push(queryLower)
      tokenDirectScore = 8
    } else if (isHex && isEven) {
      tokenDirectScore = 1
      tokenValues.push('\\x' + queryLower)
    } else if (addr.slice(0, 1) === '$' && addr.length > 1) {
      // $adahandle
      let token_name = addr.slice(1),
        punycode_name

      try {
        punycode_name = punycode.toASCII(token_name)
        token_name = punycode_name
      } catch {}

      const {
        rows: [row],
      } = await query(
        `
          SELECT encode(ma.policy, 'hex') AS policy, encode(ma.name, 'hex') AS name, COALESCE(ab.address, a.address) AS address, encode(cardano.bech32_decode_data(a.address), 'hex') AS base16
          FROM multi_asset AS ma
          LEFT JOIN adastat_ma_holder AS mh ON mh.ma_id = ma.id
          LEFT JOIN adastat_address AS a ON a.id = mh.holder_id
          LEFT JOIN adastat_address_byron AS ab ON ab.id = -mh.holder_id
          WHERE ((ma.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND ma.name = '\\x000de140'::bytea || CAST($1 AS bytea))
            OR  (ma.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND ma.name = '\\x00000000'::bytea || CAST($1 AS bytea))
            OR  (ma.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND ma.name = CAST($1 AS bytea)))
          LIMIT 1
        `,
        [token_name]
      )

      if (row) {
        tokenDirectScore = 2
        tokenValues.push('\\x' + row.policy)
        tokenValues.push('\\x' + row.name)

        if (row.address) {
          addr = row.address

          if (row.base16) {
            const type_int = parseInt(row.base16.slice(0, 1), 16)

            adahandleDrep = toBech32('drep', '2' + (type_int % 2 ? '3' : '2') + row.base16.slice(2, 58))
          }
        }
      }
    } else if (queryLower === 'usdm') {
      tokenDirectScore = 4
      tokenValues.push('\\xc48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad')
      tokenValues.push('\\x0014df105553444d')
    } else if (queryLower === 'usda') {
      tokenDirectScore = 4
      tokenValues.push('\\xfe7c786ab321f41c654ef6c1af7b3250a613c24e4213e0425a7ae456')
      tokenValues.push('\\x55534441')
    } else if (queryLower === 'night') {
      tokenDirectScore = 4
      tokenValues.push('\\x0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa')
      tokenValues.push('\\x4e49474854')
    } else if (queryLower === 'djed') {
      tokenDirectScore = 4
      tokenValues.push('\\x8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61')
      tokenValues.push('\\x446a65644d6963726f555344')
    } else if (queryLower === 'shen') {
      tokenDirectScore = 4
      tokenValues.push('\\x8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61')
      tokenValues.push('\\x5368656e4d6963726f555344')
    } else if (queryLower.length <= 64) {
      const registryToken = findRegistryToken(queryLower)

      if (registryToken) {
        tokenDirectScore = 2

        tokenValues.push('\\x' + registryToken.policy)
        tokenValues.push('\\x' + registryToken.nameHex)
      }
    }

    const [block, orphan_block, token, pool, address, byron_address, account] = await Promise.all([
      blockWhere.length > 0
        ? query(
            `
        SELECT COALESCE(b.block_no, 0) AS no, encode(b.hash::bytea, 'hex') AS hash, b.epoch_no, b.slot_no::integer, b.epoch_slot_no, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, COALESCE(ap.name, sl.description) AS pool_name, ap.ticker AS pool_ticker
        FROM block AS b
        LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        WHERE b.id IN (
          ${blockWhere.join(' UNION ')}
        )
      `,
            blockValues
          )
        : { rows: [] },
      orphanBlockWhere.length > 0
        ? query(
            `
        SELECT encode(o.hash::bytea, 'hex') AS orphan_hash, o.epoch_no AS orphan_epoch_no, o.epoch_slot_no AS orphan_epoch_slot_no, o.block_no AS orphan_no, o.slot_no::integer AS orphan_slot_no, EXTRACT(epoch FROM o.time)::integer AS orphan_time, encode(b.hash::bytea, 'hex') AS hash, b.epoch_no, b.epoch_slot_no, b.block_no AS no, b.slot_no::integer, EXTRACT(epoch FROM b.time)::integer AS time, encode(ph_o.hash_raw::bytea, 'hex') AS orphan_pool_hash, ph_o.view AS orphan_pool_bech32, ap_o.name AS orphan_pool_name, ap_o.ticker AS orphan_pool_ticker, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, ap.name AS pool_name, ap.ticker AS pool_ticker
        FROM adastat_block_orphan AS o
        LEFT JOIN slot_leader AS sl_o ON sl_o.id = o.slot_leader_id
        LEFT JOIN pool_hash AS ph_o ON ph_o.id = sl_o.pool_hash_id
        LEFT JOIN adastat_pool AS ap_o ON ap_o.id = ph_o.id
        LEFT JOIN block AS b ON (b.block_no = o.block_no AND (b.slot_leader_id <> o.slot_leader_id OR b.hash <> o.hash))
        LEFT JOIN slot_leader AS sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash AS ph ON ph.id = sl.pool_hash_id
        LEFT JOIN adastat_pool AS ap ON ap.id = ph.id
        WHERE ${orphanBlockWhere.join(' OR ')} AND b.block_no IS NOT NULL
      `,
            blockValues
          )
        : { rows: [] },

      query(
        `
        WITH m AS (
          ${
            tokenDirectScore
              ? `
          (
            SELECT m.id, m.policy, m.name, m.fingerprint, ${tokenDirectScore} AS score
            FROM multi_asset m
            WHERE ${tokenDirectScore === 8 ? `m.fingerprint = $2` : tokenDirectScore === 1 ? `LOWER(ENCODE(m.name, 'escape')) = LOWER(ENCODE($2, 'escape')) COLLATE "C" AND m.name = $2` : `m.policy = $2 AND m.name = $3`}
          )
          UNION ALL
          `
              : ''
          }
          (
            SELECT m.id, m.policy, m.name, m.fingerprint, 2 AS score
            FROM multi_asset m
            WHERE m.policy = '\\xf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a' AND LOWER(encode(m.name, 'escape')) = $1
          )
          UNION ALL
          (
            SELECT m.id, m.policy, m.name, m.fingerprint, 1 AS score
            FROM multi_asset m
            WHERE ${tokenWhere}
            ORDER BY LOWER(ENCODE(m.name, 'escape')) COLLATE "C"
            LIMIT 100
          )
        )
        SELECT encode(m.policy::bytea, 'hex') AS policy, convert_asset_name(m.name) AS asset_name, encode(m.name::bytea, 'hex') AS asset_name_hex, m.fingerprint, am.supply, am.holder::int, am.tx::int, md.json AS meta_data, m.score
        FROM m
        LEFT JOIN adastat_multi_asset AS am ON am.id = m.id
        LEFT JOIN tx_metadata AS md ON md.id = am.meta_id
        ORDER BY score DESC, m.name ASC
        LIMIT 100
      `,
        tokenValues
      ),
      query(
        `
        WITH p AS (
          SELECT
            encode(ph.hash_raw::bytea, 'hex') AS hash, ph.view AS bech32, p.name, p.ticker, p.itn_ticker > 0 AS itn, p.impersonator > 0 AS impersonator, COALESCE(pr.retiring_epoch <= $3, false) AS retired,
            ep_l.stake AS live_stake, ep_l.delegator, COALESCE(ep_l.real_pledge, 0)::numeric AS owner_stake, COALESCE(pu_l.pledge, pu_u.pledge) AS pledge, pu_l.margin::numeric AS margin, pu_l.fixed_cost AS fixed_cost,
            LOWER(p.name) AS lname, LOWER(p.ticker) AS lticker, STRPOS(LOWER(p.name), $1) AS npos, STRPOS(LOWER(p.ticker), $1) AS tpos, length($1) AS qlen
          FROM adastat_pool AS p
          LEFT JOIN pool_hash AS ph ON ph.id = p.id
          LEFT JOIN pool_retire AS pr ON pr.id = p.retirement_id
          LEFT JOIN adastat_epoch_pool AS ep_l ON (ep_l.epoch_no = $3 AND ep_l.pool_id = p.id)
          LEFT JOIN pool_update AS pu_l ON pu_l.id = ep_l.update_id
          LEFT JOIN pool_update AS pu_u ON pu_u.id = p.update_id
          WHERE ${queryLower.length === 56 && queryLower.startsWith('pool1') ? 'ph.view = $1 OR' : `p.ticker ILIKE '%' || $2 || '%' ESCAPE '\\' OR`} p.name ILIKE '%' || $2 || '%' ESCAPE '\\'
        )
        SELECT hash, bech32, name, ticker, itn, impersonator, retired, live_stake, delegator, owner_stake, pledge, margin, fixed_cost,
          CASE
            WHEN p.bech32= $1 THEN 8192
            ELSE 0
          END + CASE
            WHEN p.lticker = $1 THEN 4096
            WHEN p.tpos = 1 THEN 512
            WHEN p.tpos > 0 THEN 129 - p.tpos
            ELSE 0
          END + CASE
            WHEN p.lname = $1 THEN 2048
            WHEN p.npos > 0 THEN
              CASE
                WHEN p.npos = 1 OR substring(p.lname from p.npos - 1 for 1) = ' ' THEN
                  CASE
                    WHEN substring(p.lname from p.npos + p.qlen for 1) = ' ' OR p.npos + p.qlen > length(p.lname) THEN 1025 - p.npos
                    ELSE 257 - p.npos
                  END
                ELSE 65 - p.npos
              END
            ELSE 0
          END - 16384 * retired::int - 32768 * p.impersonator::int AS score
        FROM p
        ORDER BY score DESC
        LIMIT 100
      `,
        [queryLower, safeQuery, latestBlock.epoch_no]
      ),
      addr.length >= 58 && (networkParams.isMainnet ? addr.slice(0, 4) === 'addr' : addr.slice(0, 9) === 'addr_test')
        ? query(
            `
        SELECT a.address, a.amount AS balance, encode(sa.hash_raw::bytea, 'hex') AS stake_base16, sa.view AS stake_bech32, ac.amount AS account_balance, ac.reward AS account_reward_amount, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker
        FROM adastat_address AS a
        LEFT JOIN stake_address AS sa ON sa.id = a.account_id
        LEFT JOIN adastat_account AS ac ON ac.id = sa.id
        LEFT JOIN pool_hash AS ph ON ph.id = ac.pool
        LEFT JOIN adastat_pool AS p ON p.id = ac.pool
        WHERE a.address = $1
      `,
            [addr]
          )
        : { rows: [] },

      addr.length >= 56 && (networkParams.isMainnet ? addr.slice(0, 4) !== 'addr' : addr.slice(0, 9) !== 'addr_test')
        ? query(
            `
        SELECT address, amount AS balance
        FROM adastat_address_byron
        WHERE address = $1
      `,
            [addr]
          )
        : { rows: [] },
      (
        networkParams.isMainnet
          ? addr.length === 59 && addr.slice(0, 5) === 'stake'
          : addr.length === 64 && addr.slice(0, 10) === 'stake_test'
      )
        ? query(
            `
        SELECT encode(s.hash_raw::bytea, 'hex') AS base16, s.view AS bech32, a.amount AS balance, a.reward AS reward_amount, encode(ph.hash_raw::bytea, 'hex') AS pool_hash, ph.view AS pool_bech32, p.name AS pool_name, p.ticker AS pool_ticker
        FROM adastat_account AS a
        LEFT JOIN stake_address AS s ON s.id = a.id
        LEFT JOIN pool_hash AS ph ON ph.id = a.pool
        LEFT JOIN adastat_pool AS p ON p.id = a.pool
        WHERE s.view = $1
      `,
            [addr]
          )
        : { rows: [] },
    ])

    if (block?.rows?.length) {
      blocks = block.rows
    }

    if (orphan_block?.rows?.length) {
      orphan_blocks = orphan_block.rows
    }

    if (token?.rows?.length) {
      tokens = token.rows
    }

    if (pool?.rows?.length) {
      pools = pool.rows
    }

    const uniqueAddresses: any = {}
    if (address?.rows?.length) {
      for (const row of address.rows) {
        uniqueAddresses[row.address] = row
      }
    }
    if (byron_address?.rows?.length) {
      for (const row of byron_address.rows) {
        uniqueAddresses[row.address] = row
      }
    }
    addresses = Object.values(uniqueAddresses)

    if (account?.rows?.length) {
      accounts = account.rows
    }

    for (const drep of drepsData.values()) {
      let score = 0

      const given_name = drep.given_name?.trim().toLowerCase() ?? '',
        pos = given_name.indexOf(queryLower)

      if (adahandleDrep === drep.bech32 || given_name === queryLower) {
        score = 1024
      } else if (pos >= 0) {
        if (pos === 0 || given_name.slice(pos - 1, pos) === ' ') {
          if (
            given_name.slice(pos + queryLower.length, pos + queryLower.length + 1) === ' ' ||
            pos + queryLower.length === given_name.length
          ) {
            score = 512 - pos
          } else {
            score = 256 - pos
          }
        } else {
          score = 128 - pos
        }
      }

      if (score) {
        dreps.push({
          base16: drep.base16,
          bech32_legacy: drep.bech32_legacy,
          has_script: drep.has_script,
          bech32: drep.bech32,
          given_name: drep.given_name,
          image: drep.image,
          live_stake: drep.live_stake,
          delegator: drep.delegator,
          active: drep.active,
          score: score - (drep.active ? 0 : 2048),
        })
      }
    }

    dreps.sort((a, b) =>
      b.score === a.score
        ? b.live_stake === a.live_stake
          ? b.delegator === a.delegator
            ? b.bech32 < a.bech32
              ? -1
              : 1
            : b.delegator - a.delegator
          : b.live_stake < a.live_stake
            ? -1
            : 1
        : b.score - a.score
    )

    for (const govAction of govActions.values()) {
      let score = 0

      const title = govAction.title?.trim().toLowerCase() ?? '',
        pos = title.indexOf(queryLower)

      if (title === queryLower) {
        score = 1024
      } else if (pos >= 0) {
        if (pos === 0 || title.slice(pos - 1, pos) === ' ') {
          if (
            title.slice(pos + queryLower.length, pos + queryLower.length + 1) === ' ' ||
            pos + queryLower.length === title.length
          ) {
            score = 512 - pos
          } else {
            score = 256 - pos
          }
        } else {
          score = 128 - pos
        }
      }

      if (score) {
        gov_actions.push({
          expiration: govAction.expiration,
          ratified_epoch: govAction.ratified_epoch,
          enacted_epoch: govAction.enacted_epoch,
          dropped_epoch: govAction.dropped_epoch,
          expired_epoch: govAction.expired_epoch,
          type: govAction.type,
          tx_hash: govAction.tx_hash,
          index: govAction.index,
          title: govAction.title,
          bech32: govAction.bech32,
          score: score - (govAction.ratified_epoch || govAction.expired_epoch ? 2048 : 0),
        })

        gov_actions.sort((a, b) =>
          b.score === a.score
            ? b.expiration === a.expiration
              ? b.bech32 < a.bech32
                ? -1
                : 1
              : b.expiration - a.expiration
            : b.score - a.score
        )
      }
    }
  }

  for (const row of accounts) {
    uniqueAccounts[row.base16] = row
  }
  accounts = Object.values(uniqueAccounts)

  return {
    data: {
      epochs,
      blocks,
      orphan_blocks,
      transactions,
      accounts,
      addresses,
      tokens,
      policies,
      pools,
      dreps,
      gov_actions,
    },
  }
}
