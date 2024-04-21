import { AUTH_REDIRECT_QUERY_PARAM, PAYLOAD_COOKIE_NAME } from '@/lib/auth/const'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  cookies().delete(PAYLOAD_COOKIE_NAME)
  const redirectTo = request.nextUrl.searchParams.get(AUTH_REDIRECT_QUERY_PARAM)
  if (redirectTo) return redirect(decodeURIComponent(redirectTo))
  return redirect('/')
}
