# Graph Report - pintarmakan  (2026-08-08)

## Corpus Check
- 84 files · ~37,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 591 nodes · 638 edges · 77 communities (56 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `42a980c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- demo-chart.vue
- seed.ts
- include
- AdministrativeBoundaryMap.client.vue
- produksi-pangan.vue
- scripts
- pages/index.vue
- What You Must Do When Invoked
- login.vue
- members.vue
- MembersCreateModal.vue
- runtime.d.ts
- CartesianChartSeries
- AreaChartView.client.vue
- MembersPasswordModal.vue
- UserMenu.vue
- ChartAccessor
- DonutChartView.client.vue
- renovate.json
- GroupedBarChartView.client.vue
- StackedBarChartView.client.vue
- BarChartView.client.vue
- LineChartView.client.vue
- default.vue
- shared.ts
- index.d.ts
- auth-admin.ts
- db.ts
- StackedBarChart.vue
- app.vue
- auth.ts
- auth-instance.ts
- tsconfig.json
- BaseChartPanel.vue
- settings.vue
- password.post.ts
- status.post.ts
- members.post.ts
- {
  signIn,
  signOut,
  signUp,
  useSession
}
- Project Overview
- graphify reference: extra exports and benchmark
- cPanel Deployment via GitHub Actions
- Nuxt Dashboard Template
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- extraction-spec.md
- devDependencies
- push.ts
- PushNotificationsCard.vue
- usePushNotifications.ts
- sw.ts
- Web Push
- subscribe.post.ts
- subscribe.delete.ts

## God Nodes (most connected - your core abstractions)
1. `Project Overview` - 16 edges
2. `ChartAccessor` - 14 edges
3. `scripts` - 14 edges
4. `What You Must Do When Invoked` - 12 edges
5. `include` - 11 edges
6. `CartesianChartSeries` - 10 edges
7. `compilerOptions` - 10 edges
8. `/graphify` - 10 edges
9. `resolveChartColor()` - 9 edges
10. `reconcileExistingUserRoles()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `main()` --references--> `@prisma/client`  [EXTRACTED]
  prisma/seed.ts → package.json
- `normalizeSeedRoles()` --calls--> `isKnownRole()`  [EXTRACTED]
  prisma/seed.ts → auth/permissions.ts
- `canSetRolesForCurrentUser()` --calls--> `getEffectiveRoles()`  [EXTRACTED]
  prisma/seed.ts → auth/permissions.ts
- `serializeStoredRole()` --calls--> `getEffectiveRoles()`  [EXTRACTED]
  prisma/seed.ts → auth/permissions.ts
- `colorAccessor()` --calls--> `resolveChartColor()`  [EXTRACTED]
  app/components/charts/DonutChartView.client.vue → app/components/charts/shared.ts

## Import Cycles
- None detected.

## Communities (77 total, 21 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (45): better-auth, @better-auth/prisma-adapter, date-fns, @iconify-json/lucide, @iconify-json/simple-icons, @internationalized/date, mariadb, nuxt (+37 more)

### Community 1 - "demo-chart.vue"
Cohesion: 0.05
Nodes (24): Datum, props, TickFormatter, areaSupplyData, AreaSupplyDatum, areaSupplySeries, ChartDatum, districtBarData (+16 more)

### Community 2 - "seed.ts"
Cohesion: 0.08
Nodes (43): ac, adminRoleSlugs, AppAccessRequest, AppActionRequest, appPermissions, AppRoleSlug, AppStatementAction, AppStatementKey (+35 more)

### Community 3 - "include"
Cohesion: 0.09
Nodes (22): auth/**/*.ts, lib/**/*.ts, node, prisma.config.ts, prisma/**/*.cts, prisma/**/*.js, prisma/**/*.mjs, prisma/**/*.mts (+14 more)

### Community 4 - "AdministrativeBoundaryMap.client.vue"
Cohesion: 0.14
Nodes (17): ensureLeaflet(), filterGeoJsonByKecamatan(), getLeaflet(), LeafletBoundsInstance, LeafletGeoJsonData, LeafletGeoJsonFeature, LeafletGeoJsonFeatureLayerInstance, LeafletGeoJsonLayerInstance (+9 more)

### Community 5 - "produksi-pangan.vue"
Cohesion: 0.11
Nodes (17): activeDistricts, averageProductivity, commodityData, CommodityDefinition, CommodityKey, commodityOptions, coverageLabel, districtOptions (+9 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): name, packageManager, private, scripts, build, db:deploy, db:generate, db:migrate (+10 more)

### Community 7 - "pages/index.vue"
Cohesion: 0.13
Nodes (12): FoodPriority, ikpPolyline, MetricCard, metricCards, pphPolyline, RegionalSnapshot, regionalSnapshots, spotlightPrograms (+4 more)

### Community 8 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 9 - "login.vue"
Cohesion: 0.13
Nodes (12): appConfig, brandName, googleErrorMessage, googleLoading, loading, redirectCookie, redirectTo, route (+4 more)

### Community 10 - "members.vue"
Cohesion: 0.15
Nodes (9): canCreateMembers, canManagePassword, canManageStatus, { data: members, refresh }, filteredMembers, passwordModalOpen, q, selectedMember (+1 more)

### Community 11 - "MembersCreateModal.vue"
Cohesion: 0.20
Nodes (10): { data: roles }, emit, loading, onSubmit(), open, roleOptions, roleSlugs, schema (+2 more)

### Community 12 - "runtime.d.ts"
Cohesion: 0.18
Nodes (9): #app, bun:sqlite, @cloudflare/workers-types, D1Database, Database, PageMeta, RouteMeta, Timer (+1 more)

### Community 13 - "CartesianChartSeries"
Cohesion: 0.22
Nodes (7): Datum, props, TickFormatter, Datum, props, TickFormatter, CartesianChartSeries

### Community 14 - "AreaChartView.client.vue"
Cohesion: 0.25
Nodes (8): Datum, legendItems, normalizedSeries, props, TickFormatter, colorAccessor(), buildLegendItems(), resolveChartColor()

### Community 15 - "MembersPasswordModal.vue"
Cohesion: 0.25
Nodes (8): emit, loading, onSubmit(), open, props, schema, state, toast

### Community 16 - "UserMenu.vue"
Cohesion: 0.22
Nodes (7): appConfig, colorMode, colors, items, neutrals, router, user

### Community 17 - "ChartAccessor"
Cohesion: 0.25
Nodes (6): Datum, props, Datum, props, TickFormatter, ChartAccessor

### Community 18 - "DonutChartView.client.vue"
Cohesion: 0.25
Nodes (7): Datum, legendItems, props, resolvedCentralLabel, resolvedCentralSubLabel, total, sumBy()

### Community 19 - "renovate.json"
Cohesion: 0.25
Nodes (7): github>nuxt/renovate-config-nuxt, pnpmDedupe, extends, lockFileMaintenance, enabled, packageRules, postUpdateOptions

### Community 20 - "GroupedBarChartView.client.vue"
Cohesion: 0.29
Nodes (6): Datum, legendItems, props, seriesAccessors, seriesColors, TickFormatter

### Community 21 - "StackedBarChartView.client.vue"
Cohesion: 0.29
Nodes (6): Datum, legendItems, props, seriesAccessors, seriesColors, TickFormatter

### Community 22 - "BarChartView.client.vue"
Cohesion: 0.33
Nodes (5): colorAccessor, Datum, props, TickFormatter, useUnovisStyles()

### Community 23 - "LineChartView.client.vue"
Cohesion: 0.33
Nodes (5): Datum, legendItems, normalizedSeries, props, TickFormatter

### Community 24 - "default.vue"
Cohesion: 0.33
Nodes (5): appConfig, brand, links, open, toast

### Community 26 - "index.d.ts"
Cohesion: 0.40
Nodes (4): AuthSessionResponse, AuthSessionUser, Member, RoleOption

### Community 28 - "db.ts"
Cohesion: 0.50
Nodes (4): createPrismaClient(), db, getMariaDbConfig(), globalForPrisma

### Community 29 - "StackedBarChart.vue"
Cohesion: 0.50
Nodes (3): Datum, props, TickFormatter

### Community 55 - "Project Overview"
Cohesion: 0.09
Nodes (21): App shell, Architecture, Authentication, Authorization and RBAC, Backend API Surface, Current Limitations, Current pages, Current Status (+13 more)

### Community 56 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 57 - "cPanel Deployment via GitHub Actions"
Cohesion: 0.25
Nodes (7): cPanel Deployment via GitHub Actions, GitHub repository secrets, Notes, One-time cPanel setup, Requirements, Triggering deployment, Workflow behavior

### Community 58 - "Nuxt Dashboard Template"
Cohesion: 0.25
Nodes (7): Deploy your own, Development Server, Nuxt Dashboard Template, Production, Quick Start, Renovate integration, Setup

### Community 59 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 60 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 61 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 62 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 67 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, @nuxt/eslint, devDependencies, eslint, @nuxt/eslint, prisma, tsx, @types/node (+15 more)

### Community 68 - "push.ts"
Cohesion: 0.39
Nodes (8): ensurePushConfig(), getConfiguredBaseUrl(), getPublicVapidKey(), getStatusCode(), normalizeInternalUrl(), normalizePayload(), PushNotificationPayload, sendPushToUser()

### Community 69 - "PushNotificationsCard.vue"
Cohesion: 0.25
Nodes (4): {
  busy,
  isSupported,
  permission,
  isSubscribed,
  subscribe,
  unsubscribe,
  refreshSubscriptionState
}, loadingTest, state, toast

## Knowledge Gaps
- **350 isolated node(s):** `colorMode`, `color`, `colorMode`, `appConfig`, `router` (+345 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `dependencies` to `seed.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `main()` connect `seed.ts` to `dependencies`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `colorMode`, `color`, `colorMode` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `demo-chart.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08325624421831637 - nodes in this community are weakly interconnected._