import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { admin } from 'better-auth/plugins'

import { ac, adminRoleSlugs, defaultRole, roles } from '~~/auth/permissions'
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
    }
  }
}

export const auth = betterAuth({
  ...getBaseAuthOptions(),
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
