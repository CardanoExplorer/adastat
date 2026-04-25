import { networkParams } from '@/config.ts'
import { fetchJson } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { latestBlock } from '@/storage.ts'

const cacheTime = 3 * 60 * 60 * 1000, // 3 hours
  checkTime = 15 * 60 * 1000 // 15 minutes

let mithrilSigners = new Set<string>(),
  nextInitTime = 0

export const init = async (): Promise<void> => {
  logger.trace('Mithril signers init start')

  const { mithrilAggregator } = networkParams

  if (mithrilAggregator) {
    const now = Date.now()

    if (nextInitTime < now) {
      nextInitTime = now + checkTime

      const epochNo = latestBlock.epoch_no,
        data = await fetchJson(mithrilAggregator + '/signers/registered/' + epochNo)

      try {
        const registeredSigners = new Set<string>()

        for (const { party_id } of data.registrations) {
          registeredSigners.add(party_id)
        }

        logger.trace('Mithril signers registeredSigners %s', registeredSigners.size)

        mithrilSigners = registeredSigners
      } catch (err) {
        logger.error(err, `Mithril epoch ${epochNo} registrations error`)
      }
    }
  }

  logger.trace('Mithril signers init end')
}

export const checkSigner = (poolId: string): boolean => mithrilSigners.has(poolId)