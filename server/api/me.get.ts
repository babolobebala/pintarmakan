import { db } from '#server/utils/db'
import { requireAuthSession } from '~~/server/utils/auth'
import { getUserAccess } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const [user, access] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true
      }
    }),
    getUserAccess(session.user.id)
  ])

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      roles: access.roles,
      permissions: access.permissions,
      isActive: user.isActive
    },
    session: session.session
  }
})
