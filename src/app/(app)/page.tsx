import LexicalContent from '@/components/LexicalContent'
import fetchPage from '@/utils/fetchPage'

const Page = async ({}) => {
  const page = await fetchPage('/')
  return (
    <article className="prose">
      {page?.content?.root?.children && (
        /** @ts-ignore */
        <LexicalContent childrenNodes={page?.content?.root?.children} />
      )}
    </article>
  )
}

export default Page
