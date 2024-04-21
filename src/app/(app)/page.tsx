import { OAuthLoginButtons } from '@/components/OAuthLoginButtons'
import { auth } from '@/lib/auth'

const Page = async () => {
  const user = await auth()
  console.log('user', user)
  return (
    <article>
      <OAuthLoginButtons />
    </article>
  )
}

export default Page
