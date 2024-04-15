import { auth } from '@/lib/auth'
import type { CollectionConfig } from 'payload/types'
import { parseCookies, serializeCookie } from 'oslo/cookie'

export const COLLECTION_SLUG_USER = 'users'

export const users: CollectionConfig = {
  slug: COLLECTION_SLUG_USER,
  endpoints: [
    {
      path: '/refresh-token',
      method: 'post',
      async handler(request) {
        const cookies = parseCookies(request.headers.get('Cookie') || '')
        const req = {
          headers: request.headers,
          cookies: cookies.size > 0 ? Object.fromEntries(cookies) : null,
        }
        const res = new Response()

        /** @ts-ignore */
        const session = await auth(req, res)
        const responseCookies = parseCookies(String(res.headers.getSetCookie()) || '')
        const refreshedToken = responseCookies.get('__Secure-authjs.session-token') || responseCookies.get('authjs.session-token') || null

        res.headers.set('Content-Type', 'application/json; charset=utf-8')

        if (!session || !refreshedToken) {
          res.headers.set('Set-Cookie', serializeCookie('__Secure-authjs.session-token', '', { expires: new Date(0) }))
          res.headers.set('Set-Cookie', serializeCookie('authjs.session-token', '', { expires: new Date(0) }))
          return new Response(JSON.stringify({ message: 'Token refresh failed' }), { status: 401, headers: res.headers })
        }

        return new Response(
          JSON.stringify({
            message: 'Token refresh successful',
            refreshedToken: refreshedToken,
            exp: Math.floor(new Date(String(session?.expires)).getTime() / 1000),
            user: session?.user,
          }),
          {
            status: 200,
            headers: res.headers,
          },
        )
      },
    },
  ],
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
    { name: 'name', type: 'text', saveToJWT: true },
    { name: 'imageUrl', type: 'text', saveToJWT: true },
    { name: 'role', type: 'select', options: ['admin', 'user'], saveToJWT: true },
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

export const sessions: CollectionConfig = {
  slug: 'sessions',
  auth: false,
  access: {
    update: () => false,
    delete: () => false,
  },
  fields: [],
}
