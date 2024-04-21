import 'server-only'
import { getPayload } from '@/lib/payload'
import { COLLECTION_SLUG_PAGE } from '@/payload/collections/pages'
import { notFound } from 'next/navigation'
import { Page } from '~/payload-types'
const fetchPage = async (path: string): Promise<Page | null> => {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: COLLECTION_SLUG_PAGE,
    where: { path: { equals: path } },
  })
  if (docs?.length === 0) {
    notFound()
  }
  const page = docs?.at(0)
  return page || null
}

export default fetchPage
