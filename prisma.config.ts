import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'prisma/config'

if (fs.existsSync(path.resolve('.env'))) {
  process.loadEnvFile?.()
}

function getDatabaseUrl() {
  const connection = process.env.DB_CONNECTION || 'mysql'
  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || '3306'
  const database = process.env.DB_DATABASE
  const username = process.env.DB_USERNAME
  const password = process.env.DB_PASSWORD || ''

  if (!host || !database || !username) {
    return `${connection}://placeholder:placeholder@localhost:${port}/placeholder`
  }

  return `${connection}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: getDatabaseUrl()
  }
})
