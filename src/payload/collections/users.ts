import { getSessionAndUser, getUserByEmail } from '@/lib/auth/adapter'
import { ADMIN_ACCESS_ROLES, SESSION_STRATEGY } from '@/lib/auth/config'
import { getAuthJsCookieName } from '@/lib/auth/edge'
import parseCookieString from '@/utils/parseCookieString'
import { getToken } from '@auth/core/jwt'
import type { CollectionConfig } from 'payload/types'
import { isAdmin, isAdminOrCurrentUser } from '@/payload/access'

const mockRequestAndResponseFromHeadersForNextAuth = (headers: Headers) => {
  const request = {
    headers
  } as any

  const response = {
    getHeader() {},
    setCookie() {},
    setHeader() {},
    appendHeader() {}
  } as any

  return { request, response }
}

export const COLLECTION_SLUG_USER = 'users' as const
export const COLLECTION_SLUG_SESSIONS = 'sessions' as const

export const users: CollectionConfig = {
  slug: COLLECTION_SLUG_USER,
  endpoints: [
    {
      path: '/refresh-token',
      method: 'post',
      async handler(request) {
        if (!request?.url) return new Response('No request URL provided', { status: 400 })

        const requestUrl = new URL(request.url)
        requestUrl.pathname = '/api/auth/session'

        const newRequest = new Request(requestUrl.toString(), {
          method: 'GET',
          headers: new Headers(request.headers)
        })

        try {
          const response = await fetch(newRequest)
          const data = await response.json()

          if (!response.ok) {
            throw new Error('Failed to refresh token')
          }

          const responseCookies = parseCookieString(String(response.headers.get('Set-Cookie') || ''))
          const authCooke = responseCookies?.[getAuthJsCookieName()] ?? null

          const responseBody = JSON.stringify({
            message: 'Token refresh successful',
            refreshToken: authCooke?.value,
            exp: authCooke && authCooke?.expires ? Math.floor(authCooke.expires.getTime() / 1000) : null,
            user: data.user
          })

          return new Response(responseBody, {
            status: response.status,
            headers: response.headers
          })
        } catch (error) {
          console.log(error)
          return new Response(JSON.stringify({ message: 'Token refresh failed' }), { status: 401 })
        }
      }
    }
  ],
  auth: {
    strategies: [
      {
        name: 'next-auth',
        /** @ts-ignore */
        authenticate: async ({ cookies, headers, payload }) => {
          const authJsCookieName = getAuthJsCookieName()
          const authCookieValue = cookies?.get(authJsCookieName)
          if (!authCookieValue) return null
          const isJwt = (authCookieValue || '').startsWith('eyJ') // Loose check if is JWT.
          if ((SESSION_STRATEGY === 'database' && isJwt) || (SESSION_STRATEGY === 'jwt' && !isJwt)) return null // We just switched between strategies, all old sessions are invalid.
          if (SESSION_STRATEGY === 'database') {
            const maybeSessionAndUser = await getSessionAndUser({ payload, sessionToken: authCookieValue, collection: COLLECTION_SLUG_SESSIONS })
            if (!maybeSessionAndUser) return null
            return {
              ...maybeSessionAndUser.user,
              collection: COLLECTION_SLUG_USER
            }
          }
          if (SESSION_STRATEGY === 'jwt') {
            const { request } = mockRequestAndResponseFromHeadersForNextAuth(headers)
            const token = await getToken({
              req: request,
              salt: authJsCookieName,
              secret: process.env.AUTH_SECRET!
            })
            // @ts-ignore
            if (!token || typeof token?.email !== 'string' || !token?.role || !ADMIN_ACCESS_ROLES.includes(token?.role)) {
              return null
            }
            const user = await getUserByEmail({ payload, email: token.email, collection: COLLECTION_SLUG_USER })
            if (!user) return null
            return {
              ...user,
              collection: COLLECTION_SLUG_USER
            }
          }
          return null
        }
      }
    ]
  },
  access: {
    read: isAdminOrCurrentUser,
    create: isAdmin,
    update: isAdmin,
    delete: isAdminOrCurrentUser
  },
  fields: [
    { name: 'name', type: 'text', saveToJWT: true },
    { name: 'imageUrl', type: 'text', saveToJWT: true },
    { name: 'role', type: 'select', options: ['admin', 'user'], saveToJWT: true },
    { name: 'emailVerified', type: 'date' },
    {
      name: 'accounts',
      type: 'array',
      saveToJWT: false,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'provider', type: 'text', admin: { readOnly: true } },
            { name: 'providerAccountId', type: 'text', admin: { readOnly: true } }
          ]
        }
      ]
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
            { name: 'expires', type: 'date', admin: { readOnly: true } }
          ]
        }
      ]
    }
  ]
} as const

export const sessions: CollectionConfig = {
  slug: COLLECTION_SLUG_SESSIONS,
  access: {
    read: isAdminOrCurrentUser,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: COLLECTION_SLUG_USER, required: true, admin: { readOnly: false } },
    { name: 'sessionToken', type: 'text', required: true, index: true, admin: { readOnly: false } },
    { name: 'expires', type: 'date', admin: { readOnly: false, date: { pickerAppearance: 'dayAndTime' } }, required: false }
  ]
} as const
