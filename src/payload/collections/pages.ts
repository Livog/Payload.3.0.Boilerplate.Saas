import type { CollectionConfig } from 'payload/types'
import { pathField, slugField } from '@/payload/fields'

export const COLLECTION_SLUG_PAGE = 'pages'

export const pages: CollectionConfig = {
  slug: COLLECTION_SLUG_PAGE,
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'content',
      type: 'richText',
    },
    slugField(),
    pathField(),
  ],
}
