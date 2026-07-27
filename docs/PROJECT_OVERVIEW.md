# Project Overview

Last updated: 2026-07-27

## Summary

This repository is a Nuxt 4 internal dashboard application built from the Nuxt UI dashboard template and then adapted into an authenticated admin-style system.

Current implemented business scope:

- Better Auth login flow
- Role-based access control
- Member management
- Role management
- PWA support

The project is no longer just a starter template. It now behaves like an internal operations dashboard with server-side session checks and permission-gated navigation.

## Stack

- Nuxt `4.5.0`
- Vue `3.5.x`
- Nuxt UI `4.10.0`
- Tailwind CSS `4`
- Better Auth
- Prisma `7.8.x`
- Prisma Client generated to `server/generated/prisma`
- Prisma MySQL/MariaDB driver adapter via `@prisma/adapter-mariadb`
- Zod for request and form validation
- `@vite-pwa/nuxt` for installable PWA behavior

## High-Level Architecture

The app is split across standard Nuxt boundaries:

- `app/`: client-facing app layer
- `server/`: Nitro server routes and server-only utilities
- `shared/`: shared contracts and RBAC definitions reused by app and server
- `prisma/`: schema and manual SQL files
- `public/`: favicon and PWA icons
- `docs/`: project documentation

Important internal conventions:

- Shared RBAC helpers and validation live in `shared/rbac.ts`
- Server-only auth instance lives in `server/utils/auth-instance.ts`
- Server-only Prisma client lives in `server/utils/db.ts`
- Prisma CLI connection config lives in `prisma.config.ts`
- Generated Prisma Client code lives in `server/generated/prisma/`
- Route protection is enforced both in client middleware and server API handlers

## Current Frontend Structure

### App shell

Main layout pieces:

- `app/app.vue`
  - global SEO/meta
  - `UApp`
  - `NuxtLayout`
  - `NuxtPage`
  - `NuxtPwaManifest`
- `app/layouts/default.vue`
  - dashboard sidebar
  - permission-filtered navigation
  - user menu
  - PWA install toast
- `app/middleware/access.global.ts`
  - redirects unauthenticated users to `/login`
  - checks page-level permissions from `definePageMeta`

### Current pages

- `/login`
  - email/password sign-in
  - Google sign-in
  - public route
- `/`
  - dashboard home
  - requires `dashboard.read`
- `/settings`
  - settings container page
  - requires `settings.read`
- `/settings` child index
  - workspace overview
- `/settings/members`
  - member directory
  - member creation modal
  - password management modal
  - requires `users.read`
- `/settings/roles`
  - role listing
  - role create/edit modal
  - requires `roles.read`
- `/settings/permissions`
  - permission registry and assignment visibility
  - custom permission create/edit modal
  - requires `permissions.read`

### Current composables

- `app/composables/useAuth.ts`
  - creates Better Auth client
  - forwards cookies on SSR
- `app/composables/useCurrentUser.ts`
  - fetches `/api/me`
  - central source for authenticated user state

### Current UI direction

The UI is based on Nuxt UI dashboard components:

- `UDashboardGroup`
- `UDashboardSidebar`
- `UDashboardPanel`
- `UDashboardNavbar`
- `UDashboardToolbar`
- `UPageCard`
- `UForm`, `UInput`, `UModal`, `UButton`, `UBadge`

Theme configuration:

- `app/app.config.ts`
  - app name: `Internal Dashboard`
  - primary color: `green`
  - neutral color: `zinc`
- `app/assets/css/main.css`
  - imports Tailwind and Nuxt UI
  - defines `Public Sans`
  - defines green palette tokens

## Authentication

Authentication is implemented with Better Auth.

Server auth entry points:

- `server/utils/auth-instance.ts`
- `server/api/auth/[...all].ts`

Current database integration details:

- Better Auth uses Prisma through `@better-auth/prisma-adapter`
- Prisma runtime access uses `PrismaMariaDb` in `server/utils/db.ts`
- Prisma Client is imported from `server/generated/prisma/client`

Supported login methods:

- Email/password
- Google OAuth

Current auth rules:

- Public signup is disabled
- Google signup is also disabled
- Account linking is enabled for trusted Google accounts
- Inactive users cannot create sessions
- Redirect target is stored in `auth_redirect` cookie when a guest is pushed to `/login`

## Authorization and RBAC

RBAC is implemented from database-backed tables and resolved server-side in `server/utils/rbac.ts`.

### Permission model

Current permission families:

- `dashboard.read`
- `settings.read`
- `users.read|create|update|delete`
- `roles.read|create|update|delete`
- `permissions.read|create|update|delete`
- `audit-logs.read`

Important permission keys already used by the app:

- `dashboard.read`
- `settings.read`
- `users.read`
- `users.create`
- `users.update`
- `roles.read`
- `roles.create`
- `roles.update`
- `roles.delete`

### Authorization storage

Authorization is database-backed:

- Better Auth handles authentication and sessions
- application authorization is resolved from database-backed RBAC tables
- permission definitions live in the database
- role definitions live in the database
- runtime permission and role resolution happens in `server/utils/rbac.ts`

