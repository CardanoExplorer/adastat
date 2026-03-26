import { query } from '@/db.ts'
import {
  activeValues as drepActiveValues,
  idValues as drepIdValues,
  stakeValues as drepStakeValues,
} from '@/helpers/dreps.ts'
import logger from '@/logger.ts'
import { latestBlock } from '@/storage.ts'
import type { AnyObject } from '@/types/shared.js'

export const govActionTypes = {
  parameterchange: 'ParameterChange',
  hardforkinitiation: 'HardForkInitiation',
  treasurywithdrawals: 'TreasuryWithdrawals',
  noconfidence: 'NoConfidence',
  newcommittee: 'NewCommittee',
  newconstitution: 'NewConstitution',
  infoaction: 'InfoAction',
}

export type GovActionTypes = typeof govActionTypes

export const voterRoleTypes = {
  drep: 'DRep',
  spo: 'SPO',
  cc: 'ConstitutionalCommittee',
}

export const voteTypes = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
}

export const totalData = {
  actions: 0,
  active: 0,
  ratified: 0,
}

const criticalParams = [
  'maxBlockBodySize',
  'maxTxSize',
  'maxBlockHeaderSize',
  'maxValueSize',
  'maxBlockExecutionUnits',
  'txFeePerByte',
  'txFeeFixed',
  'minFeeRefScriptCoinsPerByte',
  'utxoCostPerByte',
  'govDeposit',
]

const outcomeGA: bigint[] = []

export const govActions = new Map<bigint, AnyObject>()

let lastCheckTime = 0,
  loading: Promise<void> | null = null

const setThreshold = (ga: AnyObject) => {
  if (ga.type === 'InfoAction') {
    ga.pool_threshold = 1
    ga.drep_threshold = 1
  } else if (ga.bootstrap_period) {
    ga.pool_threshold = ga.type === 'HardForkInitiation' ? ga.pvt_hard_fork_initiation : 0
    ga.drep_threshold = 0
  } else {
    switch (ga.type) {
      case 'NewConstitution': {
        ga.pool_threshold = 0
        ga.drep_threshold = ga.dvt_update_to_constitution
        break
      }
      case 'NewCommittee': {
        ga.pool_threshold = ga.pvt_committee_normal
        ga.drep_threshold = ga.dvt_committee_normal
        break
      }
      case 'NoConfidence': {
        ga.pool_threshold = ga.pvt_motion_no_confidence
        ga.drep_threshold = ga.dvt_motion_no_confidence
        break
      }
      case 'TreasuryWithdrawals': {
        ga.pool_threshold = 0
        ga.drep_threshold = ga.dvt_treasury_withdrawal
        break
      }
      case 'HardForkInitiation': {
        ga.pool_threshold = ga.pvt_hard_fork_initiation
        ga.drep_threshold = ga.dvt_hard_fork_initiation
        break
      }
      case 'ParameterChange': {
        const gaParams = Object.keys(ga.description?.contents?.[1] ?? {})

        let isCriticalParams = false

        for (const gaParam of gaParams) {
          if (criticalParams.includes(gaParam)) {
            isCriticalParams = true

            break
          }
        }

        ga.pool_threshold = isCriticalParams ? 0.51 : 0
        ga.drep_threshold = ga.dvt_treasury_withdrawal
        break
      }
      default: {
        ga.pool_threshold = 0.51
        ga.drep_threshold = 0.51
      }
    }
  }
}

