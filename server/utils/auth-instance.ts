import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { admin } from 'better-auth/plugins'

import { db } from '#server/utils/db'

const baseURL = process.env.BETTER_AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function getBaseAuthOptions(): BetterAuthOptions {
  return {
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
  }
}

export function createMemberAdminAuth(adminUserId: string) {
  return betterAuth({
    ...getBaseAuthOptions(),
    plugins: [
      admin({
        adminUserIds: [adminUserId],
        defaultRole: 'user'
      })
    ]
  })
}

export const auth = betterAuth(getBaseAuthOptions())
