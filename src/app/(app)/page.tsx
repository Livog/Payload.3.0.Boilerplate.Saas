import { OAuthLoginButtons } from '@/components/OAuthLoginButtons'
import { auth } from '@/lib/auth'

const Page = async () => {
  const session = await auth()
  return (
    <article>
      <OAuthLoginButtons />
    </article>
  )
}

export default Page
