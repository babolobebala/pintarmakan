import { db } from '#server/utils/db'
import { appPermissions, getHighestEffectiveRole } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.membersRead)

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
      banned: true,
      bidangAssignments: {
        orderBy: {
          bidangId: 'asc'
        },
        select: {
          bidang: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      },
      accounts: {
        select: {
          providerId: true,
          password: true
        }
      }
    }
  })

  return users.map((user) => {
    const effectiveRole = getHighestEffectiveRole(user.role)

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
      role: effectiveRole,
      roles: [effectiveRole],
      bidangs: user.bidangAssignments
        .map(assignment => assignment.bidang)
        .sort((left, right) => left.name.localeCompare(right.name)),
      isBanned: user.banned,
      hasPassword: user.accounts.some((account) => {
        return account.providerId === 'credential' && !!account.password
      })
    }
  })
})
