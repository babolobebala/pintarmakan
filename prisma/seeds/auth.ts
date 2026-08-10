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
  roleHierarchy,
  roles,
  type AppRoleSlug
} from '../../auth/permissions.js'
import type { PrismaClient } from '../../server/generated/prisma/client.js'

type SeedRoleInput = AppRoleSlug

type SeedUser = {
  readonly name: string
  readonly email: string
  readonly password: string
  readonly role: SeedRoleInput
}

type SeedBidang = {
  readonly id: string
  readonly name: string
  readonly description: string | null
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
    email: 'fatihmahawisesa1@gmail.com',
    password: '12345567890',
    role: 'user'
  },
  {
    name: 'Admin Demo',
    email: 'fatihmahawisesa2@gmail.com',
    password: '12345567890',
    role: 'admin'
  },
  {
    name: 'Super Admin',
    email: 'fatihmahawisesa@gmail.com',
    password: '12345567890',
    role: 'super-admin'
  },
  {
    name: 'Operator Demo',
    email: 'operatoruser@gmail.com',
    password: '12345567890',
    role: 'operator'
  }
] as const satisfies readonly SeedUser[]

export const seedSuperAdminEmail = 'fatihmahawisesa@gmail.com'

const seedBidangs = [
  {
    id: 'DKP_DISTRIBUSI',
    name: 'DKP_DISTRIBUSI',
    description: null
  },
  {
    id: 'DKP_KONSUMSI',
    name: 'DKP_KONSUMSI',
    description: null
  },
  {
    id: 'DKP_KETERSEDIAAN',
    name: 'DKP_KETERSEDIAAN',
    description: null
  },
  {
    id: 'DKP_PROGRAM',
    name: 'DKP_PROGRAM',
    description: null
  }
] as const satisfies readonly SeedBidang[]

type SeedBidangId = (typeof seedBidangs)[number]['id']

type SeedBidangAssignment = {
  readonly email: string
  readonly bidangIds: readonly SeedBidangId[]
}

const seedBidangAssignments = [
  {
    email: 'operatoruser@gmail.com',
    bidangIds: ['DKP_DISTRIBUSI', 'DKP_KONSUMSI', 'DKP_KETERSEDIAAN', 'DKP_PROGRAM']
  }
] as const satisfies readonly SeedBidangAssignment[]

const setRolePermission = { user: ['set-role'] } as const

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
  const value = role.trim()

  if (!value) {
    throw new Error('Seed users must define a role.')
  }

  if (!isKnownRole(value)) {
    throw new Error(`Unknown seed role "${value}" in prisma/seeds/auth.ts.`)
  }

  return value
}

function toBetterAuthRole(role: SeedRoleInput) {
  return normalizeSeedRoles(role)
}

function serializeRoles(role: SeedRoleInput) {
  return normalizeSeedRoles(role)
}

function serializeStoredRole(role: string | null | undefined) {
  return getEffectiveRoles(role).slice().sort().join(',')
}

function formatRoleLog(role: SeedRoleInput) {
  return normalizeSeedRoles(role)
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

async function seedAuthBidangs(db: PrismaClient) {
  let createdCount = 0
  let updatedCount = 0
  let unchangedCount = 0

  for (const seedBidang of seedBidangs) {
    const currentBidang = await db.authBidang.findUnique({
      where: {
        id: seedBidang.id
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    })

    if (!currentBidang) {
      await db.authBidang.create({
        data: seedBidang
      })

      createdCount += 1
      console.info(`[seed] created bidang ${seedBidang.id} (${seedBidang.name})`)
      continue
    }

    if (
      currentBidang.name === seedBidang.name
      && currentBidang.description === seedBidang.description
    ) {
      unchangedCount += 1
      continue
    }

    await db.authBidang.update({
      where: {
        id: seedBidang.id
      },
      data: {
        name: seedBidang.name,
        description: seedBidang.description
      }
    })

    updatedCount += 1
    console.info(`[seed] updated bidang ${seedBidang.id} (${seedBidang.name})`)
  }

  return {
    createdCount,
    updatedCount,
    unchangedCount
  }
}

async function reconcileSeedBidangAssignments(
  db: PrismaClient,
  usersByEmail: Map<string, SeedDbUser>
) {
  let updatedCount = 0
  let unchangedCount = 0

  for (const seedAssignment of seedBidangAssignments) {
    const email = normalizeEmail(seedAssignment.email)
    const user = usersByEmail.get(email)

    if (!user) {
      throw new Error(`Missing seeded user "${email}" required for AuthUserToBidang seeding.`)
    }

    const desiredBidangIds = Array.from(new Set(seedAssignment.bidangIds.map(bidangId => bidangId.trim()).filter(Boolean)))
    const existingAssignments = await db.authUserToBidang.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        bidangId: 'asc'
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

    if (addedBidangIds.length === 0 && removedBidangIds.length === 0) {
      unchangedCount += 1
      continue
    }

    await db.$transaction(async (tx) => {
      if (removedBidangIds.length > 0) {
        await tx.authUserToBidang.deleteMany({
          where: {
            userId: user.id,
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
              userId: user.id,
              bidangId
            }
          })
        }))
      }
    })

    updatedCount += 1
    console.info(
      `[seed] updated bidang assignments for ${email} `
      + `(${desiredBidangIds.join(', ')})`
    )
  }

  return {
    updatedCount,
    unchangedCount
  }
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
      const leftRole = normalizeSeedRoles(left.seedUser.role)
      const rightRole = normalizeSeedRoles(right.seedUser.role)

      return roleHierarchy.indexOf(rightRole) - roleHierarchy.indexOf(leftRole)
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
      + 'Update the hardcoded admin-capable seed credentials in prisma/seeds/auth.ts if those passwords changed, then rerun the seed.'
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

export async function runAuthSeed(db: PrismaClient) {
  const { createdCount: createdBidangCount, updatedCount: updatedBidangCount, unchangedCount: unchangedBidangCount }
    = await seedAuthBidangs(db)
  const auth = createSeedAuth(db)
  const existingUsers = await getSeedUsersByEmail(db)
  const createdCount = await createMissingUsers(auth, existingUsers)
  const currentUsers = await getSeedUsersByEmail(db)
  const { updatedCount, unchangedCount } = await reconcileExistingUserRoles(auth, currentUsers)
  const { updatedCount: updatedBidangAssignmentCount, unchangedCount: unchangedBidangAssignmentCount }
    = await reconcileSeedBidangAssignments(db, currentUsers)

  console.info(
    `[seed] bidang complete: ${createdBidangCount} created, ${updatedBidangCount} updated, ${unchangedBidangCount} unchanged`
  )
  console.info(
    `[seed] bidang assignments complete: ${updatedBidangAssignmentCount} updated, ${unchangedBidangAssignmentCount} unchanged`
  )
  console.info(
    `[seed] complete: ${createdCount} created, ${updatedCount} role-synced, ${unchangedCount} unchanged`
  )
}
