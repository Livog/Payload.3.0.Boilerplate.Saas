import { signIn, signOut } from '@/lib/auth'

export function OAuthLoginButtons() {
  return (
    <>
      <form
        action={async () => {
          'use server'
          await signIn('github')
        }}
      >
        <button type="submit" className="px-6 py-2 rounded-md bg-black text-white">
          Sign in with GitHub
        </button>
      </form>
      <form
        action={async () => {
          'use server'
          await signOut()
        }}
      >
        <button type="submit" className="px-6 py-2 rounded-md bg-blue-600 text-white">
          Sign Out
        </button>
      </form>
    </>
  )
}
