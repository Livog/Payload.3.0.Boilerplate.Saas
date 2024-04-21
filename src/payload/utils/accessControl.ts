import type { Access, FieldAccess } from 'payload/types'
import type { User } from '~/payload-types'

export const isAdmin: Access<any, User> = ({ req: { user } }) =>
  Boolean(user && user.role === 'admin')

export const isAdminFieldLevel: FieldAccess<{ id: string }, unknown, User> = ({ req: { user } }) =>
  Boolean(user && user.role === 'admin')

export const isAdminOrCreatedBy: Access<any, User> = ({ req: { user } }) => {
  if (user && user.role === 'admin') {
    return true
  }
  if (user) {
    return {
      createdBy: {
        equals: user.id,
      },
    }
  }
  // Scenario #3 - Disallow all others
  return false
}

export const isLoggedInOrIsPublished: Access<any, User> = ({ req: { user } }) => {
  if (user) {
    return true
  }
  return {
    and: [
      {
        publishDate: {
          less_than: new Date().toJSON(),
        },
        _status: {
          equals: 'published',
        },
      },
    ],
  }
}
