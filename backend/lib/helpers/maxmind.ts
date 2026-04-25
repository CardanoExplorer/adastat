import { rootDir } from '@/config.ts'
import { fetchBytes } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { type AsnResponse, type CountryResponse, Reader, open } from 'maxmind'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dbDir = join(rootDir, 'maxmind'),
  cacheTime = 24 * 60 * 60 * 1000, // 24 hours
  checkTime = 15 * 60 * 1000 // 15 minutes

const reader: {
  country?: Reader<CountryResponse>
  asn?: Reader<AsnResponse>
} = {}

let nextInitTime = 0

export const init = async (): Promise<void> => {
  logger.trace('Maxmind init start')
  const now = Date.now()

  if (nextInitTime < now) {
    nextInitTime = now + checkTime

    await mkdir(dbDir, { recursive: true })

    for (const type of ['Country', 'ASN'] as const) {
      const readerKey = type.toLowerCase() as keyof typeof reader,
        mmdbFile = join(dbDir, readerKey + '.mmdb')

      let needUpdate = true

      try {
        const fileStat = await stat(mmdbFile),
          mtime = Math.trunc(fileStat.mtimeMs)

        if (mtime + cacheTime > now) {
          needUpdate = false
        }
      } catch (err) {
        if ((err as any)?.code !== 'ENOENT') {
          logger.error(err, `MaxMind ${mmdbFile} stat error`)
        }
      }

      if (needUpdate) {
        logger.trace('Maxmind fetch start %s', type)

        const bytes = await fetchBytes(`https://git.io/GeoLite2-${type}.mmdb`, 20 * 1024 * 1024, 30)

        logger.trace('Maxmind fetch end %s', type)

        if (bytes) {
          try {
            await writeFile(mmdbFile, bytes)
          } catch (err) {
            logger.error(err, `MaxMind ${mmdbFile} write error`)
          }
        }
      }

      try {
        reader[readerKey] = await open(mmdbFile)
      } catch (err) {
        logger.error(err, `MaxMind ${mmdbFile} open error`)
      }
    }
  }

  logger.trace('Maxmind init end')
}

const getCountry = (ip: string): string | null => {
  return reader.country?.get(ip)?.country?.iso_code?.toLowerCase() ?? null
}

const getASN = (ip: string): string | null => {
  return reader.asn?.get(ip)?.autonomous_system_organization ?? null
}

export { getCountry, getASN }
