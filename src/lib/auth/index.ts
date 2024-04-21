'use server'

import { cookies, headers } from 'next/headers'
import authProviders from '@/lib/auth/providers'
import { revalidatePath } from 'next/cache'
import { redirect as nextRedirect } from 'next/navigation'
import { getPayload } from '@/lib/payload'
import type { User } from '~/payload-types'
import { type JWT, parseJWT, validateJWT } from 'oslo/jwt'
import { getPayloadSecret } from './utils/edge'
import { AUTH_REDIRECT_QUERY_PARAM, PAYLOAD_COOKIE_NAME } from './const'

export const signIn = (
  provider: keyof typeof authProviders,
  options?: {
    callbackUrl?: string
    autoCallback?: boolean
  },
) => {
  let { callbackUrl, autoCallback = true } = options ?? {}
  if (autoCallback && !callbackUrl) {
    callbackUrl = new URL(headers().get('Referer') || '/').pathname
  }
  nextRedirect(
    `/api/auth/${provider}?${AUTH_REDIRECT_QUERY_PARAM}=${encodeURIComponent(callbackUrl ?? '/')}`,
  )
}

export const signOut = (options?: { currentPath: string; redirectTo?: string }) => {
  cookies().delete(PAYLOAD_COOKIE_NAME)
  options?.currentPath && revalidatePath(options.currentPath)
  options?.redirectTo && nextRedirect(options.redirectTo)
}

export const auth = async (): Promise<User | null> => {
  const payload = await getPayload()
  const h = headers()
  const { user } = await payload.auth({ headers: h })
  return user
}

/**
 * Validates the JWT stored in the `payload-token` cookie. If validation fails and
 * `removeOnFailure` is true, the function redirects to a logout route that will
 * handle cookie deletion safely. Otherwise, it may redirect to a specified URL.
 * If no redirection is specified, it simply returns null or the valid JWT.
 *
 * @param {Object} [options] - The options for JWT validation.
 * @param {string} [options.redirect] - The URL to redirect to after handling the logout.
 * @param {boolean} [options.removeOnFailure=true] - Whether to remove the cookie on validation failure. Defaults to true.
 * @returns {Promise<JWT | null>} The JWT if valid, or null if invalid.
 */
export const validateSession = async (options?: {
  redirect?: string
  removeOnFailure?: boolean
}): Promise<JWT | null> => {
  const { redirect, removeOnFailure = true } = options ?? {}
  const jwt = cookies().get(PAYLOAD_COOKIE_NAME)?.value || ''

  const handleRedirection = () => {
    if ((redirect || removeOnFailure) && jwt.length > 0) {
      const redirectTo = removeOnFailure
        ? `/api/auth/logout?${AUTH_REDIRECT_QUERY_PARAM}=${encodeURIComponent(redirect ?? '/')}`
        : redirect ?? '/'
      nextRedirect(redirectTo)
    }
  }

  try {
    const decoded = parseJWT(jwt) as (JWT & { payload: User }) | null
    if (!decoded) {
      handleRedirection()
      return null
    }
    const secret = await getPayloadSecret()
    const isValid = await validateJWT(decoded.algorithm, new TextEncoder().encode(secret), jwt)
    if (isValid) {
      return decoded
    }
    handleRedirection()
    return null
  } catch (error) {
    handleRedirection()
    return null
  }
}
