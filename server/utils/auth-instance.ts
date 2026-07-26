import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { admin } from 'better-auth/plugins'

import { ac, authRoles, defaultUserRole } from '#shared/rbac'
import { db } from '#server/utils/db'

const baseURL = process.env.BETTER_AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const auth = betterAuth({
  appName: 'Nuxt Dashboard Template',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: 'mysql'
  }),
  plugins: [
    admin({
      ac,
      roles: authRoles,
      adminRoles: ['super-admin', 'admin'],
      defaultRole: defaultUserRole
    })
  ],
  disabledPaths: ['/sign-up/email'],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: false
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableSignUp: true,
      disableImplicitSignUp: true
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      allowDifferentEmails: false
    }
  },
  user: {
    additionalFields: {
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
        returned: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError('BAD_REQUEST', {
            message: 'Signup is disabled. Please contact an administrator.'
          })
        }
      }
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({
            where: {
              id: session.userId
            },
            select: {
              isActive: true
            }
          })

          if (!user?.isActive) {
            throw new APIError('FORBIDDEN', {
              message: 'This account is inactive. Please contact an administrator.'
            })
          }

          return { data: session }
        }
      }
    }
  }
})
