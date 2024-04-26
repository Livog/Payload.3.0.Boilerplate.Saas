import { getPayload } from '@/lib/payload'
import { COLLECTION_SLUG_USER } from '@/payload/collections'

export const GET = async () => {
  const payload = await getPayload()
  const data = await payload.find({
    collection: COLLECTION_SLUG_USER
  })
  return Response.json({})
}
