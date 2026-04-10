import { networkParams } from '@/config.ts'
import { fetchJson } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { latestBlock } from '@/storage.ts'

const cacheTime = 3 * 60 * 60 * 1000 // 3 hours

let mithrilSigners = new Set<string>(),
  initTime = 0

export const init = async (): Promise<void> => {
  const { mithrilAggregator } = networkParams

  if (mithrilAggregator) {
    const now = Date.now()

    if (initTime + cacheTime < now) {
      initTime = now

      const epochNo = latestBlock.epoch_no,
        data = await fetchJson(mithrilAggregator + '/signers/registered/' + epochNo)

      try {
        const registeredSigners = new Set<string>()

        for (const { party_id } of data.registrations) {
          registeredSigners.add(party_id)
        }

        mithrilSigners = registeredSigners
      } catch (err) {
        logger.error(err, `Mithril epoch ${epochNo} registrations error`)
      }
    }
  }
}

export const checkSigner = (poolId: string): boolean => mithrilSigners.has(poolId)
