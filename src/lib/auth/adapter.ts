import 'server-only'
import { getPayload } from '@/lib/payload'
import { COLLECTION_SLUG_SESSIONS, COLLECTION_SLUG_USER } from '@/payload/collections'
import type { AdapterUser } from '@auth/core/adapters'
import type { Adapter, AdapterUser as BaseAdapterUser } from 'next-auth/adapters'
import { alphabet, generateRandomString } from 'oslo/crypto'
import type { User } from '~/payload-types'
import { DEFAULT_FIELDS_USER_IS_NOT_ALLOWED_TO_CHANGE, DEFAULT_USER_ROLE, SESSION_MAX_AGE } from './config'
import { isWithinExpirationDate } from 'oslo'

declare module '@auth/core/adapters' {
  interface AdapterUser extends BaseAdapterUser, User {}
}

type CollectionTypeMap = {
  users: typeof COLLECTION_SLUG_USER
  sessions: typeof COLLECTION_SLUG_SESSIONS
}

type PayloadAdapterOptions = {
  collectionNames?: Partial<CollectionTypeMap>
  defaultUserRole?: string
  fieldsUserIsNotAllowedToChange?: string[]
  defaultMaxAge?: number
}

export function PayloadAdapter(options: PayloadAdapterOptions = {}): Adapter {
  options.collectionNames ??= {}
  options.collectionNames.users ??= COLLECTION_SLUG_USER
  options.collectionNames.sessions ??= COLLECTION_SLUG_SESSIONS
  options.defaultUserRole ||= DEFAULT_USER_ROLE
  options.fieldsUserIsNotAllowedToChange ||= DEFAULT_FIELDS_USER_IS_NOT_ALLOWED_TO_CHANGE
  options.defaultMaxAge ||= SESSION_MAX_AGE

  const userCollectionName = options.collectionNames.users!
  const sessionCollectionName = options.collectionNames.sessions!

  const ensureAdapterUser = (user: User): AdapterUser => {
    return {
      ...user,
      email: user.email,
      id: user.id,
      name: user.name,
      image: user.imageUrl,
      role: user.role,
      emailVerified: user?.emailVerified ? new Date(user.emailVerified) : null,
    }
  }

  const getUserByAccount = async ({ providerAccountId, provider }: { providerAccountId: string; provider: string }) => {
    const payload = await getPayload()
    const { docs } = await payload.find({
      collection: userCollectionName,
      where: {
        'accounts.provider': { equals: provider },
        'accounts.providerAccountId': { equals: providerAccountId },
      },
    })
    const user = docs.at(0)
    return user ? ensureAdapterUser(user) : null
  }

  return {
    async createUser(data) {
      const userData = {
        ...data,
        password: generateRandomString(32, alphabet('a-z', '0-9')),
        imageUrl: data.image,
        role: options.defaultUserRole,
      }

      const payload = await getPayload()
      if (process.env.AUTH_VERPOSE) {
        console.log('createUser', data)
      }
      const user = await payload.create({
        collection: userCollectionName,
        // @ts-ignore
        data: userData,
      })
      return ensureAdapterUser(user) || null
    },

    async getUser(id) {
      const payload = await getPayload()
      const user = await payload.findByID({
        collection: userCollectionName,
        id,
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('getUser', user, 'id', id)
      }
      return ensureAdapterUser(user) || null
    },

    async getUserByEmail(email) {
      const payload = await getPayload()
      const { docs } = await payload.find({
        collection: userCollectionName,
        where: { email: { equals: email } },
      })
      const user = docs.at(0)
      if (process.env.AUTH_VERPOSE) {
        console.log('getUserByEmail', docs.at(0), 'email', email)
      }
      return user ? ensureAdapterUser(user) : null
    },

    async updateUser(data) {
      const payload = await getPayload()
      ;(options.fieldsUserIsNotAllowedToChange || []).forEach((field: string) => {
        // @ts-ignore
        if (field in data) delete data[field]
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('updateUser', data)
      }
      const { docs } = await payload.update({
        collection: userCollectionName,
        id: data.id,
        // @ts-ignore
        data,
      })
      const user = docs.at(0)
      if (!user) {
        throw new Error('PayloadAdapter: updateUser: no user found')
      }
      return ensureAdapterUser(user)
    },

    async deleteUser(id) {
      const payload = await getPayload()
      if (process.env.AUTH_VERPOSE) {
        console.log('deleteUser', id)
      }
      await payload.delete({
        collection: userCollectionName,
        id,
      })
    },

    async linkAccount(data) {
      const payload = await getPayload()
      const user = await payload.findByID({
        collection: userCollectionName,
        id: data.userId,
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('linkAccount', user, 'data', data)
      }
      if (!user) return null
      const updatedUser = await payload.update({
        collection: userCollectionName,
        id: data.userId,
        data: {
          accounts: [...(user?.accounts || []), data],
        },
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('linkAccount -> updatedUser', updatedUser)
      }
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const payload = await getPayload()
      const user = await getUserByAccount({ provider, providerAccountId })
      if (!user || !Array.isArray(user?.accounts)) return
      const updatedAccounts = user.accounts.filter((account) => account.provider !== provider || account.providerAccountId !== providerAccountId)
      await payload.update({
        collection: userCollectionName,
        id: user.id,
        data: {
          accounts: updatedAccounts,
        },
      })
    },

    async createVerificationToken({ identifier, token, expires }) {
      const payload = await getPayload()
      const { docs } = await payload.find({
        collection: userCollectionName,
        where: { email: { equals: identifier } },
      })
      const user = docs.at(0)
      if (process.env.AUTH_VERPOSE) {
        console.log('createVerificationToken', 'identifier', identifier, 'user', user, 'token', token, 'expires', expires)
      }
      if (!user) return null
      await payload.update({
        collection: userCollectionName,
        id: user.id,
        data: {
          verificationTokens: [...(user?.verificationTokens || []), { identifier, token, expires: expires.toISOString() }],
        },
      })
      return {
        token,
        expires,
        identifier,
      }
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const user = await getUserByAccount({ provider, providerAccountId })
      if (process.env.AUTH_VERPOSE) {
        console.log('getUserByAccount', user, 'providerAccountId', providerAccountId, 'provider', provider)
      }
      return user || null
    },

    async createSession({ sessionToken, userId, expires }) {
      const payload = await getPayload()
      if (process.env.AUTH_VERPOSE) {
        console.log('createSession', sessionToken, userId, expires)
      }
      const session = await payload.create({
        collection: COLLECTION_SLUG_SESSIONS,
        data: { sessionToken, user: userId, expires: expires.toISOString() },
      })
      const sessionUserId = typeof session?.user === 'string' ? session?.user : session?.user?.id
      const sessionExpires = session?.expires ? new Date(session.expires) : new Date(Date.now() + options.defaultMaxAge!)
      return {
        sessionToken: session?.sessionToken,
        userId: sessionUserId,
        expires: sessionExpires,
      }
    },

    async getSessionAndUser(sessionToken) {
      const payload = await getPayload()
      const { docs: sessions } = await payload.find({
        collection: sessionCollectionName,
        where: { sessionToken: { equals: sessionToken } },
        depth: 1,
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('getSessionAndUser', sessions, 'sessionToken', sessionToken)
      }
      const session = sessions.at(0)
      if (!session) return null
      const sessionExpires = new Date(session.expires)

      if (!isWithinExpirationDate(sessionExpires)) {
        await payload.delete({
          collection: sessionCollectionName,
          where: { sessionToken: { equals: sessionToken } },
        })
        if (process.env.AUTH_VERPOSE) {
          console.log('Deleted expired session', sessionToken)
        }
        return null
      }

      if (typeof session?.user !== 'object') return null
      return {
        session: {
          sessionToken: session?.sessionToken,
          userId: session?.user?.id,
          expires: sessionExpires,
        },
        user: ensureAdapterUser(session?.user),
      }
    },

    async updateSession({ sessionToken, expires }) {
      const payload = await getPayload()
      const { docs } = await payload.find({
        collection: sessionCollectionName,
        where: { sessionToken: { equals: sessionToken } },
      })
      if (process.env.AUTH_VERPOSE) {
        console.log('updateSession', sessionToken, expires)
      }
      const session = docs.at(0)
      if (!session || !expires) return null

      const updatedSession = await payload.update({
        collection: sessionCollectionName,
        id: session.id,
        data: { expires: expires.toISOString() },
      })
      const sessionUserId = typeof updatedSession?.user === 'string' ? updatedSession?.user : updatedSession?.user?.id
      return {
        sessionToken: updatedSession?.sessionToken,
        userId: sessionUserId,
        expires: new Date(updatedSession?.expires),
      }
    },

    async deleteSession(sessionToken) {
      const payload = await getPayload()
      await payload.delete({
        collection: sessionCollectionName,
        where: { sessionToken: { equals: sessionToken } },
      })
    },
  }
}
