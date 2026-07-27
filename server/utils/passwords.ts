import type { Prisma } from '#server/generated/prisma/client'
import { createError } from 'h3'
import { hashPassword } from 'better-auth/crypto'

import { db } from '#server/utils/db'

type DatabaseClient = Prisma.TransactionClient | typeof db

export async function setCredentialPassword(userId: string, password: string, client: DatabaseClient = db) {
  const user = await client.user.findUnique({
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

  const hashedPassword = await hashPassword(password)
  const credentialAccount = await client.account.findFirst({
    where: {
      userId,
      providerId: 'credential'
    },
    select: {
      id: true
    }
  })

  if (credentialAccount) {
    await client.account.update({
      where: {
        id: credentialAccount.id
      },
      data: {
        password: hashedPassword
      }
    })

    return
  }

  await client.account.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      providerId: 'credential',
      accountId: userId,
      password: hashedPassword
    }
  })
}
