import { getToken } from '@auth/core/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export default async function middleware(request: NextRequest) {
  let cookieName = 'authjs.session-token'
  if (process.env.NODE_ENV === 'production') {
    cookieName = '__Secure-' + cookieName
  }

  // Attempt to get the token to verify its existence
  const token = await getToken({
    req: request,
    salt: cookieName, // Ensure this matches how cookies are named in your getToken logic
    secret: String(process.env.AUTH_SECRET),
  })

  /** Handle Payload Logout as we can't set cookies in afterLogout hook */
  if (request.nextUrl.pathname === '/admin/logout' && request.cookies.get(cookieName)?.value) {
    const response = NextResponse.redirect(new URL('/', request.url), { status: 307 })
    response.headers.set(
      'Set-Cookie',
      `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`,
    )

    return response
  }

  return NextResponse.next()
}
