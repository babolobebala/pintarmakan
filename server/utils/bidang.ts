import type { H3Event } from 'h3'

import { createError } from 'h3'

import {
  getHighestEffectiveRole,
  hasAccessForRole,
  hasRoleAtLeast,
  type AppAccessRequest
} from '~~/auth/permissions'
import { requireAuthSession } from '#server/utils/auth'
import { db } from '#server/utils/db'

function dedupeBidangIds(bidangIds: readonly string[]) {
  return Array.from(new Set(bidangIds.map(bidangId => bidangId.trim()).filter(Boolean)))
}

export async function listBidangOptions() {
  return db.authBidang.findMany({
    orderBy: [
      {
        name: 'asc'
      },
      {
        id: 'asc'
      }
    ],
    select: {
      id: true,
      name: true,
      description: true
    }
  })
}

export async function getAssignedBidangIdsForUser(userId: string) {
  const assignments = await db.authUserToBidang.findMany({
    where: {
      userId
    },
    orderBy: {
      bidangId: 'asc'
    },
    select: {
      bidangId: true
    }
  })

  return assignments.map(assignment => assignment.bidangId)
}

export async function getAccessibleBidangIdsForUser(user: {
  readonly id: string
  readonly role?: string | null
}) {
  const highestRole = getHighestEffectiveRole(user.role)

  if (hasRoleAtLeast(highestRole, 'admin')) {
    const bidangs = await db.authBidang.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true
      }
    })

    return bidangs.map(bidang => bidang.id)
  }

  if (highestRole !== 'operator') {
    return []
  }

  return getAssignedBidangIdsForUser(user.id)
}

export async function authorizeBidangAction(event: H3Event, options: {
  readonly permission: AppAccessRequest
  readonly bidangId: string
}) {
  const session = await requireAuthSession(event)
  const highestRole = getHighestEffectiveRole(session.user.role)

  if (!hasAccessForRole(session.user.role, options.permission)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  if (hasRoleAtLeast(highestRole, 'admin')) {
    return {
      session,
      highestRole
    }
  }

  if (highestRole !== 'operator') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const assignment = await db.authUserToBidang.findFirst({
    where: {
      userId: session.user.id,
      bidangId: options.bidangId
    },
    select: {
      id: true
    }
  })

  if (!assignment) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return {
    session,
    highestRole
  }
}

export async function replaceUserBidangAssignments(userId: string, bidangIds: readonly string[]) {
  const desiredBidangIds = dedupeBidangIds(bidangIds)

  return db.$transaction(async (tx) => {
    if (desiredBidangIds.length > 0) {
      const knownBidangs = await tx.authBidang.findMany({
        where: {
          id: {
            in: desiredBidangIds
          }
        },
        select: {
          id: true
        }
      })

      const knownBidangIds = new Set(knownBidangs.map(bidang => bidang.id))
      const unknownBidangIds = desiredBidangIds.filter(bidangId => !knownBidangIds.has(bidangId))

      if (unknownBidangIds.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown Bidang: ${unknownBidangIds.join(', ')}`
        })
      }
    }

    const existingAssignments = await tx.authUserToBidang.findMany({
      where: {
        userId
      },
      select: {
        bidangId: true
      }
    })

    const existingBidangIds = existingAssignments.map(assignment => assignment.bidangId)
    const existingBidangSet = new Set(existingBidangIds)
    const desiredBidangSet = new Set(desiredBidangIds)
    const addedBidangIds = desiredBidangIds.filter(bidangId => !existingBidangSet.has(bidangId))
    const removedBidangIds = existingBidangIds.filter(bidangId => !desiredBidangSet.has(bidangId))

    if (removedBidangIds.length > 0) {
      await tx.authUserToBidang.deleteMany({
        where: {
          userId,
          bidangId: {
            in: removedBidangIds
          }
        }
      })
    }

    if (addedBidangIds.length > 0) {
      await Promise.all(addedBidangIds.map((bidangId) => {
        return tx.authUserToBidang.create({
          data: {
            userId,
            bidangId
          }
        })
      }))
    }

    return {
      bidangIds: desiredBidangIds,
      addedBidangIds,
      removedBidangIds
    }
  })
}
