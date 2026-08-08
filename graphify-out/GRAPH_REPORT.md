# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 419 nodes · 448 edges · 55 communities (43 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d5a207d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- demo-chart.vue
- permissions.ts
- compilerOptions
- AdministrativeBoundaryMap.client.vue
- produksi-pangan.vue
- scripts
- pages/index.vue
- devDependencies
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

## God Nodes (most connected - your core abstractions)
1. `ChartAccessor` - 14 edges
2. `scripts` - 13 edges
3. `CartesianChartSeries` - 10 edges
4. `compilerOptions` - 10 edges
5. `resolveChartColor()` - 9 edges
6. `include` - 9 edges
7. `useUnovisStyles()` - 7 edges
8. `renderMap()` - 7 edges
9. `buildLegendItems()` - 6 edges
10. `parseStoredRoles()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `colorAccessor()` --calls--> `resolveChartColor()`  [EXTRACTED]
  app/components/charts/DonutChartView.client.vue → app/components/charts/shared.ts

## Import Cycles
- None detected.

## Communities (55 total, 12 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (43): better-auth, @better-auth/prisma-adapter, date-fns, @iconify-json/lucide, @iconify-json/simple-icons, @internationalized/date, mariadb, nuxt (+35 more)

### Community 1 - "demo-chart.vue"
Cohesion: 0.05
Nodes (24): Datum, props, TickFormatter, areaSupplyData, AreaSupplyDatum, areaSupplySeries, ChartDatum, districtBarData (+16 more)

### Community 2 - "permissions.ts"
Cohesion: 0.12
Nodes (22): ac, adminRoleSlugs, AppAccessRequest, AppActionRequest, appPermissions, AppRoleSlug, AppStatementAction, AppStatementKey (+14 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (20): lib/**/*.ts, node, prisma.config.ts, prisma/**/*.cts, prisma/**/*.js, prisma/**/*.mjs, prisma/**/*.mts, prisma/**/*.ts (+12 more)

### Community 4 - "AdministrativeBoundaryMap.client.vue"
Cohesion: 0.14
Nodes (17): ensureLeaflet(), filterGeoJsonByKecamatan(), getLeaflet(), LeafletBoundsInstance, LeafletGeoJsonData, LeafletGeoJsonFeature, LeafletGeoJsonFeatureLayerInstance, LeafletGeoJsonLayerInstance (+9 more)

### Community 5 - "produksi-pangan.vue"
Cohesion: 0.11
Nodes (17): activeDistricts, averageProductivity, commodityData, CommodityDefinition, CommodityKey, commodityOptions, coverageLabel, districtOptions (+9 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (17): name, packageManager, private, scripts, build, db:deploy, db:generate, db:migrate (+9 more)

### Community 7 - "pages/index.vue"
Cohesion: 0.13
Nodes (12): FoodPriority, ikpPolyline, MetricCard, metricCards, pphPolyline, RegionalSnapshot, regionalSnapshots, spotlightPrograms (+4 more)

### Community 8 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, @nuxt/eslint, devDependencies, eslint, @nuxt/eslint, prisma, @types/node, typescript (+7 more)

### Community 9 - "login.vue"
Cohesion: 0.15
Nodes (10): appConfig, brandName, googleLoading, loading, redirectCookie, redirectTo, router, schema (+2 more)

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

## Knowledge Gaps
- **255 isolated node(s):** `colorMode`, `color`, `colorMode`, `appConfig`, `router` (+250 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `ChartAccessor` connect `ChartAccessor` to `demo-chart.vue`, `CartesianChartSeries`, `AreaChartView.client.vue`, `DonutChartView.client.vue`, `GroupedBarChartView.client.vue`, `StackedBarChartView.client.vue`, `BarChartView.client.vue`, `LineChartView.client.vue`, `shared.ts`, `StackedBarChart.vue`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `colorMode`, `color`, `colorMode` to the rest of the system?**
  _255 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `demo-chart.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `permissions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._