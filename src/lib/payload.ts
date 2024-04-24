import { COLLECTION_SLUG_USER } from '@/payload/collections'
import configPromise from '@payload-config'
import { getPayload as getPayloadInstance } from 'payload'
import { getFieldsToSign as getFieldsToSignPayload } from 'payload/auth'
import { SanitizedCollectionConfig } from 'payload/types'
import type { User } from '~/payload-types'

export async function getPayload(): ReturnType<typeof getPayloadInstance> {
  return getPayloadInstance({ config: await configPromise })
}

export const getSanitizedUserCollection = async (): Promise<
  | (Omit<SanitizedCollectionConfig, 'slug'> & {
      slug: typeof COLLECTION_SLUG_USER
    })
  | null
> => {
  const config = await configPromise
  const sanitizedUsersCollection = config.collections.find((c) => c.slug === COLLECTION_SLUG_USER)
  if (!sanitizedUsersCollection) return null
  return sanitizedUsersCollection as Omit<SanitizedCollectionConfig, 'slug'> & {
    slug: typeof COLLECTION_SLUG_USER
  }
}

export async function getFieldsToSign(userId: string | number) {
  try {
    const sanitizedUsersCollection = await getSanitizedUserCollection()
    if (!sanitizedUsersCollection) return null
    const foundUser = (await (
      await getPayload()
    ).findByID({
      collection: sanitizedUsersCollection.slug,
      id: userId,
    })) as User & { collection: typeof COLLECTION_SLUG_USER }
    const fieldsToSign = getFieldsToSignPayload({
      user: foundUser,
      email: foundUser.email,
      collectionConfig: sanitizedUsersCollection,
    })
    fieldsToSign.collection = sanitizedUsersCollection.slug
    return fieldsToSign
  } catch (error) {
    console.log('ERROR getFieldsToSign')
    return null
  }
}
