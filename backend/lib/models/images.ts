import { throwError } from '@/helper.ts'
import { createLogo as createDRepLogo, fetchLogo as fetchDRepLogo, getLogo as getDRepLogo } from '@/helpers/dreps.ts'
import { createLogo as createPoolLogo, fetchLogo as fetchPoolLogo, getLogo as getPoolLogo } from '@/helpers/pools.ts'
import { getLogo as getTokenLogo } from '@/helpers/tokens.ts'
import type { AnyObject } from '@/types/shared.js'

export const getPoolImage = async (itemId: string, extendedData?: AnyObject) => {
  const image =
    (await getPoolLogo(itemId)) || (await fetchPoolLogo(itemId, extendedData)) || (await createPoolLogo(itemId))

  if (!image) {
    return throwError(500)
  }

  return image
}

export const getTokenImage = async (itemId: string, logo?: string) => {
  if (!logo) {
    return throwError(404)
  }

  const image = await getTokenLogo(itemId)

  if (!image) {
    return throwError(500)
  }

  return image
}

export const getDRepImage = async (itemId: string, logo?: string, name?: string) => {
  const image =
    (await getDRepLogo(itemId)) || (await fetchDRepLogo(itemId, logo)) || (await createDRepLogo(itemId, name))

  if (!image) {
    return throwError(500)
  }

  return image
}
