import 'server-only'
import fetchJson from '@/utils/fetchJson'
import { GitHub, generateState } from 'arctic'
import { cookies } from 'next/headers'
import type { User } from '~/payload-types'
import { NextResponse, type NextRequest } from 'next/server'
const DEFAULE_ROLE = process.env.NODE_ENV === 'development' ? 'admin' : 'user'

type OAuthUser = {
  email: string
  name: string
  imageUrl: string
  role: User['role']
  accounts: User['accounts']
}

const github = new GitHub(process.env.AUTH_GITHUB_ID!, process.env.AUTH_GITHUB_SECRET!)

export const authProviders = {
  github: {
    cookieName: 'github_oauth_state',
    createAuthorizationResponse: async (options?: any) => {
      const state = generateState()
      const url = await github.createAuthorizationURL(state, options)
      cookies().set(authProviders.github.cookieName, state, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: 'lax',
      })

      return NextResponse.redirect(url)
    },
    async exchangeCodeForUser(
      request: NextRequest,
    ): Promise<{ user: OAuthUser; providerAccountId: string }> {
      const code = request.nextUrl.searchParams.get('code')
      if (!code) throw new Error('Authorization code not found.')

      const tokens = await github.validateAuthorizationCode(code)
      const githubUser = await fetchJson('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      return {
        providerAccountId: String(githubUser.id),
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

export default authProviders
