import { fetchBytes, resolveUrl } from '@/helpers/url.ts'
import logger from '@/logger.ts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

export const loadImage = async (name: string, dir: string) => {
  try {
    return await readFile(join(dir, name + '.webp'))
  } catch (err) {
    if ((err as any)?.code !== 'ENOENT') {
      logger.error(err)
    }
  }
}

export const saveImage = async (name: string, dir: string, data?: Buffer) => {
  await mkdir(dir, { recursive: true })

  if (data) {
    try {
      await writeFile(join(dir, name + '.webp'), data, 'binary')

      return true
    } catch (err) {
      logger.error(err)
    }
  }
}

export const resolveImage = async (url: string) => {
  url = resolveUrl(url)

  if (url.startsWith('https://github.com/')) {
    url += (url.includes('?') ? '&' : '?') + 'raw=true'
  } else if (url.startsWith('data:image/')) {
    const [meta, data] = url.split(',', 2)

    if (data) {
      return meta?.includes(';base64') ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data))
    }
  }

  return await fetchBytes(url, 5 * 1024 * 1024, 10)
}

export const convertImage = async (data: Uint8Array, size?: number) => {
  try {
    const image = sharp(data, { animated: true })

    if (size) {
      image.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    }

    image.webp()

    return await image.toBuffer()
  } catch (err) {
    if ((err as any)?.message !== 'Input buffer contains unsupported image format') {
      throw err
    }
  }
}
