import type { H3Event } from 'h3'

import { createError } from 'h3'

import { normalizeRoleSelection, type AppRoleSlug } from '~~/auth/permissions'
import { db } from '#server/utils/db'
import { auth } from '#server/utils/auth-instance'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function createOrUpdateManagedUser(
  event: H3Event,
  input: {
    email: string
    name: string
    password?: string
    role: string | AppRoleSlug
  }
) {
  const email = normalizeEmail(input.email)
  const role = normalizeRoleSelection(input.role)

  const existingUser = await db.user.findUnique({
    where: {
      email
    },
    select: {
      id: true,
      role: true,
      banned: true
    }
  })

  if (!existingUser) {
    const { user } = await auth.api.createUser({
      headers: event.headers,
      body: {
        email,
        name: input.name,
        password: input.password,
        role,
        data: {
          emailVerified: true
        }
      }
    })

    return {
      user,
      role
    }
  }

  const user = await auth.api.adminUpdateUser({
    headers: event.headers,
    body: {
      userId: existingUser.id,
      data: {
        name: input.name,
        emailVerified: true
      }
    }
  })

  await auth.api.setRole({
    headers: event.headers,
    body: {
      userId: existingUser.id,
      role
    }
  })

  if (existingUser.banned) {
    await auth.api.unbanUser({
      headers: event.headers,
      body: {
        userId: existingUser.id
      }
    })
  }

  if (input.password) {
    await auth.api.setUserPassword({
      headers: event.headers,
      body: {
        userId: existingUser.id,
        newPassword: input.password
      }
    })
  }

  return {
    user,
    role
  }
}

export async function updateManagedUser(
  event: H3Event,
  userId: string,
  input: {
    email: string
    name: string
    role: string | AppRoleSlug
  }
) {
  const email = normalizeEmail(input.email)
  const role = normalizeRoleSelection(input.role)

  const existingUser = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  const user = await auth.api.adminUpdateUser({
    headers: event.headers,
    body: {
      userId,
      data: {
        name: input.name,
        email,
        emailVerified: true
      }
    }
  })

  await auth.api.setRole({
    headers: event.headers,
    body: {
      userId,
      role
    }
  })

  return {
    user,
    role
  }
}

export async function setManagedUserPassword(
  event: H3Event,
  userId: string,
  password: string
) {
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

  await auth.api.setUserPassword({
    headers: event.headers,
    body: {
      userId,
      newPassword: password
    }
  })
}

export async function setManagedUserStatus(
  event: H3Event,
  userId: string,
  active: boolean
) {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      banned: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  if (active) {
    if (user.banned) {
      await auth.api.unbanUser({
        headers: event.headers,
        body: {
          userId
        }
      })
    }

    return
  }

  if (!user.banned) {
    await auth.api.banUser({
      headers: event.headers,
      body: {
        userId,
        banReason: 'This account is inactive. Please contact an administrator.'
      }
    })
  }

  await auth.api.revokeUserSessions({
    headers: event.headers,
    body: {
      userId
    }
  })
}

export async function removeManagedUser(event: H3Event, userId: string) {
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

  await auth.api.removeUser({
    headers: event.headers,
    body: {
      userId
    }
  })
}
