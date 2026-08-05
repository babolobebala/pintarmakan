# Project Overview

Last updated: 2026-07-30

## Summary

This repository is a Nuxt 4 internal dashboard application built from the Nuxt UI dashboard template and extended into an authenticated admin system.

Current implemented scope:

- Better Auth login flow
- Database-backed RBAC
- Member management
- Role management
- Permission management
- Food production dashboard mockup
- Administrative boundary map rendering
- Reusable analytics chart components
- PWA support

The project now behaves as a real internal dashboard with authenticated sessions, permission-gated navigation, protected API routes, reusable visual components, and manual SQL bootstrap files for RBAC.

## Stack

- Nuxt `4.5.0`
- Vue `3.5.x`
- Nuxt UI `4.10.0`
- Tailwind CSS `4`
- Better Auth `1.6.x`
- Prisma `7.8.0`
- `@prisma/adapter-mariadb`
- `mariadb`
- Zod
- `@vite-pwa/nuxt`
- Unovis via `@unovis/vue` and `@unovis/ts`

## Architecture

Project structure follows standard Nuxt boundaries:

- `app/`
  - app shell, pages, layouts, components, middleware, composables
- `server/`
  - Nitro API routes and server-only utilities
- `shared/`
  - shared runtime types and RBAC helpers
- `prisma/`
  - Prisma schema, migrations, and manual SQL bootstrap files
- `public/`
  - static assets, icons, and GeoJSON files
- `docs/`
  - project documentation

Important internal conventions:

- auth instance: `server/utils/auth-instance.ts`
- Prisma runtime client: `server/utils/db.ts`
- RBAC resolution: `server/utils/rbac.ts`
- Prisma CLI configuration: `prisma.config.ts`
- route protection: client middleware plus server-side permission checks

## Frontend Structure

### App shell

Main app shell files:

- `app/app.vue`
- `app/layouts/default.vue`
- `app/middleware/auth.global.ts`

Current shell responsibilities:

- wraps app with `UApp`, `NuxtLayout`, and `NuxtPage`
- renders dashboard sidebar and navbar
- filters navigation by permission
- redirects guests to `/login`
- enforces `definePageMeta({ permission: ... })`
- exposes PWA manifest support

### Current pages

- `/login`
  - public sign-in page
  - email/password and Google sign-in
- `/`
  - dashboard home
  - requires `dashboard.read`
- `/produksi-pangan`
  - production dashboard mockup
  - uses reusable Leaflet map component
  - requires `dashboard.read`
- `/demo-chart`
  - reusable chart showcase page
  - demonstrates line, area, bar, grouped bar, stacked bar, and donut charts
  - requires `dashboard.read`
- `/settings`
  - settings container page
  - requires `settings.read`
- `/settings` index
  - workspace overview
- `/settings/members`
  - member directory and password management
  - requires `users.read`
- `/settings/roles`
  - role CRUD UI
  - requires `roles.read`
- `/settings/permissions`
  - permission CRUD UI
  - requires `permissions.read`

### Rendering strategy

Current rendering rule in this repo:

- pages stay SSR by default
- browser-only widgets are isolated into client components
- full-page `ssr: false` should be reserved for true browser-only screens

Current page status:

- SSR page shell:
  - `/`
  - `/login`
  - `/produksi-pangan`
  - `/demo-chart`
  - `/settings`
  - `/settings/members`
  - `/settings/roles`
  - `/settings/permissions`
- client-only widgets inside SSR pages:
  - Leaflet map components
  - Unovis chart rendering components

### Reusable map components

Current map layer:

- `app/components/map/AdministrativeBoundaryMap.client.vue`
  - generic Leaflet administrative boundary renderer
- `app/components/dashboard/LeafletProductionMap.client.vue`
  - production dashboard wrapper

Current GeoJSON assets:

- `public/json/kab.geojson`
- `public/json/kec.geojson`
- `public/json/desa.geojson`

Current map behavior:

- administrative layers are rendered in hierarchy
- `desa` is the active clickable layer
- the production page can filter by kecamatan

### Reusable chart components

Current chart shell components:

- `app/components/charts/BaseChartPanel.vue`
- `app/components/charts/Legend.vue`
- `app/components/charts/LineChart.vue`
- `app/components/charts/AreaChart.vue`
- `app/components/charts/BarChart.vue`
- `app/components/charts/GroupedBarChart.vue`
- `app/components/charts/StackedBarChart.vue`
- `app/components/charts/DonutChart.vue`

Current client renderers:

- `app/components/charts/LineChartView.client.vue`
- `app/components/charts/AreaChartView.client.vue`
- `app/components/charts/BarChartView.client.vue`
- `app/components/charts/GroupedBarChartView.client.vue`
- `app/components/charts/StackedBarChartView.client.vue`
- `app/components/charts/DonutChartView.client.vue`

