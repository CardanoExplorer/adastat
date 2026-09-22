import { fetchLogo as fetchDrepLogo } from '@/helpers/dreps.ts'
import { resolveImage, saveImage } from '@/helpers/images.ts'
import { fetchLogo as fetchPoolLogo } from '@/helpers/pools.ts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  fetchBytes: vi.fn(),
}))

vi.mock('@/config.ts', () => ({ rootDir: '/isolated-logo-tests' }))
vi.mock('@/logger.ts', () => ({ default: { error: mocks.error, warn: mocks.warn } }))
vi.mock('@/helpers/url.ts', () => ({ resolveUrl: (url: string) => url, fetchBytes: mocks.fetchBytes }))
vi.mock('node:fs/promises', () => ({ mkdir: mocks.mkdir, writeFile: mocks.writeFile, readFile: vi.fn() }))
vi.mock('@/helpers/maxmind.ts', () => ({}))
vi.mock('@/helpers/ouroboros.ts', () => ({}))
vi.mock('@/storage.ts', () => ({}))
vi.mock('@/db.ts', () => ({
  query: () => {
    throw new Error('Database access is prohibited in logo tests')
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.fetchBytes.mockResolvedValue(false)
})

const malformedDataUrls = ['data:image/png,%', 'data:image/png,%GG', 'data:image/png,%E0%A4']

describe('image data URL decoding', () => {
  it.each(malformedDataUrls)('handles malformed URI %s at the decoding boundary', async (url) => {
    await expect(resolveImage(url)).resolves.toBe(false)
    expect(mocks.warn).toHaveBeenCalledWith(expect.any(URIError), 'Image data URL decode error')
    expect(mocks.error).not.toHaveBeenCalled()
  })
})

const logoLoaders = [
  ['pool', (url: string) => fetchPoolLogo('pool-test', { info: { url_png_logo: url } })],
  ['DRep', (url: string) => fetchDrepLogo('drep-test', url)],
] as const

describe.each(logoLoaders)('%s logo error handling', (_name, fetchLogo) => {
  it.each(malformedDataUrls)('handles malformed URI %s without rejecting the background task', async (url) => {
    await expect(fetchLogo(url)).resolves.toBe(false)
    expect(mocks.warn).toHaveBeenCalledWith(expect.any(URIError), 'Image data URL decode error')
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it('skips an image when fetching returns no data', async () => {
    mocks.fetchBytes.mockResolvedValueOnce(false)

    await expect(fetchLogo('https://metadata.invalid/logo.png')).resolves.toBe(false)
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it.each(['base64', 'percent-encoded'])('still converts a valid %s image', async (encoding) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>'
    const url =
      encoding === 'base64'
        ? `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        : `data:image/svg+xml,${encodeURIComponent(svg)}`

    const result = await fetchLogo(url)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.stringContaining('.webp'), result, 'binary')
    expect(mocks.error).not.toHaveBeenCalled()
  })
})

describe('background image persistence', () => {
  it('handles directory creation failure without rejecting', async () => {
    const err = new Error('Directory creation failed')
    mocks.mkdir.mockRejectedValueOnce(err)

    await expect(saveImage('logo-test', '/isolated-logo-tests', Buffer.from('image'))).resolves.toBeUndefined()
    expect(mocks.error).toHaveBeenCalledWith(err)
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it('handles file write failure without rejecting', async () => {
    const err = new Error('Image write failed')
    mocks.writeFile.mockRejectedValueOnce(err)

    await expect(saveImage('logo-test', '/isolated-logo-tests', Buffer.from('image'))).resolves.toBeUndefined()
    expect(mocks.error).toHaveBeenCalledWith(err)
  })
})
