import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from '@auth/core/jwt'
import { getAuthJsCookieName } from '@/lib/auth/edge'
import { SESSION_STRATEGY } from '@/lib/auth/config'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}

const mutatResponseToRemoveAuthJsCookie = (response: NextResponse): NextResponse => {
  const cookieName = getAuthJsCookieName()
  response.cookies.set(cookieName, '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  })
  return response
}

const handleLogoutResponse = async (request: NextRequest): Promise<NextResponse | true> => {
  if (request.nextUrl.pathname !== '/admin/logout') return true
  const response = NextResponse.redirect(new URL('/', request.url))
  mutatResponseToRemoveAuthJsCookie(response)
  return response
}

const validateJwtTokenAndLogoutOnFailure = async (request: NextRequest): Promise<NextResponse | true> => {
  const cookieName = getAuthJsCookieName()
  const cookieValue = request.cookies.get(cookieName)?.value
  if (!cookieValue) return true // No cookie to remove
  const token = await getToken({
    req: request,
    salt: cookieName,
    secret: process.env.AUTH_SECRET!
  })
  if (token != null) return true
  const response = NextResponse.redirect(request.url)
  mutatResponseToRemoveAuthJsCookie(response)
  return response
}

export default async function middleware(request: NextRequest) {
  const sequentialMiddlewares = [handleLogoutResponse]
  if (SESSION_STRATEGY === 'jwt') sequentialMiddlewares.push(validateJwtTokenAndLogoutOnFailure)

  for (const check of sequentialMiddlewares) {
    const result = await check(request)
    if (result !== true) {
      return result
    }
  }

  return NextResponse.next()
}