const loadData = async () => {
  logger.trace('Gov Actions loadData start')
  const {
    rows: [outcomeCountRow],
  } = await query(
    `
    SELECT COUNT(id) AS qty
    FROM gov_action_proposal
    WHERE id <> ALL ($1::bigint[]) AND (ratified_epoch IS NOT NULL OR expired_epoch IS NOT NULL OR dropped_epoch IS NOT NULL)
  `,
    [outcomeGA]
  )

  logger.trace('Gov Actions loadData outcomeCountRow %s', outcomeCountRow?.qty)

  if (outcomeCountRow?.qty > 0) {
    const { rows: outcomeGARows } = await query(
      `
      WITH agg AS (
        SELECT o.outcome_epoch, (
          SELECT MAX(id+0)
          FROM tx
          WHERE block_id = (
              SELECT MAX(id+0)
              FROM block
              WHERE epoch_no = o.outcome_epoch - 1 AND tx_count > 0
          )
        ) AS last_tx_id
        FROM (
          SELECT DISTINCT COALESCE(gap.ratified_epoch, gap.expired_epoch, gap.dropped_epoch) AS outcome_epoch
          FROM gov_action_proposal AS gap
        ) AS o
        WHERE o.outcome_epoch IS NOT NULL
      ), ra AS MATERIALIZED (
        SELECT DISTINCT agg.outcome_epoch AS epoch_no, pu.reward_addr_id AS addr_id
        FROM agg
        LEFT JOIN adastat_epoch_pool AS aep ON aep.epoch_no = agg.outcome_epoch
        JOIN pool_update AS pu ON pu.id = aep.update_id
      ), g AS MATERIALIZED (
        SELECT gap.id, gap.tx_id, gap.index, gap.deposit, gap.expiration, gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch, gap.type, gap.description, agg.outcome_epoch, agg.last_tx_id, (
              SELECT id
              FROM committee
              ORDER BY id ASC
              LIMIT 1
            ) AS icc_id, aa.id AS aa_id, anc.id AS anc_id, ep.protocol_major < 10 AS bootstrap_period, ep.pvt_motion_no_confidence, ep.pvt_committee_normal, ep.pvt_committee_no_confidence, ep.pvt_hard_fork_initiation, ep.dvt_motion_no_confidence, ep.dvt_committee_normal, ep.dvt_committee_no_confidence, ep.dvt_update_to_constitution, ep.dvt_hard_fork_initiation, ep.dvt_p_p_network_group, ep.dvt_p_p_economic_group, ep.dvt_p_p_technical_group, ep.dvt_p_p_gov_group, ep.dvt_treasury_withdrawal, ep.pvtpp_security_group AS pvt_p_p_security_group, encode(tx.hash, 'hex') AS tx_hash, d.title, d.abstract, d.motivation, d.rationale, off_chain_vote_data.json, sa.view AS stake_bech32, ENCODE(sa.hash_raw, 'hex') AS stake_base16, b.epoch_no AS submission_epoch, EXTRACT(epoch FROM b.time)::integer AS submission_time, va.url AS meta_url, encode(va.data_hash, 'hex') AS meta_hash
        FROM gov_action_proposal AS gap
        LEFT JOIN agg ON agg.outcome_epoch = COALESCE(gap.ratified_epoch, gap.expired_epoch, gap.dropped_epoch)
        LEFT JOIN tx ON tx.id = gap.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        LEFT JOIN stake_address AS sa ON sa.id = gap.return_address
        LEFT JOIN off_chain_vote_data ON off_chain_vote_data.voting_anchor_id = gap.voting_anchor_id
        LEFT JOIN off_chain_vote_gov_action_data AS d ON d.off_chain_vote_data_id = off_chain_vote_data.id
        LEFT JOIN voting_anchor AS va ON va.id = gap.voting_anchor_id
        LEFT JOIN epoch_param AS ep ON ep.epoch_no = agg.outcome_epoch
        LEFT JOIN drep_hash AS aa ON aa.view = 'drep_always_abstain'
        LEFT JOIN drep_hash AS anc ON anc.view = 'drep_always_no_confidence'
        WHERE gap.id <> ALL ($1::bigint[]) AND agg.outcome_epoch IS NOT NULL
      )
      SELECT g.id, g.tx_id, g.index, g.outcome_epoch, g.last_tx_id, g.type, g.deposit, g.expiration, g.ratified_epoch, g.enacted_epoch, g.dropped_epoch, g.expired_epoch, g.tx_hash, g.description, g.title, g.bootstrap_period, g.pvt_motion_no_confidence, g.pvt_committee_normal, g.pvt_committee_no_confidence, g.pvt_hard_fork_initiation, g.dvt_motion_no_confidence, g.dvt_committee_normal, g.dvt_committee_no_confidence, g.dvt_update_to_constitution, g.dvt_hard_fork_initiation, g.dvt_p_p_network_group, g.dvt_p_p_economic_group, g.dvt_p_p_technical_group, g.dvt_p_p_gov_group, g.dvt_treasury_withdrawal, g.pvt_p_p_security_group, g.stake_bech32, g.stake_base16, g.submission_epoch, g.submission_time, g.meta_url, g.meta_hash, c.*, d.*, p.*, cardano.bech32_encode('gov_action', decode(g.tx_hash || lpad(to_hex(g.index), 2, '0'), 'hex')) AS bech32
      FROM g
      LEFT JOIN LATERAL (
          WITH drc AS (
            SELECT
                r.cold_key_id,
                r.tx_id,
                COALESCE(e.tx_id, n.tx_id) AS e_tx_id
            FROM committee_registration r
            LEFT JOIN LATERAL (
              SELECT dr.tx_id
              FROM committee_de_registration dr
              WHERE dr.cold_key_id = r.cold_key_id
                AND (dr.tx_id, dr.cert_index) > (r.tx_id, r.cert_index)
              ORDER BY dr.id
              LIMIT 1
            ) e ON true
            LEFT JOIN LATERAL (
              SELECT nr.tx_id
              FROM committee_registration nr
              WHERE nr.cold_key_id = r.cold_key_id
                AND nr.tx_id > r.tx_id
              ORDER BY nr.id
              LIMIT 1
            ) n ON true
          ), v AS (
            SELECT DISTINCT ON (vp.committee_voter) vp.committee_voter, vp.vote, vpd.json, cr.cold_key_id
            FROM voting_procedure AS vp
            LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = vp.voting_anchor_id
            LEFT JOIN committee_registration AS cr ON cr.hot_key_id = vp.committee_voter
            WHERE vp.gov_action_proposal_id = g.id AND vp.committee_voter IS NOT NULL AND vp.tx_id + 0 <= g.last_tx_id
            ORDER BY vp.committee_voter, vp.id DESC
          )
          SELECT COUNT(*) AS cc_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes') AS cc_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No') AS cc_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain') AS cc_abstain,
            cc.quorum_numerator AS cc_quorum_numerator,
            cc.quorum_denominator AS cc_quorum_denominator,
            jsonb_agg(
              jsonb_build_object('hash', ENCODE(ch.raw, 'hex'), 'vote', LOWER(v.vote::text), 'json', v.json, 'name', accm.name, 'image', accm.image)
            ) AS cc_member_votes
          FROM committee AS cc
          LEFT JOIN committee_member AS cm ON cm.committee_id = cc.id
          LEFT JOIN committee_hash AS ch ON ch.id = cm.committee_hash_id
          LEFT JOIN drc ON drc.cold_key_id = cm.committee_hash_id AND drc.tx_id <= g.last_tx_id AND (drc.e_tx_id IS NULL OR drc.e_tx_id > g.last_tx_id)
          LEFT JOIN v ON v.cold_key_id = cm.committee_hash_id
          LEFT JOIN adastat_cc_member AS accm ON accm.id = cm.committee_hash_id
          WHERE cc.id = COALESCE(
              (
                SELECT committee.id
                FROM gov_action_proposal AS vp
                LEFT JOIN committee ON committee.gov_action_proposal_id = vp.id
                WHERE vp.type = 'NewCommittee' AND vp.enacted_epoch < g.outcome_epoch
                ORDER BY vp.id DESC
                LIMIT 1
              ),
              g.icc_id
          ) AND drc.cold_key_id IS NOT NULL
          GROUP BY cc.quorum_numerator, cc.quorum_denominator
      ) AS c ON g.type NOT IN ('NewCommittee', 'NoConfidence')
      LEFT JOIN LATERAL (
          WITH drd AS (
            SELECT DISTINCT ON (dr.drep_hash_id) dr.drep_hash_id, dr.tx_id, dr.cert_index
            FROM drep_registration AS dr
            WHERE dr.deposit < 0 AND (dr.tx_id, dr.cert_index) > (g.tx_id, g.index) AND dr.tx_id <= g.last_tx_id
            ORDER BY dr.drep_hash_id, dr.id DESC
          ), v AS (
            SELECT DISTINCT ON (vp.drep_voter) vp.drep_voter, vp.vote
            FROM voting_procedure AS vp
            LEFT JOIN drd ON drd.drep_hash_id = vp.drep_voter
            WHERE vp.gov_action_proposal_id = g.id AND vp.drep_voter IS NOT NULL AND vp.tx_id + 0 <= g.last_tx_id AND (vp.tx_id, vp.index) > (drd.tx_id, drd.cert_index) IS NOT FALSE
            ORDER BY vp.drep_voter, vp.id DESC
          )
          SELECT COALESCE(SUM(dd.amount), 0) AS drep_total_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'Yes' AND dd.active_until >= dd.epoch_no), 0) AS drep_yes_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'No' AND dd.active_until >= dd.epoch_no), 0) AS drep_no_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'Abstain' AND dd.active_until >= dd.epoch_no), 0) AS drep_abstain_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.hash_id = g.aa_id), 0) AS drep_always_abstain_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.hash_id = g.anc_id), 0) AS drep_always_no_confidence_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.active_until < dd.epoch_no), 0) AS drep_inactive_stake,
            COUNT(*) AS drep_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes' AND dd.active_until >= dd.epoch_no) AS drep_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No' AND dd.active_until >= dd.epoch_no) AS drep_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain' AND dd.active_until >= dd.epoch_no) AS drep_abstain,
            COUNT(*) FILTER(WHERE dd.hash_id = g.aa_id) AS drep_always_abstain,
            COUNT(*) FILTER(WHERE dd.hash_id = g.anc_id) AS drep_always_no_confidence,
            COUNT(*) FILTER(WHERE dd.active_until < dd.epoch_no) AS drep_inactive
          FROM drep_distr AS dd
          LEFT JOIN v ON v.drep_voter = dd.hash_id
          WHERE dd.epoch_no = g.outcome_epoch
      ) AS d ON TRUE
      LEFT JOIN LATERAL (
          WITH dep AS (
              SELECT es.pool_id, SUM(gap.deposit) AS amount
              FROM gov_action_proposal AS gap
              LEFT JOIN tx ON tx.id = gap.tx_id
              LEFT JOIN block AS b ON b.id = tx.block_id
              LEFT JOIN epoch_stake AS es ON es.epoch_no = g.outcome_epoch AND es.addr_id = gap.return_address
              WHERE b.epoch_no < g.outcome_epoch AND COALESCE(gap.ratified_epoch, gap.expired_epoch, gap.dropped_epoch) >= g.outcome_epoch IS NOT FALSE AND es.pool_id IS NOT NULL
              GROUP BY es.pool_id
          ), apv AS (
              SELECT ra.addr_id, la.drep_hash_id
              FROM ra
              LEFT JOIN LATERAL (
                  SELECT drep_hash_id
                  FROM (
                      SELECT drep_hash_id, tx_id, cert_index
                      FROM delegation_vote
                      WHERE addr_id = ra.addr_id AND tx_id <= g.last_tx_id
                      UNION ALL
                      SELECT 0 AS drep_hash_id, tx_id, cert_index
                      FROM stake_deregistration
                      WHERE addr_id = ra.addr_id AND tx_id <= g.last_tx_id
                  ) combined
                  ORDER BY tx_id DESC, cert_index DESC
                  LIMIT 1
              ) la ON TRUE
              WHERE ra.epoch_no = g.outcome_epoch
          ), v AS (
            SELECT DISTINCT ON (vp.pool_voter) vp.pool_voter, vp.vote
            FROM voting_procedure AS vp
            WHERE vp.gov_action_proposal_id = g.id AND vp.pool_voter IS NOT NULL AND vp.tx_id + 0 <= g.last_tx_id
            ORDER BY vp.pool_voter, vp.id DESC
          )
          SELECT COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)), 0) AS pool_total_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'Yes'), 0) AS pool_yes_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'No'), 0) AS pool_no_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'Abstain'), 0) AS pool_abstain_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.aa_id), 0) AS pool_always_abstain_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.anc_id), 0) AS pool_always_no_confidence_stake,
            COUNT(*) AS pool_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes') AS pool_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No') AS pool_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain') AS pool_abstain,
            COUNT(*) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.aa_id) AS pool_always_abstain,
            COUNT(*) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.anc_id) AS pool_always_no_confidence
          FROM adastat_epoch_pool AS aep
          LEFT JOIN pool_update AS pu ON pu.id = aep.update_id
          LEFT JOIN dep ON dep.pool_id = aep.pool_id
          LEFT JOIN apv ON apv.addr_id = pu.reward_addr_id
          LEFT JOIN v ON v.pool_voter = aep.pool_id
          WHERE aep.epoch_no = g.outcome_epoch - 2
      ) AS p ON g.type IN ('HardForkInitiation', 'NewCommittee', 'InfoAction', 'NoConfidence', 'ParameterChange')
      `,
      [outcomeGA]
    )

    logger.trace('loadData outcomeGARows %s', outcomeGARows.length)

    for (const outcomeGARow of outcomeGARows) {
      setThreshold(outcomeGARow)

      govActions.set(outcomeGARow.id, outcomeGARow)

      outcomeGA.push(outcomeGARow.id)
    }

    totalData.ratified = 0
    for (const govAction of govActions.values()) {
      if (govAction.ratified_epoch >= 0) {
        totalData.ratified++
      }
    }
  }

  const { rows: newGARows } = await query(
    `
    SELECT id
    FROM gov_action_proposal
    WHERE id <> ALL ($1::bigint[]) AND ratified_epoch IS NULL AND expired_epoch IS NULL AND dropped_epoch IS NULL
  `,
    [[...govActions.keys()]]
  )

  logger.trace('Gov Actions loadData newGARows %s', newGARows.length)

  const now = Date.now()

  if (newGARows.length || now - lastCheckTime > 3 * 60 * 1000) {
    lastCheckTime = now

    const { rows: liveGARows } = await query(
      `
      WITH g AS (
        SELECT gap.id, gap.tx_id, gap.index, gap.deposit, gap.expiration, gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch, gap.type, gap.description, (
          SELECT id
          FROM committee
          ORDER BY id ASC
          LIMIT 1
        ) AS icc_id, aa.id AS aa_id, anc.id AS anc_id, ep.protocol_major < 10 AS bootstrap_period, ep.pvt_motion_no_confidence, ep.pvt_committee_normal, ep.pvt_committee_no_confidence, ep.pvt_hard_fork_initiation, ep.dvt_motion_no_confidence, ep.dvt_committee_normal, ep.dvt_committee_no_confidence, ep.dvt_update_to_constitution, ep.dvt_hard_fork_initiation, ep.dvt_p_p_network_group, ep.dvt_p_p_economic_group, ep.dvt_p_p_technical_group, ep.dvt_p_p_gov_group, ep.dvt_treasury_withdrawal, ep.pvtpp_security_group AS pvt_p_p_security_group, encode(tx.hash, 'hex') AS tx_hash, d.title, d.abstract, d.motivation, d.rationale, off_chain_vote_data.json, sa.view AS stake_bech32, ENCODE(sa.hash_raw, 'hex') AS stake_base16, b.epoch_no AS submission_epoch, EXTRACT(epoch FROM b.time)::integer AS submission_time, va.url AS meta_url, encode(va.data_hash::bytea, 'hex') AS meta_hash
        FROM gov_action_proposal AS gap
        LEFT JOIN tx ON tx.id = gap.tx_id
        LEFT JOIN block AS b ON b.id = tx.block_id
        LEFT JOIN stake_address AS sa ON sa.id = gap.return_address
        LEFT JOIN off_chain_vote_data ON off_chain_vote_data.voting_anchor_id = gap.voting_anchor_id
        LEFT JOIN off_chain_vote_gov_action_data AS d ON d.off_chain_vote_data_id = off_chain_vote_data.id
        LEFT JOIN voting_anchor AS va ON va.id = gap.voting_anchor_id
        LEFT JOIN epoch_param AS ep ON ep.epoch_no = $1
        LEFT JOIN drep_hash AS aa ON aa.view = 'drep_always_abstain'
        LEFT JOIN drep_hash AS anc ON anc.view = 'drep_always_no_confidence'
        WHERE gap.ratified_epoch IS NULL AND gap.expired_epoch IS NULL AND gap.dropped_epoch IS NULL AND ep.epoch_no IS NOT NULL
      )
      SELECT g.id, g.tx_id, g.index, g.type, g.deposit, g.expiration, g.ratified_epoch, g.enacted_epoch, g.dropped_epoch, g.expired_epoch, g.tx_hash, g.description, g.title, g.bootstrap_period, g.pvt_motion_no_confidence, g.pvt_committee_normal, g.pvt_committee_no_confidence, g.pvt_hard_fork_initiation, g.dvt_motion_no_confidence, g.dvt_committee_normal, g.dvt_committee_no_confidence, g.dvt_update_to_constitution, g.dvt_hard_fork_initiation, g.dvt_p_p_network_group, g.dvt_p_p_economic_group, g.dvt_p_p_technical_group, g.dvt_p_p_gov_group, g.dvt_treasury_withdrawal, g.pvt_p_p_security_group, g.stake_bech32, g.stake_base16, g.submission_epoch, g.submission_time, g.meta_url, g.meta_hash, c.*, d.*, p.*
      FROM g
      LEFT JOIN LATERAL (
          WITH drc AS (
            SELECT DISTINCT ON (cdr.cold_key_id) cdr.cold_key_id, cdr.tx_id, cdr.cert_index
            FROM committee_de_registration AS cdr
            WHERE (cdr.tx_id, cdr.cert_index) > (g.tx_id, g.index)
            ORDER BY cdr.cold_key_id, cdr.id DESC
          ), v AS (
            SELECT DISTINCT ON (vp.committee_voter) vp.committee_voter, vp.vote, vpd.json, cr.cold_key_id
            FROM voting_procedure AS vp
            LEFT JOIN off_chain_vote_data AS vpd ON vpd.voting_anchor_id = vp.voting_anchor_id
            LEFT JOIN committee_registration AS cr ON cr.hot_key_id = vp.committee_voter
            LEFT JOIN drc ON drc.cold_key_id = cr.cold_key_id
            WHERE vp.gov_action_proposal_id = g.id AND vp.committee_voter IS NOT NULL AND (vp.tx_id, vp.index) > (drc.tx_id, drc.cert_index) IS NOT FALSE
            ORDER BY vp.committee_voter, vp.id DESC
          ), ca AS (
            SELECT DISTINCT ON (cold_key_id) cold_key_id, reg
            FROM (
              SELECT cold_key_id, tx_id, cert_index, TRUE AS reg
              FROM "committee_registration"
              UNION ALL
              SELECT cold_key_id, tx_id, cert_index, FALSE AS reg
              FROM "committee_de_registration"
            ) AS rd
            ORDER BY cold_key_id, tx_id DESC, cert_index DESC
          )
          SELECT COUNT(*)::int AS cc_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes')::int AS cc_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No')::int AS cc_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain')::int AS cc_abstain,
            cc.quorum_numerator::int AS cc_quorum_numerator,
            cc.quorum_denominator::int AS cc_quorum_denominator,
            jsonb_agg(
              jsonb_build_object('hash', ENCODE(ch.raw, 'hex'), 'vote', LOWER(v.vote::text), 'json', v.json, 'name', accm.name, 'image', accm.image)
            ) AS cc_member_votes
          FROM committee AS cc
          LEFT JOIN committee_member AS cm ON cm.committee_id = cc.id
          LEFT JOIN committee_hash AS ch ON ch.id = cm.committee_hash_id
          LEFT JOIN v ON v.cold_key_id = cm.committee_hash_id
          LEFT JOIN ca ON ca.cold_key_id = cm.committee_hash_id
          LEFT JOIN adastat_cc_member AS accm ON accm.id = cm.committee_hash_id
          WHERE cc.id = COALESCE(
              (
                SELECT committee.id
                FROM gov_action_proposal AS vp
                LEFT JOIN committee ON committee.gov_action_proposal_id = vp.id
                WHERE vp.type = 'NewCommittee' AND vp.enacted_epoch IS NOT NULL
                ORDER BY vp.id DESC
                LIMIT 1
              ),
              g.icc_id
          ) AND ca.reg
          GROUP BY cc.quorum_numerator, cc.quorum_denominator
      ) AS c ON g.type NOT IN ('NewCommittee', 'NoConfidence')
      LEFT JOIN LATERAL (
          WITH drd AS (
            SELECT DISTINCT ON (dr.drep_hash_id) dr.drep_hash_id, dr.tx_id, dr.cert_index
            FROM drep_registration AS dr
            WHERE dr.deposit < 0 AND (dr.tx_id, dr.cert_index) > (g.tx_id, g.index)
            ORDER BY dr.drep_hash_id, dr.id DESC
          ), v AS (
            SELECT DISTINCT ON (vp.drep_voter) vp.drep_voter, vp.vote
            FROM voting_procedure AS vp
            LEFT JOIN drd ON drd.drep_hash_id = vp.drep_voter
            WHERE vp.gov_action_proposal_id = g.id AND vp.drep_voter IS NOT NULL AND (vp.tx_id, vp.index) > (drd.tx_id, drd.cert_index) IS NOT FALSE
            ORDER BY vp.drep_voter, vp.id DESC
          )
          SELECT COALESCE(SUM(dd.amount), 0)::bigint AS drep_total_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'Yes' AND dd.active = TRUE), 0)::bigint AS drep_yes_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'No' AND dd.active = TRUE), 0)::bigint AS drep_no_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE v.vote = 'Abstain' AND dd.active = TRUE), 0)::bigint AS drep_abstain_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.hash_id = g.aa_id), 0)::bigint AS drep_always_abstain_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.hash_id = g.anc_id), 0)::bigint AS drep_always_no_confidence_stake,
            COALESCE(SUM(dd.amount) FILTER(WHERE dd.active = FALSE), 0)::bigint AS drep_inactive_stake,
            COUNT(*)::int AS drep_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes' AND dd.active = TRUE)::int AS drep_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No' AND dd.active = TRUE)::int AS drep_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain' AND dd.active = TRUE)::int AS drep_abstain,
            COUNT(*) FILTER(WHERE dd.hash_id = g.aa_id)::int AS drep_always_abstain,
            COUNT(*) FILTER(WHERE dd.hash_id = g.anc_id)::int AS drep_always_no_confidence,
            COUNT(*) FILTER(WHERE dd.active = FALSE)::int AS drep_inactive
          FROM unnest($2::bigint[], $3::bigint[], $4::boolean[]) AS dd (hash_id, amount, active)
          LEFT JOIN v ON v.drep_voter = dd.hash_id
          WHERE dd.active IS NOT NULL
      ) AS d ON TRUE
      LEFT JOIN LATERAL (
          WITH dep AS (
              SELECT es.pool_id, SUM(gap.deposit) AS amount
              FROM gov_action_proposal AS gap
              LEFT JOIN tx ON tx.id = gap.tx_id
              LEFT JOIN block AS b ON b.id = tx.block_id
              LEFT JOIN epoch_stake AS es ON es.epoch_no = $1 AND es.addr_id = gap.return_address
              WHERE gap.enacted_epoch IS NULL AND gap.expired_epoch IS NULL AND es.pool_id IS NOT NULL
              GROUP BY es.pool_id
          ), apv AS (
              SELECT DISTINCT ON (addr_id) addr_id, drep_hash_id
              FROM (
                (
                  SELECT addr_id, drep_hash_id, tx_id, cert_index
                  FROM delegation_vote
                ) UNION ALL (
                  SELECT addr_id, 0 AS drep_hash_id, tx_id, cert_index
                  FROM stake_deregistration
                )
              )
              WHERE addr_id IN (
                  SELECT DISTINCT pu.reward_addr_id
                  FROM adastat_epoch_pool AS aep
                  LEFT JOIN pool_update AS pu ON pu.id = aep.update_id
                  WHERE aep.epoch_no = $1
              )
              ORDER BY addr_id, tx_id DESC, cert_index DESC
          ), v AS (
            SELECT DISTINCT ON (vp.pool_voter) vp.pool_voter, vp.vote
            FROM voting_procedure AS vp
            WHERE vp.gov_action_proposal_id = g.id AND vp.pool_voter IS NOT NULL
            ORDER BY vp.pool_voter, vp.id DESC
          )
          SELECT COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)), 0)::bigint AS pool_total_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'Yes'), 0)::bigint AS pool_yes_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'No'), 0)::bigint AS pool_no_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote = 'Abstain'), 0)::bigint AS pool_abstain_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.aa_id), 0)::bigint AS pool_always_abstain_stake,
            COALESCE(SUM(aep.stake + COALESCE(dep.amount, 0)) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.anc_id), 0)::bigint AS pool_always_no_confidence_stake,
            COUNT(*)::int AS pool_total,
            COUNT(*) FILTER(WHERE v.vote = 'Yes')::int AS pool_yes,
            COUNT(*) FILTER(WHERE v.vote = 'No')::int AS pool_no,
            COUNT(*) FILTER(WHERE v.vote = 'Abstain')::int AS pool_abstain,
            COUNT(*) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.aa_id)::int AS pool_always_abstain,
            COUNT(*) FILTER(WHERE v.vote IS NULL AND apv.drep_hash_id = g.anc_id)::int AS pool_always_no_confidence
          FROM adastat_epoch_pool AS aep
          LEFT JOIN pool_update AS pu ON pu.id = aep.update_id
          LEFT JOIN dep ON dep.pool_id = aep.pool_id
          LEFT JOIN apv ON apv.addr_id = pu.reward_addr_id
          LEFT JOIN v ON v.pool_voter = aep.pool_id
          WHERE aep.epoch_no = $1 - 2
      ) AS p ON g.type IN ('HardForkInitiation', 'NewCommittee', 'InfoAction', 'NoConfidence', 'ParameterChange')
    `,
      [latestBlock.epoch_no, drepIdValues, drepStakeValues, drepActiveValues]
    )

    logger.trace('Gov Actions loadData liveGARows %s', liveGARows.length)

    for (const liveGARow of liveGARows) {
      setThreshold(liveGARow)

      govActions.set(liveGARow.id, liveGARow)
    }

    totalData.actions = govActions.size
    totalData.active = totalData.actions - outcomeGA.length
  }

  logger.trace('Gov Actions loadData end')
}

export const init = async () => {
  if (!loading) {
    loading = loadData()
  }

  try {
    await loading
  } catch (err) {
    logger.error(err, 'Gov Actions error')
  }

  loading = null
}
