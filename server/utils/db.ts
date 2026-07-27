import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '#server/generated/prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  db?: PrismaClient
}

function getMariaDbConfig() {
  const host = process.env.DB_HOST
  const database = process.env.DB_DATABASE
  const user = process.env.DB_USERNAME

  if (!host || !database || !user) {
    throw new Error('Missing DB_HOST, DB_DATABASE, or DB_USERNAME environment variables.')
  }

  return {
    host,
    user,
    database,
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || '3306'),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || '5')
  }
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(getMariaDbConfig())

  return new PrismaClient({
    adapter
  })
}

export const db = globalForPrisma.db ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.db = db
}

export type { Prisma } from '#server/generated/prisma/client'
