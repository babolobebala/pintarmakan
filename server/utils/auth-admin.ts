import type { H3Event } from 'h3'

import { createError } from 'h3'

import { db } from '#server/utils/db'
import { createMemberAdminAuth } from '#server/utils/auth-instance'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getMemberAdminAuth(adminUserId: string) {
  return createMemberAdminAuth(adminUserId)
}

export async function createOrUpdateManagedUser(event: H3Event, adminUserId: string, input: {
  email: string
  name: string
  password?: string
}) {
  const auth = getMemberAdminAuth(adminUserId)
  const email = normalizeEmail(input.email)
  const existingUser = await db.user.findUnique({
    where: {
      email
    },
    select: {
      id: true
    }
  })

  if (!existingUser) {
    const { user } = await auth.api.createUser({
      headers: event.headers,
      body: {
        email,
        name: input.name,
        password: input.password,
        data: {
          emailVerified: true,
          isActive: true
        }
      }
    })

    return user
  }

  const user = await auth.api.adminUpdateUser({
    headers: event.headers,
    body: {
      userId: existingUser.id,
      data: {
        name: input.name,
        emailVerified: true,
        isActive: true
      }
    }
  })

  if (input.password) {
    await auth.api.setUserPassword({
      headers: event.headers,
      body: {
        userId: existingUser.id,
        newPassword: input.password
      }
    })
  }

  return user
}

export async function setManagedUserPassword(event: H3Event, adminUserId: string, userId: string, password: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  const auth = getMemberAdminAuth(adminUserId)

  await auth.api.setUserPassword({
    headers: event.headers,
    body: {
      userId,
      newPassword: password
    }
  })
}
