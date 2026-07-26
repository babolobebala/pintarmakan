import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  db?: PrismaClient
}

function getDatabaseUrl() {
  const host = process.env.DB_HOST
  const database = process.env.DB_DATABASE
  const user = process.env.DB_USERNAME

  if (!host || !database || !user) {
    throw new Error('Missing DB_HOST, DB_DATABASE, or DB_USERNAME environment variables.')
  }

  const port = process.env.DB_PORT || '3306'
  const password = process.env.DB_PASSWORD || ''
  const connection = process.env.DB_CONNECTION || 'mysql'

  return `${connection}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    }
  })
}

export const db = globalForPrisma.db ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.db = db
}

export type { Prisma } from '@prisma/client'
