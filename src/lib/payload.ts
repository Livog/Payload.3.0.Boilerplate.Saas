import { getPayload as getPayloadFromPayload } from 'payload'
import configPromise from '@payload-config'
import { User } from '~/payload-types'
import { headers } from 'next/headers'

export const getPayload = async () => {
  return await getPayloadFromPayload({ config: await configPromise })
}

export const getUser = async (): Promise<User | null> => {
  const payload = await getPayload()
  const h = headers()
  const { user } = await payload.auth({ headers: h })
  return user
}
