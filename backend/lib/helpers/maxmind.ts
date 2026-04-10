import { rootDir } from '@/config.ts'
import { fetchBytes } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { type AsnResponse, type CountryResponse, Reader, open } from 'maxmind'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dbDir = join(rootDir, 'maxmind'),
  cacheTime = 24 * 60 * 60 * 1000 // 24 hours

await mkdir(dbDir, { recursive: true })

const reader: {
  country?: Reader<CountryResponse>
  asn?: Reader<AsnResponse>
} = {}

let initTime = 0

export const init = async (): Promise<void> => {
  const now = Date.now()

  if (initTime + cacheTime < now) {
    initTime = now

    for (const type of ['Country', 'ASN']) {
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
        const bytes = await fetchBytes(`https://git.io/GeoLite2-${type}.mmdb`, 20 * 1024 * 1024, 30)

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
}

const getCountry = async (ip: string): Promise<CountryResponse | null> => {
  return reader.country?.get(ip) ?? null
}

const getASN = async (ip: string): Promise<AsnResponse | null> => {
  return reader.asn?.get(ip) ?? null
}

export { getCountry, getASN }
