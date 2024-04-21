import { AUTH_REDIRECT_COOKIE_NAME, AUTH_REDIRECT_QUERY_PARAM } from '@/lib/auth/const'
import authProviders from '@/lib/auth/providers'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: keyof typeof authProviders } },
) {
  const provider = params?.provider
  if (!provider || !(provider in authProviders))
    return new Response('Invalid provider.', { status: 400 })
  const redirect = decodeURIComponent(
    request.nextUrl.searchParams.get(AUTH_REDIRECT_QUERY_PARAM) ?? '',
  )
  if (redirect.length > 0) {
    cookies().set(AUTH_REDIRECT_COOKIE_NAME, redirect, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: 'lax',
    })
  }
  return authProviders[provider].createAuthorizationResponse()
}
