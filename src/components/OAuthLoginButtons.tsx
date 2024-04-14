export function OAuthLoginButtons() {
  return (
    <>
      <a href="/api/auth/github">
        <button type="submit" className="px-6 py-2 rounded-md bg-blue-600 text-white">
          Sign in with GitHub (Lucia)
        </button>
      </a>
    </>
  )
}
