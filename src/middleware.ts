import { getPayloadSecret } from '@/lib/auth/utils/edge'
import { NextResponse, type NextRequest } from 'next/server'
import { JWT, parseJWT, validateJWT } from 'oslo/jwt'
import type { User } from '~/payload-types'

const PAYLOAD_COOKIE_NAME = 'payload-token' as const

const getAdminLoginRedirect = (request: NextRequest): NextResponse => {
  return NextResponse.redirect(new URL('/admin/login', request.url))
}

async function validateAdminAccess(request: NextRequest) {
  const { pathname } = request.nextUrl
  const secret = await getPayloadSecret()

  if (
    !pathname.startsWith('/admin') ||
    pathname === '/admin/login' ||
    pathname === '/admin/logout' ||
    pathname === '/admin/forgot'
  ) {
    return true
  }

  const token = request.cookies.get(PAYLOAD_COOKIE_NAME)?.value

  if (!token) return getAdminLoginRedirect(request)

  try {
    const decoded = parseJWT(token) as (JWT & { payload: User }) | null

    if (!decoded) return getAdminLoginRedirect(request)

    const isValid = await validateJWT(
      decoded.algorithm,
      new TextEncoder().encode(secret),
      decoded.value,
    ).catch((err) => {
      console.error('Error validating JWT:', err)
      return null
    })

    if (!isValid) return getAdminLoginRedirect(request)

    const role = decoded.payload.role

    if (role !== 'admin') return new NextResponse('Unauthorized', { status: 401 })

    return true
  } catch (error) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}

export default async function middleware(request: NextRequest) {
  const validationResponse = await validateAdminAccess(request)
  if (validationResponse !== true) {
    return validationResponse
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
