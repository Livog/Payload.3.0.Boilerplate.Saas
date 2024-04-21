import type { NextRequest } from 'next/server'
import { getAuthResponseWithCookie } from '@/lib/auth/utils'
import authProviders from '@/lib/auth/providers'
import { AUTH_REDIRECT_COOKIE_NAME } from '@/lib/auth/const'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: keyof typeof authProviders } },
): Promise<Response> {
  const provider = String(params?.provider) as keyof typeof authProviders
  if (!provider || !(provider in authProviders))
    return new Response('Invalid provider.', { status: 400 })
  const response = await getAuthResponseWithCookie({ provider, request })
  const redirectTo = request.cookies.get(AUTH_REDIRECT_COOKIE_NAME)?.value
  if (redirectTo) response.headers.set('Location', decodeURIComponent(redirectTo))
  cookies().delete(AUTH_REDIRECT_COOKIE_NAME)
  return response
}
