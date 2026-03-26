import { networkParams, rootDir } from '@/config.ts'
import logger from '@/logger.ts'
import type { AnyObject } from '@/types/shared.js'
import { exec as _exec, execFile as _execFile } from 'node:child_process'
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import punycode from 'punycode'
import sharp from 'sharp'
import { promisify } from 'util'

const exec = promisify(_exec)
const execFile = promisify(_execFile)

const logoDir = process.env.TOKEN_LOGO_DIR || join(rootDir, 'images', 'tokens'),
  registryDir = join(rootDir, 'token_registry'),
  registryUrl = networkParams.isMainnet
    ? 'https://github.com/cardano-foundation/cardano-token-registry.git'
    : 'https://github.com/input-output-hk/metadata-registry-testnet.git',
  jsonDir = networkParams.isMainnet
    ? join(registryDir, 'cardano-token-registry', 'mappings')
    : join(registryDir, 'metadata-registry-testnet', 'registry'),
  cacheTime = 3 * 60 * 60 * 1000 // 3 hours

const cip68LabelMap = {
  '000643b0': '(100)',
  '000de140': '(222)',
  '0014df10': '(333)',
  '001bc280': '(444)',
  '00000000': '(000)',
}

type Token = {
  name: string
  description: string
  ticker: string
  url: string
  logo: string
  decimals: number
  policy: string
  nameHex: string
  time: number
}

type Registry = Record<string, Token>

let registry: Registry = {},
  initTime = 0

await mkdir(registryDir, { recursive: true })

await mkdir(logoDir, { recursive: true })

export const fill = (row: any, needMeta?: boolean) => {
  const subject: string = row.policy + row.asset_name_hex,
    json =
      row.meta_data?.[row.policy]?.[row.asset_name_hex ?? ''] || row.meta_data?.[row.policy]?.[row.asset_name ?? '']

  row.name = row.asset_name
  row.ticker = ''
  row.decimals = 0

  if (json && typeof json === 'object') {
    const metaProps = {
      name: 'name',
      ticker: 'ticker',
      decimals: 'decimals',
      description: 'description',
      url: 'url',
      image: 'image',
    }
    for (const prop of Object.keys(json)) {
      switch (prop.toLowerCase()) {
        case 'name':
          metaProps.name = prop
          break
        case 'ticker':
          metaProps.ticker = prop
          break
        case 'decimals':
          metaProps.decimals = prop
          break
        case 'description':
        case 'desc':
          metaProps.description = prop
          break
        case 'url':
        case 'website':
        case 'webpage':
          metaProps.url = prop
          break
        case 'image':
        case 'icon':
        case 'logo':
          metaProps.image = prop
          break
      }
    }

    if (typeof json[metaProps.name] === 'string') {
      json[metaProps.name] = json[metaProps.name].trim()
      if (json[metaProps.name]) {
        row.name = json[metaProps.name]
      }
    }

    if (typeof json[metaProps.ticker] === 'string') {
      json[metaProps.ticker] = json[metaProps.ticker].trim()
      if (json[metaProps.ticker]) {
        row.ticker = json[metaProps.ticker]
      }
    }

    if (json[metaProps.decimals] > 0) {
      row.decimals = parseInt(json[metaProps.decimals])
    }

    if ('description' in row && typeof json[metaProps.description] === 'string') {
      json[metaProps.description] = json[metaProps.description].trim()
      if (json[metaProps.description]) {
        row.description = json[metaProps.description]
      }
    }

    if ('url' in row && typeof json[metaProps.url] === 'string') {
      json[metaProps.url] = json[metaProps.url].trim()
      if (json[metaProps.url]) {
        row.url = json[metaProps.url]

        if (row.url.slice(0, 7) !== 'http://' && row.url.slice(0, 8) !== 'https://') {
          row.url = 'http://' + row.url
        }
      }
    }

    if ('image' in row) {
      if (Array.isArray(json[metaProps.image])) {
        json[metaProps.image] = json[metaProps.image].join('')
      }
      if (typeof json[metaProps.image] === 'string') {
        json[metaProps.image] = json[metaProps.image].trim()
        if (json[metaProps.image]) {
          row.image = json[metaProps.image]
          row.image_nonce = row.meta_id
        }
      }
    }
  }

  const token = registry[subject]

  if (token) {
    if (token.name) {
      row.name = token.name
    }

    if (token.ticker) {
      row.ticker = token.ticker
    }

    if (token.decimals > 0) {
      row.decimals = token.decimals
    }

    if ('description' in row && token.description) {
      row.description = token.description
    }

    if ('url' in row && token.url) {
      row.url = token.url
    }

    if ('image' in row && token.logo) {
      row.image = token.logo
      row.image_nonce = token.time
    }
  }

  try {
    const punycode_name = punycode.toUnicode(row.asset_name)

    if (punycode_name !== row.asset_name) {
      row.emoji = punycode_name
    }
  } catch {}

  delete row.meta_id
  delete row.meta_data

  if (needMeta && json && typeof json === 'object') {
    row.metadata = json
  }

  if (row.name === '' && row.asset_name === '') {
    const cip86Label = cip68LabelMap[row.asset_name_hex.slice(0, 8) as keyof typeof cip68LabelMap]

    if (cip86Label) {
      const hexName = row.asset_name_hex.slice(8)

      const buffer = Buffer.from(hexName, 'hex')

      try {
        const name = buffer.toString('utf-8')

        if (Buffer.from(name, 'utf-8').equals(buffer)) {
          row.asset_name = name
        }
      } catch {}

      if (row.asset_name) {
        row.asset_name = cip86Label + row.asset_name
        row.name = row.asset_name
      } else {
        row.asset_name = cip86Label + hexName
      }
    }
  }

  if (subject in registry && row.genuine === null) {
    row.genuine = true
  }
}