The intended pattern is:

- page stays SSR
- chart wrapper stays normal `.vue`
- actual Unovis renderer stays `.client.vue`

## Authentication

Authentication is implemented with Better Auth.

Main auth files:

- `server/utils/auth-instance.ts`
- `server/utils/auth-admin.ts`
- `server/api/auth/[...all].ts`
- `lib/auth-client.ts`
- `app/composables/useCurrentUser.ts`

Supported login methods:

- email/password
- Google OAuth

Current auth behavior:

- public signup is disabled
- Google signup is disabled
- trusted account linking is enabled
- inactive users cannot create sessions
- redirect target is stored in `auth_redirect`

## Authorization and RBAC

Authorization is database-driven and resolved server-side.

Core RBAC files:

- `server/utils/rbac.ts`
- `shared/rbac.ts`

Current permission families already used by the app:

- `dashboard.read`
- `settings.read`
- `users.read|create|update|delete`
- `roles.read|create|update|delete`
- `permissions.read|create|update|delete`
- `audit-logs.read`

Current RBAC storage model:

- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

Current enforcement model:

- client middleware reads page permission metadata
- server API handlers call permission guards
- navigation visibility is not the primary security layer

## Backend API Surface

Current server routes under `server/api/`:

- `GET /api/me`
- `GET /api/members`
- `POST /api/members`
- `POST /api/members/:id/password`
- `GET /api/roles`
- `POST /api/roles`
- `PATCH /api/roles/:id`
- `DELETE /api/roles/:id`
- `GET /api/roles/options`
- `GET /api/permissions`
- `POST /api/permissions`
- `PATCH /api/permissions/:id`
- `DELETE /api/permissions/:id`
- `/api/auth/*`

Current API characteristics:

- request validation uses Zod
- permission checks happen in handlers
- API CORS is enabled through Nuxt route rules for `/api/**`
- audit logs are written for important mutations

## Database Model

Prisma schema lives in `prisma/schema.prisma`.

Current core tables:

- `user`
- `session`
- `account`
- `verification`
- `audit_logs`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

Current schema notes:

- role definitions are normalized
- permission definitions are normalized
- user-role assignment is normalized through `user_roles`
- role-permission assignment is normalized through `role_permissions`
- audit logs use flexible JSON metadata
- `session.impersonatedBy` has been removed

Runtime database access:

- app runtime Prisma client is created in `server/utils/db.ts`
- Prisma uses `PrismaMariaDb` with DB env vars
- Prisma CLI connection URL is composed in `prisma.config.ts`

Current required DB env vars:

- `DB_CONNECTION`
- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`

## SQL Bootstrap Files

This repo no longer uses Prisma seed scripts.

Current manual SQL files under `prisma/`:

- `prisma/seed-rbac.sql`
- `prisma/seed-super-admin-user.sql`
- `prisma/drop-impersonated-by.sql`

These files are intended for manual database bootstrap when needed.

## PWA

PWA is enabled through `@vite-pwa/nuxt`.

Current behavior:

- manifest registration is enabled
- install prompt support is enabled
- static icons are included
- API routes are excluded from offline navigation fallback

## Important Files

Core app:

- `nuxt.config.ts`
- `app/app.vue`
- `app/layouts/default.vue`
- `app/middleware/auth.global.ts`
- `app/app.config.ts`
- `app/assets/css/main.css`

Auth and server:

- `server/utils/auth-instance.ts`
- `server/utils/auth.ts`
- `server/utils/db.ts`
- `server/utils/rbac.ts`

Visual layers:

- `app/components/map/AdministrativeBoundaryMap.client.vue`
- `app/components/dashboard/LeafletProductionMap.client.vue`
- `app/components/charts/`

Data layer:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/*.sql`

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

## Current Status

As of 2026-07-30:

- the app follows standard Nuxt 4 structure
- Better Auth is active
- DB-driven RBAC is active
- member, role, and permission management pages are implemented
- production map components are in place
- reusable chart components are in place
- dashboard pages follow SSR-first rendering with client-only visual widgets

## Current Limitations

Still missing or still mockup-level:

- no dedicated audit-log UI page
- no profile/self-service settings page
- no tenant or organization model
- no automated test suite in the current snapshot
- production and chart pages are still mockup/demo data driven

## Suggested Next Refactors

1. Add tests for auth, RBAC, and critical API handlers.
2. Move dashboard mock data behind real API endpoints.
3. Add dedicated audit-log browsing UI.
4. Add more environment and deployment documentation.
5. Split feature domains more aggressively as dashboard modules grow.
