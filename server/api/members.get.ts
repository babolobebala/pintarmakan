import { parseStoredRoles } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.members.view')

  const users = await db.user.findMany({
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      accounts: {
        select: {
          providerId: true,
          password: true
        }
      }
    }
  })

  return users.map((user) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.image
        ? {
            src: user.image,
            alt: user.name
          }
        : undefined,
      roles: parseStoredRoles(user.role),
      isActive: user.isActive,
      hasPassword: user.accounts.some((account) => {
        return account.providerId === 'credential' && !!account.password
      })
    }
  })
})
