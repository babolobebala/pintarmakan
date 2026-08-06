import { createError, readBody } from 'h3'
import { z } from 'zod'

import { appPermissions, getUnknownRoles, normalizeRoleSelection } from '~~/auth/permissions'
import { createOrUpdateManagedUser } from '#server/utils/auth-admin'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  roles: z.array(z.string().trim().min(1)).min(1)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.membersCreate)
  const body = createMemberSchema.parse(await readBody(event))
  const password = body.password?.trim() || undefined
  const unknownRoles = getUnknownRoles(body.roles)

  if (unknownRoles.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown role: ${unknownRoles.join(', ')}`
    })
  }

  const roles = normalizeRoleSelection(body.roles)

  const { user, roles: assignedRoles } = await createOrUpdateManagedUser(event, {
    email: body.email,
    name: body.name,
    password,
    roles
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'members.create',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        email: user.email,
        roles: assignedRoles,
        passwordProvisioned: !!password
      }
    }
  })

  return {
    id: user.id
  }
})
