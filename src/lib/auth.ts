// @ts-nocheck
import NextAuth from 'next-auth'
import configPromise from '@payload-config'
import type { Adapter } from 'next-auth/adapters'
import { GeneratedTypes, getPayload } from 'payload'
import GitHub from 'next-auth/providers/github'
import { randomBytes } from 'crypto'

async function getPayloadInstance(): Promise<ReturnType<typeof getPayload>> {
  return await getPayload({ config: await configPromise })
}

export const { auth, handlers, signIn, signOut } = NextAuth((req) => {
  return {
    adapter: PayloadAdapter(),
    session: { strategy: 'jwt' },
    providers: [
      GitHub({
        allowDangerousEmailAccountLinking: true,
      }),
    ],
  }
})

export function PayloadAdapter(): Adapter {
  const collectionNames: Record<string, keyof GeneratedTypes['collections']> = {
    users: 'users',
    sessions: 'sessions',
  }

  return {
    async createUser(data) {
      if (!data.password) {
        data.password = randomBytes(32).toString('hex')
      }

      const payload = await getPayloadInstance()
      return await payload.create({
        collection: collectionNames.users,
        data,
      })
    },

    async getUser(id) {
      const payload = await getPayloadInstance()
      const user = await payload.findByID({
        collection: collectionNames.users,
        id,
      })
      return user || null
    },

    async getUserByEmail(email) {
      const payload = await getPayloadInstance()
      const { docs } = await payload.find({
        collection: collectionNames.users,
        where: { email: { equals: email } },
      })
      return docs.at(0) || null
    },

    async updateUser(data) {
      const payload = await getPayloadInstance()
      return await payload.update({
        collection: collectionNames.users,
        id: data.id,
        data,
      })
    },

    async deleteUser(id) {
      const payload = await getPayloadInstance()
      await payload.delete({
        collection: collectionNames.users,
        id,
      })
    },

    async linkAccount(data) {
      const payload = await getPayloadInstance()
      const user = await payload.findByID({
        collection: collectionNames.users,
        id: data.userId,
      })
      if (!user) return null
      const updatedUser = await payload.update({
        collection: collectionNames.users,
        id: data.userId,
        data: {
          accounts: [...user.accounts, data],
        },
      })
      return updatedUser
    },

    async unlinkAccount({ userId, provider, providerAccountId }) {
      const payload = await getPayloadInstance()
      const user = await payload.findByID({
        collection: collectionNames.users,
        id: userId,
      })
      if (!Array.isArray(user?.accounts)) return null
      const updatedAccounts = user.accounts.filter(
        (account) =>
          account.provider !== provider || account.providerAccountId !== providerAccountId,
      )
      const updatedUser = await payload.update({
        collection: collectionNames.users,
        id: userId,
        data: {
          accounts: updatedAccounts,
        },
      })
      return updatedUser
    },

    async createVerificationToken(data) {
      const payload = await getPayloadInstance()
      const user = await payload.findByID({
        collection: collectionNames.users,
        id: data.userId,
      })
      if (!user) return null
      const updatedUser = await payload.update({
        collection: collectionNames.users,
        id: data.userId,
        data: {
          verificationTokens: [...user.verificationTokens, data],
        },
      })
      return updatedUser
    },

    async useVerificationToken({ userId, token }) {
      const payload = await getPayloadInstance()
      const user = await payload.findByID({
        collection: collectionNames.users,
        id: userId,
      })
      if (!user) return null
      const updatedTokens = user.verificationTokens.filter((t) => t.token !== token)
      const tokenData = user.verificationTokens.find((t) => t.token === token)
      await payload.update({
        collection: collectionNames.users,
        id: userId,
        data: {
          verificationTokens: updatedTokens,
        },
      })
      return tokenData || null
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const payload = await getPayloadInstance()
      const { docs } = await payload.find({
        collection: collectionNames.users,
        where: {
          'accounts.provider': { equals: provider },
          'accounts.providerAccountId': { equals: providerAccountId },
        },
      })
      return docs.at(0) || null
    },

    async createSession({ sessionToken, userId, expires }) {
      const payload = await getPayloadInstance()
      return await payload.create({
        collection: collectionNames.sessions,
        data: { sessionToken, userId, expires },
      })
    },

    async getSessionAndUser(sessionToken) {
      const payload = await getPayloadInstance()
      const { docs: sessions } = await payload.find({
        collection: collectionNames.sessions,
        where: { sessionToken: { equals: sessionToken } },
      })
      if (sessions.length === 0) return null
      const session = sessions.at(0)
      const user = await payload.findByID({
        collection: collectionNames.users,
        id: session.userId,
      })
      return user ? { session, user } : null
    },

    async updateSession({ sessionToken, expires }) {
      const payload = await getPayloadInstance()
      const { docs } = await payload.find({
        collection: collectionNames.sessions,
        where: { sessionToken: { equals: sessionToken } },
      })
      if (docs.length === 0) return null
      const session = docs.at(0)
      return await payload.update({
        collection: collectionNames.sessions,
        id: session.id,
        data: { expires },
      })
    },

    async deleteSession(sessionToken) {
      const payload = await getPayloadInstance()
      const { docs } = await payload.find({
        collection: collectionNames.sessions,
        where: { sessionToken: { equals: sessionToken } },
      })
      if (docs.length > 0) {
        await payload.delete({
          collection: collectionNames.sessions,
          id: docs.at(0)?.id,
        })
      }
    },
  }
}
