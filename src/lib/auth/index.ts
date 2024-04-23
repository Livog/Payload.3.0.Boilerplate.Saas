import 'server-only'
import { getFieldsToSign, getSanitizedUserCollection } from '@/lib/payload'
import { COLLECTION_SLUG_USER } from '@/payload/collections'
import NextAuth from 'next-auth'
import { getFieldsToSign as getFieldsToSignPayload } from 'payload/auth'
import { PayloadAdapter } from './adapter'
import authConfig from './config'

export const { auth, handlers, signIn, signOut } = NextAuth((req) => {
  return {
    adapter: PayloadAdapter(),
    callbacks: {
      async jwt({ token, user }) {
        const userId = (token?.id || token?.sub || user?.id) as string | number
        const fieldsToSign = await getFieldsToSign(userId)
        token = {
          ...token,
          ...(fieldsToSign || {}),
        }
        return token
      },
      async session({ session, token }) {
        session.user = session.user || {}
        const sanitizedUsersCollection = await getSanitizedUserCollection()
        if (!sanitizedUsersCollection || !token) return session
        const fieldsToSign = getFieldsToSignPayload({
          // @ts-ignore
          user: token,
          email: session.user.email,
          collectionConfig: sanitizedUsersCollection,
        })

        session.user = {
          ...fieldsToSign,
          ...session.user,
          // @ts-ignore
          collection: COLLECTION_SLUG_USER,
        }

        return session
      },
    },
    ...authConfig,
  }
})
