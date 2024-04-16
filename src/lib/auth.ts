import { getPayload } from '@/lib/payload'
import { COLLECTION_SLUG_USER } from '@/payload/collections/users'
import fetchJson from '@/utils/fetchJson'
import configPromise from '@payload-config'
import { GitHub } from 'arctic'
import { randomBytes } from 'crypto'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import type { Payload } from 'payload'
import { SanitizedCollectionConfig } from 'payload/types'
import { getFieldsToSign, generatePayloadCookie } from 'payload/auth'
import { User } from '~/payload-types'

const DEFAULE_ROLE = 'user' as const

type UserIdentifier = {
  collectionSlug: string
} & ({ id: string } | { email: string } | { provider: string; providerAccountId: string })

export const oauthConfigs = {
  github: {
    cookieName: 'github_oauth_state',
    signInUrl: '/api/auth/github',
    async fetchUser(url: URL): Promise<{ user: User; providerId: string }> {
      const code = url.searchParams.get('code')
      if (!code) throw new Error('Authorization code not found.')

      const tokens = await github.validateAuthorizationCode(code)
      const githubUser = await fetchJson('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      return {
        providerId: String(githubUser.id),
        /** @ts-ignore */
        user: {
          email: githubUser.email,
          name: githubUser.name,
          imageUrl: githubUser.avatar_url,
          role: DEFAULE_ROLE,
          accounts: [
            {
              provider: 'github',
              providerAccountId: String(githubUser.id),
            },
          ],
        },
      }
    },
  },
} as const

export const github = new GitHub(process.env.AUTH_GITHUB_ID!, process.env.AUTH_GITHUB_SECRET!)

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

  const token = await new SignJWT(fieldsToSign)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expTime)
    .sign(new TextEncoder().encode(payload.secret))

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

  let query = {}
  if ('id' in criteria) {
    query = { id: { equals: criteria.id } }
  } else if ('email' in criteria) {
    query = { email: { equals: criteria.email } }
  } else if ('provider' in criteria && 'providerAccountId' in criteria) {
    query = {
      'accounts.provider': { equals: criteria.provider },
      'accounts.providerAccountId': { equals: criteria.providerAccountId },
    }
  }

  if (Object.values(query).length === 0) {
    throw new Error('No query provided')
  }

  const { docs } = await payload.find({
    /** @ts-ignore */
    collection: criteria.collectionSlug,
    where: query,
  })

  let user = (docs?.at(0) as User) || null

  if (!user) {
    user = (await payload.create({
      /** @ts-ignore */
      collection: criteria.collectionSlug,
      data: {
        ...userData,
        /** @ts-ignore */
        password: randomBytes(32).toString('hex'), // Generate a random password
      },
    })) as User
  }

  return { user, payload }
}

type AuthCookieParams = {
  provider: keyof typeof oauthConfigs
  requestUrl: string
}

export async function getAuthResponseWithCookie({
  provider,
  requestUrl,
}: AuthCookieParams): Promise<Response> {
  const url = new URL(requestUrl)
  const state = url.searchParams.get('state')
  const storedState = cookies().get(oauthConfigs[provider].cookieName)?.value ?? null

  if (!state || !storedState || state !== storedState) {
    return new Response(null, { status: 400, statusText: 'Invalid or missing state.' })
  }

  try {
    const { user: userData, providerId } = await oauthConfigs[provider].fetchUser(url)
    const userResponse = await findOrCreateUser(
      {
        provider,
        providerAccountId: providerId,
        collectionSlug: COLLECTION_SLUG_USER,
      },
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
      cookies().delete(oauthConfigs[provider].cookieName)
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
