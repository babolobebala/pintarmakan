import fs from 'node:fs'
import path from 'node:path'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth } from 'better-auth'
import { setCookieToHeader } from 'better-auth/cookies'
import { admin } from 'better-auth/plugins'

import {
  ac,
  defaultRole,
  adminRoleSlugs,
  getEffectiveRoles,
  isKnownRole,
  roles,
  type AppRoleSlug
} from '../auth/permissions.js'
import { PrismaClient } from '../server/generated/prisma/client.js'

if (fs.existsSync(path.resolve('.env'))) {
  process.loadEnvFile?.()
}

type SeedRoleInput = AppRoleSlug | readonly AppRoleSlug[]

type SeedUser = {
  readonly name: string
  readonly email: string
  readonly password: string
  readonly role: SeedRoleInput
}

type SeedDbUser = {
  readonly id: string
  readonly email: string
  readonly role: string | null
}

type SeedRoleMatch = {
  readonly kind: 'unchanged' | 'mismatch'
  readonly seedUser: (typeof seedUsers)[number]
  readonly currentUser: SeedDbUser
}

const seedUsers = [
  {
    name: 'User Demo',
    email: 'user@example.com',
    password: 'ChangeMe123!',
    role: 'user'
  },
  {
    name: 'Admin Demo',
    email: 'admin@example.com',
    password: 'ChangeMe123!',
    role: 'admin'
  },
  {
    name: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'ChangeMe123!',
    role: 'super-admin'
  }
] as const satisfies readonly SeedUser[]

const setRolePermission = { user: ['set-role'] } as const

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

function createSeedAuth(db: PrismaClient) {
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return betterAuth({
    appName: 'Nuxt Dashboard Template',
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, {
      provider: 'mysql'
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false
    },
    plugins: [
      admin({
        ac,
        roles,
        adminRoles: [...adminRoleSlugs],
        defaultRole,
        bannedUserMessage: 'This account is inactive. Please contact an administrator.'
      })
    ]
  })
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeSeedRoles(role: SeedRoleInput) {
  const values = Array.isArray(role) ? role : [role]
  const deduped = Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))

  if (deduped.length === 0) {
    throw new Error('Seed users must define at least one role.')
  }

  for (const value of deduped) {
    if (!isKnownRole(value)) {
      throw new Error(`Unknown seed role "${value}" in prisma/seed.ts.`)
    }
  }

  return deduped as AppRoleSlug[]
}

function toBetterAuthRole(role: SeedRoleInput) {
  const normalized = normalizeSeedRoles(role)

  return normalized.length === 1 ? normalized[0] : normalized
}

function serializeRoles(role: SeedRoleInput) {
  return normalizeSeedRoles(role).slice().sort().join(',')
}

function serializeStoredRole(role: string | null | undefined) {
  return getEffectiveRoles(role).slice().sort().join(',')
}

function formatRoleLog(role: SeedRoleInput) {
  return normalizeSeedRoles(role).join(', ')
}

function canSetRolesForCurrentUser(roleValue: string | null | undefined) {
  return getEffectiveRoles(roleValue).some(role => roles[role].authorize(setRolePermission).success)
}

