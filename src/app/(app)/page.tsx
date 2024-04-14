import { OAuthLoginButtons } from '@/components/OAuthLoginButtons'
import { getUser } from '@/lib/payload'

const Page = async () => {
  const user = await getUser()
  console.log('user', user)
  return (
    <article>
      <OAuthLoginButtons />
    </article>
  )
}

export default Page
