'use client'

import { signIn, signOut } from '@/lib/auth'
import { usePathname } from 'next/navigation'

export function OAuthLoginButtons() {
  const pathname = usePathname()
  return (
    <>
      <button
        type="submit"
        onClick={() => signIn('github')}
        className="px-6 py-2 rounded-md bg-blue-600 text-white"
      >
        Sign in with GitHub (Lucia)
      </button>
      <button onClick={() => signOut({ currentPath: pathname })}>Logout</button>
    </>
  )
}
