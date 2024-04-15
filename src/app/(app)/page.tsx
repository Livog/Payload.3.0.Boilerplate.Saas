import { OAuthLoginButtons } from '@/components/OAuthLoginButtons'
import { auth } from '@/lib/auth'

const Page = async () => {
  return (
    <article>
      <OAuthLoginButtons />
    </article>
  )
}

export default Page
