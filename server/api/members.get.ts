import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users.read')

  const users = await db.user.findMany({
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      userRoles: {
        select: {
          role: {
            select: {
              slug: true
            }
          }
        }
      },
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
      roles: Array.from(new Set(user.userRoles.map(({ role }) => role.slug))),
      isActive: user.isActive,
      hasPassword: user.accounts.some((account) => {
        return account.providerId === 'credential' && !!account.password
      })
    }
  })
})
