import fs from 'node:fs'
import path from 'node:path'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../server/generated/prisma/client.js'
import { runAuthSeed } from './seeds/auth.js'
import { runDatasetSeed } from './seeds/datasets.js'
import { runRegionSeed } from './seeds/regions.js'

if (fs.existsSync(path.resolve('.env'))) {
  process.loadEnvFile?.()
}

function assertNotProduction() {
  const productionFlags = [
    process.env.NODE_ENV,
    process.env.APP_ENV,
    process.env.NUXT_APP_ENV
  ]
    .filter(Boolean)
    .map(value => value!.trim().toLowerCase())

  if (productionFlags.some(value => value === 'production' || value === 'prod')) {
    throw new Error('Refusing to run the seed while the environment is marked as production.')
  }
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

function createDatabaseClient() {
  const adapter = new PrismaMariaDb(getMariaDbConfig())

  return new PrismaClient({
    adapter
  })
}

async function main() {
  assertNotProduction()

  const db = createDatabaseClient()

  try {
    await runRegionSeed(db)
    await runAuthSeed(db)
    await runDatasetSeed(db)
  } finally {
    await db.$disconnect()
  }
}

await main()
