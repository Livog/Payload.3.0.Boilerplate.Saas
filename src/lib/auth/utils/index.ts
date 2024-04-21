import 'server-only'
import { getPayload } from '@/lib/payload'
import { COLLECTION_SLUG_USER } from '@/payload/collections/users'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { TimeSpan } from 'oslo'
import { createJWT } from 'oslo/jwt'
import type { Payload } from 'payload'
import { generatePayloadCookie, getFieldsToSign } from 'payload/auth'
import { SanitizedCollectionConfig } from 'payload/types'
import type { User } from '~/payload-types'
import { getPayloadSecret } from '@/lib/auth/utils/edge'
import authProviders from '@/lib/auth/providers'
import type { NextRequest } from 'next/server'

type UserIdentifier =
  | { id: string }
  | { email: string; provider?: string; providerAccountId?: string }
  | { provider: string; providerAccountId: string; email?: string }

export async function generatePayloadAuthCookie({
  payload,
  user,
  usersCollection,
}: {
  payload: Payload
  user: User
  usersCollection: SanitizedCollectionConfig
}) {
  const fieldsToSign = getFieldsToSign({
    collectionConfig: usersCollection,
    email: user.email,
    user: {
      ...user,
      /** @ts-ignore */
      collection: usersCollection.slug,
    },
  })

  const now = Math.floor(Date.now() / 1000)
  const tokenExpiration =
    typeof usersCollection?.auth?.tokenExpiration === 'number'
      ? usersCollection.auth.tokenExpiration
      : 7200

  const expTime = now + tokenExpiration
  const secret = await getPayloadSecret()

  const token = await createJWT('HS256', new TextEncoder().encode(secret), fieldsToSign, {
    expiresIn: new TimeSpan(expTime, 'ms'),
    includeIssuedTimestamp: true,
  })

  const cookie = generatePayloadCookie({
    collectionConfig: usersCollection,
    payload,
    token,
  })

  return cookie
}

export async function findOrCreateUser(
  criteria: UserIdentifier,
  userData: User,
): Promise<{ user: User; payload: Payload } | null> {
  const payload = await getPayload()

  // Attempt to find the user by email.
  if ('email' in criteria) {
    const { docs } = await payload.find({
      collection: COLLECTION_SLUG_USER,
      where: { email: { equals: criteria.email } },
    })
    let user = docs?.at(0) || null

    // If a user is found, check and add provider data if necessary, then return.
    if (user) {
      if ('provider' in criteria && 'providerAccountId' in criteria) {
        const existingAccount = user.accounts?.some(
          (acc) =>
            acc.provider === criteria.provider &&
            acc.providerAccountId === criteria.providerAccountId,
        )

        if (!existingAccount) {
          user.accounts ??= []
          user.accounts.push({
            provider: criteria.provider,
            providerAccountId: criteria.providerAccountId,
          })
          user = await payload.update({
            collection: COLLECTION_SLUG_USER,
            id: user.id,
            data: user,
          })
        }
      }
      return user ? { user, payload } : null
    }
  }

  // Attempt to find the user by provider if email is not given or user not found by email.
  if ('provider' in criteria && 'providerAccountId' in criteria) {
    const { docs } = await payload.find({
      collection: COLLECTION_SLUG_USER,
      where: {
        'accounts.provider': { equals: criteria.provider },
        'accounts.providerAccountId': { equals: criteria.providerAccountId },
      },
    })
    let user = docs?.at(0) || null

    // Return if user found by provider.
    if (user) {
      return { user, payload }
    }
  }

  // If no user is found by any means, create a new user.
  const newUser = await payload.create({
    collection: COLLECTION_SLUG_USER,
    data: {
      ...userData,
      /** @ts-ignore */
      password: generateRandomBytesHex(32), // Generate a random password
      accounts:
        'provider' in criteria && 'providerAccountId' in criteria
          ? [
              {
                provider: criteria.provider,
                providerAccountId: criteria.providerAccountId,
              },
            ]
          : [],
    },
  })

  return { user: newUser, payload }
}

type AuthCookieParams = {
  provider: keyof typeof authProviders
  request: NextRequest
}

export async function getAuthResponseWithCookie({
  provider,
  request,
}: AuthCookieParams): Promise<Response> {
  const state = request.nextUrl.searchParams.get('state')
  const storedState = cookies().get(authProviders[provider].cookieName)?.value ?? null
  const providerConfig = authProviders[provider] ?? null

  if (!state || !storedState || state !== storedState) {
    return new Response(null, { status: 400, statusText: 'Invalid or missing state.' })
  }

  if (!providerConfig) {
    return new Response(null, { status: 400, statusText: 'Invalid provider.' })
  }

  try {
    const { user: userData, providerAccountId } = await providerConfig.exchangeCodeForUser(request)
    const userResponse = await findOrCreateUser(
      {
        provider,
        providerAccountId,
        email: userData?.email,
      },
      // @ts-ignore
      userData,
    )

    if (!userResponse) return new Response('Error finding or creating user.', { status: 500 })
    const config = await configPromise
    const sanitizedUsersCollectionConfig = config.collections.find(
      (c) => c.slug === COLLECTION_SLUG_USER,
    )
    if (!sanitizedUsersCollectionConfig)
      return new Response('Could not find users collection.', { status: 500 })
    const { user, payload } = userResponse
    if (user) {
      const cookie = await generatePayloadAuthCookie({
        payload,
        user,
        usersCollection: sanitizedUsersCollectionConfig,
      })
      cookies().delete(authProviders[provider].cookieName)
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
          'Set-Cookie': cookie,
        },
      })
    }

    return new Response(null, { status: 302, headers: { Location: '/' } })
  } catch (e) {
    console.error('OAuth Error:')
    return new Response(null, { status: 500, statusText: 'OAuth process error.' })
  }
}
