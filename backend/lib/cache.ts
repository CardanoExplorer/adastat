import logger from '@/logger.ts'

const cache = new Map<string, unknown>()

export const getEntry = <T>(cacheKey: string, handler: () => Promise<T>): T | Promise<T> => {
  const cacheEntry = cache.get(cacheKey) as T | Promise<T>

  if (cacheEntry) {
    if (cacheEntry instanceof Error) {
      throw cacheEntry
    }

    return cacheEntry
  }

  const promise = handler()
    .then((data) => {
      if (cache.has(cacheKey)) {
        cache.set(cacheKey, data)
      }

      return data
    })
    .catch((err) => {
      if (err?.statusCode === 404) {
        if (cache.has(cacheKey)) {
          cache.set(cacheKey, err)
        }
      } else {
        cache.delete(cacheKey)

        logger.error(err, 'Cache handler error')
      }

      throw err
    })

  cache.set(cacheKey, promise)

  return promise
}

export const clearCache = () => {
  cache.clear()
}