Current DB-backed authorization tables:

- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

Compatibility behavior:

- application authorization no longer depends on a `Role.permissions` JSON cache
- runtime permission resolution uses normalized RBAC tables
- user-role assignment is fully normalized through `user_roles`
- roles are no longer hardcoded in shared runtime code
- system/custom protection is enforced through the `isSystem` column on RBAC tables

### Access enforcement

Access is enforced in two places:

- Client route middleware checks page metadata permissions
- Server API handlers call `requirePermission()` or `requireAnyPermission()`

This means hidden navigation alone is not the security layer. The API also enforces permission boundaries.

## Backend API Surface

Current server routes under `server/api/`:

- `GET /api/me`
  - returns current user plus resolved roles and permissions
- `GET /api/members`
  - returns member list
- `POST /api/members`
  - creates or updates an approved internal user
- `POST /api/members/:id/password`
  - sets or resets a user password
- `GET /api/roles`
  - returns roles with metadata and assignment counts
- `POST /api/roles`
  - creates a custom role
- `PATCH /api/roles/:id`
  - updates a custom role
- `DELETE /api/roles/:id`
  - deletes a custom role if unassigned
- `GET /api/roles/options`
  - returns simplified role options for forms
- `GET /api/permissions`
  - returns permission definitions plus role assignment metadata
- `POST /api/permissions`
  - creates a custom permission definition
- `PATCH /api/permissions/:id`
  - updates a custom permission definition
- `DELETE /api/permissions/:id`
  - deletes a custom permission definition if unassigned
- `/api/auth/*`
  - Better Auth handler routes

Current API characteristics:

- API routes have CORS enabled via `routeRules`
- Request body validation uses Zod
- Permission checks happen inside handlers
- Audit log records are created for member and role mutations

## Database Model

Prisma schema is in `prisma/schema.prisma`.

Current tables:

- `user`
- `session`
- `account`
- `verification`
- `audit_logs`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

### Notes on current schema design

- System roles and custom role definitions are stored in the `roles` table
- Permission definitions are stored in the `permissions` table
- User-role assignment is normalized through `user_roles`
- Role-permission assignment is normalized through `role_permissions`
- Audit logs store flexible JSON metadata
- The old `session.impersonatedBy` column has been removed

This means the app currently uses:

- normalized role definitions
- normalized user-role assignment storage
- normalized role-permission assignment storage
- app-owned password administration for internal member management

## Member Management

Current member workflow:

- admin opens `/settings/members`
- loads role options from `/api/roles/options`
- creates or updates a member by email
- assigns one or more role slugs
- optionally provisions password access

Current behavior details:

- creating a member uses upsert by email
- users can have multiple roles
- password is optional on creation
- users without password can still be Google-only
- password reset is exposed separately from the member list

## Role Management

Current role workflow:

- admin opens `/settings/roles`
- searches roles by name, slug, or description
- loads permission options from `/api/permissions`
- creates custom roles
- edits custom roles
- deletes custom roles if no user still has them assigned

Role deletion protection:

- system roles cannot be deleted
- custom roles cannot be deleted while assigned to members

## PWA

PWA is enabled through `@vite-pwa/nuxt`.

Current behavior:

- install prompt support is enabled
- manifest is registered
- favicon and app icons are included
- API routes are excluded from offline navigation fallback
- layout shows an install toast when the prompt is available

## Important Files

Core app:

- `nuxt.config.ts`
- `app/app.vue`
- `app/layouts/default.vue`
- `app/middleware/access.global.ts`
- `app/app.config.ts`
- `app/assets/css/main.css`

Auth and server:

- `server/utils/auth-instance.ts`
- `server/utils/auth.ts`
- `server/utils/db.ts`
- `server/utils/rbac.ts`

Shared contracts:

- `shared/rbac.ts`
- `shared/types/runtime.d.ts`

Data layer:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/seed-rbac.sql`
- `prisma/seed-super-admin-user.sql`
- `prisma/drop-impersonated-by.sql`
- `server/generated/prisma/`

## Scripts

Useful package scripts:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm start`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:deploy`
- `pnpm db:studio`
- `pnpm db:validate`

Important note:

- this repo no longer uses Prisma seed scripts
- initial RBAC/user bootstrap is done through manual SQL files under `prisma/`
- core permissions and system roles must exist in the database before the app is used

## Current Status

As of this document:

- the app follows standard Nuxt 4 directory boundaries
- the app uses Nuxt UI in an idiomatic dashboard layout
- Prisma 7 package install and client generation pass
- auth and RBAC are active
- members, roles, and permissions modules are implemented

## Current Limitations

Things that are not yet implemented or are still starter-level:

- no dedicated audit log UI page
- no user profile/self-service settings page
- no organization or tenant model
- no tests are present in the current repo snapshot

## Suggested Next Refactors

If this project keeps growing, the most likely next improvements are:

1. Add dedicated tests for internal user provisioning and password management.
2. Add feature-specific domains under `app/components/` and `server/api/`.
3. Add tests for auth, RBAC, and critical API handlers.
4. Add audit-log browsing UI.
5. Add stricter environment documentation for deployment.