export const get = (subject: string) => {
  return registry[subject]
}

export const find = (query: string) => {
  for (const token of Object.values(registry)) {
    if (query === token.name.toLowerCase() || query === token.ticker.toLowerCase()) {
      return token
    }
  }
}

// https://github.com/IntersectMBO/cardano-node/blob/1.26.1-with-cardano-cli/doc/reference/simple-scripts.md
export const mintingCheck = (script: AnyObject, slotNow: number) => {
  const { type, scripts } = script

  if (type === 'sig' || type === 'after') {
    return true
  } else if (type === 'before') {
    return slotNow < script.slot
  }

  let left = script.required || (type === 'all' ? scripts.length : 1)

  for (const scrpt of scripts) {
    if (mintingCheck(scrpt, slotNow)) {
      left--

      if (!left) {
        return true
      }
    }
  }

  return left <= 0
}

export const init = async (): Promise<void> => {
  const now = Date.now()

  if (initTime + cacheTime < now) {
    initTime = now

    try {
      await execFile('git', ['clone', registryUrl], { cwd: registryDir })
    } catch {
      try {
        await exec('git reset --hard HEAD', { cwd: jsonDir })
        await exec('git pull', { cwd: jsonDir })
      } catch (err) {
        logger.error(err)
      }
    }

    try {
      const fileList = await readdir(jsonDir),
        newTokens: Registry = {},
        newRegistry: Registry = {}

      for (const file of fileList) {
        if (extname(file) === '.json') {
          const jsonFile = join(jsonDir, file)

          const fileData = await readFile(jsonFile, 'utf8'),
            json = JSON.parse(fileData)

          if (
            typeof json?.subject === 'string' &&
            json.subject.length % 2 === 0 &&
            /^[0-9A-Fa-f]{56,120}$/.test(json.subject)
          ) {
            const subject = json.subject.toLowerCase(),
              fileStat = await stat(jsonFile),
              mtime = Math.trunc(fileStat.mtimeMs)

            if (registry[subject]?.time === mtime) {
              newRegistry[subject] = registry[subject]
            } else {
              newRegistry[subject] = newTokens[subject] = {
                name: json.name?.value || '',
                description: json.description?.value || '',
                ticker: json.ticker?.value || '',
                url: json.url?.value || '',
                logo: json.logo?.value || '',
                decimals: json.decimals?.value || 0,
                policy: subject.slice(0, 56),
                nameHex: subject.slice(56),
                time: mtime,
              }
            }
          }
        }
      }

      for (const [subject, token] of Object.entries(newTokens)) {
        if (token.logo) {
          const logo = `${subject}.webp`,
            logoFile = join(logoDir, logo)

          try {
            const fileStat = await stat(logoFile),
              mtime = Math.trunc(fileStat.mtimeMs)

            if (mtime >= token.time) {
              token.logo = logo
            }
          } catch (err) {
            if ((err as any)?.code !== 'ENOENT') {
              throw err
            }
          }

          if (token.logo !== logo) {
            try {
              const buffer = Buffer.from(token.logo, 'base64')

              await sharp(buffer, { limitInputPixels: 12_000_000 })
                .resize({ width: 512, height: 512, fit: 'contain' })
                .webp()
                .toFile(logoFile)

              token.logo = logo
            } catch (err) {
              if ((err as any)?.message !== 'Input buffer contains unsupported image format') {
                logger.error(err, `Token ${subject} logo error`)
              }

              token.logo = registry[subject]?.logo || ''
            }
          }
        }
      }

      registry = newRegistry

      try {
        const logoList = await readdir(logoDir)

        for (const logo of logoList) {
          const logoExt = extname(logo),
            subject = basename(logo, logoExt)

          if (logoExt === '.webp' && registry[subject]?.logo !== logo) {
            await rm(join(logoDir, logo), { force: true })
          }
        }
      } catch (err) {
        logger.error(err)
      }
    } catch (err) {
      logger.error(err)
    }
  }
}