async function getSeedUsersByEmail(db: PrismaClient) {
  const users = await db.user.findMany({
    where: {
      email: {
        in: seedUsers.map(user => normalizeEmail(user.email))
      }
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  })

  return new Map(users.map(user => [normalizeEmail(user.email), user]))
}

async function createMissingUsers(
  auth: ReturnType<typeof createSeedAuth>,
  existingUsers: Map<string, SeedDbUser>
) {
  let createdCount = 0

  for (const seedUser of seedUsers) {
    const email = normalizeEmail(seedUser.email)

    if (existingUsers.has(email)) {
      continue
    }

    await auth.api.createUser({
      body: {
        email,
        name: seedUser.name,
        password: seedUser.password,
        role: toBetterAuthRole(seedUser.role),
        data: {
          emailVerified: true
        }
      }
    })

    createdCount += 1
    console.info(`[seed] created ${email} (roles: ${formatRoleLog(seedUser.role)})`)
  }

  return createdCount
}

async function signInPrivilegedSeedUser(
  auth: ReturnType<typeof createSeedAuth>,
  usersByEmail: Map<string, SeedDbUser>
) {
  const candidates = [...seedUsers]
    .map((seedUser) => {
      const currentUser = usersByEmail.get(normalizeEmail(seedUser.email))

      return {
        seedUser,
        currentUser
      }
    })
    .filter(candidate => candidate.currentUser && canSetRolesForCurrentUser(candidate.currentUser.role))
    .sort((left, right) => {
      const leftRoles = normalizeSeedRoles(left.seedUser.role)
      const rightRoles = normalizeSeedRoles(right.seedUser.role)

      return Number(rightRoles.includes('super-admin')) - Number(leftRoles.includes('super-admin'))
    })

  for (const { seedUser } of candidates) {
    try {
      const response = await auth.api.signInEmail({
        body: {
          email: normalizeEmail(seedUser.email),
          password: seedUser.password
        },
        asResponse: true
      })
      const headers = new Headers()

      setCookieToHeader(headers)({
        response
      })

      if (headers.get('cookie')) {
        return headers
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.warn(`[seed] unable to sign in as ${normalizeEmail(seedUser.email)} for role reconciliation: ${message}`)
    }
  }

  return null
}

async function reconcileExistingUserRoles(
  auth: ReturnType<typeof createSeedAuth>,
  usersByEmail: Map<string, SeedDbUser>
) {
  const mismatches = seedUsers
    .map((seedUser) => {
      const currentUser = usersByEmail.get(normalizeEmail(seedUser.email))

      if (!currentUser) {
        return null
      }

      const desiredRole = serializeRoles(seedUser.role)
      const currentRole = serializeStoredRole(currentUser.role)

      if (desiredRole === currentRole) {
        return {
          kind: 'unchanged' as const,
          seedUser,
          currentUser
        }
      }

      return {
        kind: 'mismatch' as const,
        seedUser,
        currentUser
      }
    })
    .filter((entry): entry is SeedRoleMatch => entry !== null)

  const mismatchedUsers = mismatches.filter((entry): entry is SeedRoleMatch & { kind: 'mismatch' } => entry.kind === 'mismatch')
  const unchangedCount = mismatches.length - mismatchedUsers.length

  if (mismatchedUsers.length === 0) {
    return {
      updatedCount: 0,
      unchangedCount
    }
  }

  const adminHeaders = await signInPrivilegedSeedUser(auth, usersByEmail)

  if (!adminHeaders) {
    throw new Error(
      'Unable to reconcile existing user roles because no privileged seed user could be signed in. '
      + 'Update the hardcoded admin-capable seed credentials in prisma/seed.ts if those passwords changed, then rerun the seed.'
    )
  }

  let updatedCount = 0

  for (const entry of mismatchedUsers) {
    await auth.api.setRole({
      headers: adminHeaders,
      body: {
        userId: entry.currentUser.id,
        role: toBetterAuthRole(entry.seedUser.role)
      }
    })

    updatedCount += 1
    console.info(
      `[seed] updated roles for ${normalizeEmail(entry.seedUser.email)} `
      + `(roles: ${formatRoleLog(entry.seedUser.role)})`
    )
  }

  return {
    updatedCount,
    unchangedCount
  }
}

async function main() {
  assertNotProduction()

  const db = createDatabaseClient()
  const auth = createSeedAuth(db)

  try {
    const existingUsers = await getSeedUsersByEmail(db)
    const createdCount = await createMissingUsers(auth, existingUsers)
    const currentUsers = await getSeedUsersByEmail(db)
    const { updatedCount, unchangedCount } = await reconcileExistingUserRoles(auth, currentUsers)

    console.info(
      `[seed] complete: ${createdCount} created, ${updatedCount} role-synced, ${unchangedCount} unchanged`
    )
  } finally {
    await db.$disconnect()
  }
}

await main()
