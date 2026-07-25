import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

process.loadEnvFile?.()

const supportedActions = new Set(['upsert', 'create', 'update', 'delete'])

function getMariaDbConfig() {
  const host = process.env.DB_HOST
  const database = process.env.DB_DATABASE
  const user = process.env.DB_USERNAME

  if (!host || !database || !user) {
    throw new Error('Missing DB_HOST, DB_DATABASE, or DB_USERNAME environment variables.')
  }

  return {
    host,
    port: Number(process.env.DB_PORT || '3306'),
    user,
    password: process.env.DB_PASSWORD || '',
    database,
    connectionLimit: 5
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getMariaDbConfig())
})

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readSeedConfig() {
  const localConfigPath = path.join(process.cwd(), 'prisma', 'seed.config.local.json')
  const defaultConfigPath = path.join(process.cwd(), 'prisma', 'seed.config.json')
  const configPath = await fileExists(localConfigPath) ? localConfigPath : defaultConfigPath
  const raw = await fs.readFile(configPath, 'utf8')

  return {
    configPath,
    config: JSON.parse(raw)
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resolveValue(value) {
  if (Array.isArray(value)) {
    return value.map(resolveValue)
  }

  if (!isPlainObject(value)) {
    return value
  }

  const keys = Object.keys(value)
  if (keys.length === 1) {
    if ('$uuid' in value) {
      return crypto.randomUUID()
    }

    if ('$now' in value) {
      return new Date()
    }

    if ('$env' in value) {
      const envName = String(value.$env)

      if (!(envName in process.env)) {
        throw new Error(`Missing environment variable "${envName}" referenced by seed config.`)
      }

      return process.env[envName]
    }
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      return [key, resolveValue(nestedValue)]
    })
  )
}

function normalizeSeedPlan(config) {
  if (Array.isArray(config?.tables)) {
    return config.tables
  }

  if (Array.isArray(config?.seed)) {
    return config.seed
  }

  if (isPlainObject(config?.seed)) {
    return Object.entries(config.seed).map(([model, value]) => {
      if (!isPlainObject(value)) {
        throw new Error(`Seed block for model "${model}" must be an object.`)
      }

      return {
        model,
        ...value
      }
    })
  }

  throw new Error('Invalid seed config. Expected "tables" or "seed" format.')
}

function getDelegate(model) {
  const delegate = prisma[model]

  if (!delegate || typeof delegate !== 'object') {
    throw new Error(`Unknown Prisma model delegate "${model}" in seed config.`)
  }

  return delegate
}

function normalizeRowPayload(action, model, row) {
  const payload = resolveValue(row)

  if (!isPlainObject(payload)) {
    throw new Error(`Each row for model "${model}" must be an object.`)
  }

  switch (action) {
    case 'upsert':
      if (!isPlainObject(payload.where)) {
        throw new Error(`Seed upsert for model "${model}" requires a "where" object.`)
      }

      if (!isPlainObject(payload.create) && !isPlainObject(payload.data)) {
        throw new Error(`Seed upsert for model "${model}" requires a "create" object.`)
      }

      return {
        where: payload.where,
        create: payload.create ?? payload.data,
        update: payload.update ?? payload.create ?? payload.data
      }

    case 'create':
      if (!isPlainObject(payload.data)) {
        throw new Error(`Seed create for model "${model}" requires a "data" object.`)
      }

      return {
        data: payload.data
      }

    case 'update':
      if (!isPlainObject(payload.where) || !isPlainObject(payload.data)) {
        throw new Error(`Seed update for model "${model}" requires "where" and "data" objects.`)
      }

      return {
        where: payload.where,
        data: payload.data
      }

    case 'delete':
      if (!isPlainObject(payload.where)) {
        throw new Error(`Seed delete for model "${model}" requires a "where" object.`)
      }

      return {
        where: payload.where
      }

    default:
      throw new Error(`Unsupported seed action "${action}" for model "${model}".`)
  }
}

async function runBlock(block) {
  if (!isPlainObject(block)) {
    throw new Error('Each seed table block must be an object.')
  }

  const model = String(block.model || '').trim()
  const action = String(block.action || 'upsert').trim()
  const rows = block.rows

  if (!model) {
    throw new Error('Each seed table block must include a "model" value.')
  }

  if (!supportedActions.has(action)) {
    throw new Error(`Unsupported seed action "${action}" for model "${model}".`)
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Seed block for model "${model}" must include a non-empty "rows" array.`)
  }

  const delegate = getDelegate(model)

  for (const row of rows) {
    const payload = normalizeRowPayload(action, model, row)

    switch (action) {
      case 'upsert':
        await delegate.upsert(payload)
        break
      case 'create':
        await delegate.create(payload)
        break
      case 'update':
        await delegate.update(payload)
        break
      case 'delete':
        await delegate.delete(payload)
        break
    }
  }

  return {
    model,
    action,
    count: rows.length
  }
}

try {
  const { configPath, config } = await readSeedConfig()
  const plan = normalizeSeedPlan(config)
  const summary = []

  for (const block of plan) {
    summary.push(await runBlock(block))
  }

  console.log(`Seeded ${summary.length} block(s) from ${path.relative(process.cwd(), configPath)}`)

  for (const item of summary) {
    console.log(`- ${item.model}: ${item.action} x ${item.count}`)
  }
// eslint-disable-next-line @stylistic/brace-style
}
finally {
  await prisma.$disconnect()
}
