import { auth, signOut } from '@/lib/auth'
import { cookies } from 'next/headers'
import type { CollectionConfig } from 'payload/types'

export const COLLECTION_SLUG_USER = 'users'

export const user: CollectionConfig = {
  slug: COLLECTION_SLUG_USER,
  auth: {
    strategies: [
      {
        name: 'next-auth',
        /** @ts-ignore */
        authenticate: async ({ headers, cookies, payload }) => {
          const req = {
            headers,
            cookies: cookies != null ? Object.fromEntries(cookies) : null,
            payload,
          } as any

          const res = {
            getHeader() {},
            setCookie() {},
            setHeader() {},
            appendHeader() {},
          } as any

          const session = await auth(req, res)
          if (!session || typeof session?.user?.email !== 'string') return null
          const { docs } = await payload.find({
            collection: COLLECTION_SLUG_USER,
            where: { email: { equals: session.user?.email } },
          })
          const user = docs?.at(0) || null
          return {
            ...user,
            collection: COLLECTION_SLUG_USER,
          }
        },
      },
    ],
  },
  access: {},
  fields: [
    { name: 'role', type: 'select', options: ['admin', 'user'] },
    {
      name: 'accounts',
      type: 'array',
      saveToJWT: false,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'provider', type: 'text', admin: { readOnly: true } },
            { name: 'providerAccountId', type: 'text', admin: { readOnly: true } },
          ],
        },
      ],
    },
    {
      name: 'verificationTokens',
      type: 'array',
      saveToJWT: false,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'identifier', type: 'text', admin: { readOnly: true } },
            { name: 'token', type: 'text', admin: { readOnly: true } },
            { name: 'expires', type: 'date', admin: { readOnly: true } },
          ],
        },
      ],
    },
  ],
}

export const session: CollectionConfig = {
  slug: 'sessions',
  auth: false,
  access: {
    update: () => false,
    delete: () => false,
  },
  fields: [],
}
