import { createError, readBody } from 'h3'
import { z } from 'zod'

import { appPermissions, isAssignableRole, isKnownRole } from '~~/auth/permissions'
import { createOrUpdateManagedUser } from '#server/utils/auth-admin'
import { replaceUserBidangAssignments } from '#server/utils/bidang'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  role: z.string().trim().min(1),
  bidangIds: z.array(z.string().trim().min(1)).default([])
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.membersCreate)
  const body = createMemberSchema.parse(await readBody(event))
  const password = body.password?.trim() || undefined
  const role = body.role.trim()

  if (!isKnownRole(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown role: ${role}`
    })
  }

  if (!isAssignableRole(role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Super Admin cannot be assigned through this user-management flow.'
    })
  }

  const { user, role: assignedRole } = await createOrUpdateManagedUser(event, {
    email: body.email,
    name: body.name,
    password,
    role
  })
  const bidangAssignment = assignedRole === 'operator'
    ? await replaceUserBidangAssignments(user.id, body.bidangIds)
    : null

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'members.create',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: assignedRole,
        bidangIds: bidangAssignment?.bidangIds ?? [],
        passwordProvisioned: !!password
      }
    }
  })

  return {
    id: user.id
  }
})
