# AGENTS.md

## Project

- This is a Nuxt application using TypeScript, Prisma, MySQL, Better Auth, Nuxt UI, and `@vite-pwa/nuxt`.
- Preserve the existing architecture and project conventions.
- Prefer minimal, targeted changes over broad refactors.
- Inspect existing implementations before introducing new abstractions.
- Reuse existing utilities, composables, patterns, and components when appropriate.
- Do not modify unrelated files.
- Do not create commits unless explicitly requested.
- Preserve unrelated existing worktree changes.

---

## Graphify

- `graphify-out/` is generated local analysis output and is intentionally
  ignored by Git.
- Use Graphify when dependency, architecture, call-path, or cross-file
  context materially helps.
- If `graphify-out/graph.json` exists, prefer scoped `query`, `path`, or
  `explain` commands.
- If the graph does not exist and Graphify context is useful, build it once
  before querying.
- Run `graphify update .` after significant structural changes.
- Do not regenerate Graphify for trivial or isolated changes.
- Never stage or commit `graphify-out/**`.

### Usage

Use Graphify when dependency, architecture, call-path, or cross-file context materially helps.

Prefer:

- `graphify query "<question>"` for scoped codebase questions.
- `graphify path "<A>" "<B>"` for relationships between two concepts/files/nodes.
- `graphify explain "<concept>"` for focused concept analysis.

When `graphify-out/graph.json` exists, prefer scoped Graphify queries over reading the entire graph or performing unnecessarily broad source exploration.

If `graphify-out/wiki/index.md` exists, prefer it for broad architecture navigation.

Read `graphify-out/GRAPH_REPORT.md` only when:

- performing a broad architecture review; or
- query/path/explain does not provide enough context.

Dirty `graphify-out/` files are expected after hooks or incremental updates and are not a reason to skip Graphify.

### Update policy

Run:

`graphify update .`

after significant structural changes such as:

- adding/removing APIs;
- changing authentication/authorization flows;
- large refactors;
- adding modules;
- moving major files;
- changing important cross-file dependencies.

Do NOT update Graphify for trivial:

- copy/text changes;
- styling changes;
- isolated UI edits;
- comments;
- other non-structural changes.

Do not manually edit generated Graphify output unless explicitly working on Graphify itself.

---

## Better Auth

Better Auth is the canonical authentication and authorization system.

The canonical access-control definition is:

`auth/permissions.ts`

This must remain the single source of truth for predefined:

- resources;
- actions;
- permissions;
- roles;
- role permission sets;
- Better Auth access-control configuration.

Rules:

- Do not introduce a second RBAC implementation.
- Do not create separate database-backed role/permission systems unless explicitly requested.
- Preserve native Better Auth multi-role behavior.
- Use documented Better Auth public APIs.
- Do not use Better Auth internal adapters or private APIs.
- Do not manually hash passwords.
- Do not manually create credential account records when Better Auth provides an API.
- Do not directly manipulate Better Auth user/account/session/verification data when a supported Better Auth API exists.
- Server-side authorization must remain server-enforced.
- Client-side UI visibility is not a substitute for authorization.

---

## Prisma

`prisma/schema.prisma` is the Prisma schema source of truth.

### Generated Prisma Client

Never manually edit:

`server/generated/prisma/**`

Rules:

- Generated Prisma Client files must remain ignored by Git.
- Do not stage or commit generated Prisma Client files.
- Regenerate Prisma Client only when necessary.
- Do not treat generated files as source files.

### Migrations

- Do not modify previously applied migrations unless explicitly requested.
- Do not rewrite, delete, repair, resolve, reset, or squash migration history unless explicitly requested.
- Do not run destructive database operations unless explicitly requested.
- Do not perform production database migrations as part of unrelated tasks.
- Do not automatically repair migration state because Prisma reports a migration-history problem.

When a new schema change genuinely requires a migration, follow the current project migration workflow and preserve historical migrations.

---

## Dataset Schema Contract V1

This section is the canonical contract for all future work involving:

- `datasets`
- `dataset_records`
- dataset CRUD
- dataset record CRUD
- dynamic forms
- API validation
- import/export
- dataset tables
- dataset filters
- dashboard dataset consumption

### 1. Core Model

The application uses:

- `datasets` as the definition/template of a business dataset.
- `dataset_records` as the actual data snapshots produced from a dataset definition.

Relationship:

`datasets` 1:N `dataset_records`

One `dataset_record` represents:

- one dataset;
- one region;
- one normalized period; and
- one complete business payload matching `datasets.dataSchema`.

Example:

- `datasetId = FOOD_STOCK_DAILY`
- `regionId = 52.07.02`
- `periodDate = 2026-08-11`

`data`:

```json
{
  "beras": 5000,
  "jagung": 2100,
  "padi": 3200
}
```

Do not model every commodity or individual field as a separate dataset record.

A dataset record represents the complete snapshot defined by the dataset schema for one region and one period.

### 2. `datasets.dataSchema`

`dataSchema` defines what business data fields exist in a dataset.

Canonical V1 structure:

```json
{
  "version": 1,
  "fields": [
    {
      "key": "value",
      "label": "Nilai",
      "type": "number",
      "unit": "indeks",
      "required": false
    }
  ]
}
```

Canonical field properties:

- `key`: required
- `label`: required
- `type`: required
- `unit`: optional
- `required`: required boolean
- `options`: optional; used when relevant, especially for `select`
- `description`: optional

Do not invent arbitrary properties without intentionally extending or versioning this contract.

### 3. Field Key Convention

All `dataSchema.fields[].key` values must use camelCase.

Valid examples:

- `value`
- `beras`
- `cabaiRawit`
- `luasPanen`
- `pphKetersediaan`
- `jumlahRumahTanggaRentan`

Do not use mixed naming styles such as:

- `cabai_rawit`
- `CabaiRawit`
- `CABAI_RAWIT`
- `cabai-rawit`

Dataset IDs use a different convention and must remain uppercase technical identifiers, for example:

- `IKP_YEARLY`
- `PPH_CONSUMPTION_YEARLY`
- `PPH_AVAILABILITY_YEARLY`
- `FOOD_STOCK_DAILY`
- `FOOD_PRODUCTION_MONTHLY`

### 4. Supported Field Types

Dataset Schema Contract V1 supports only:

- `number`
- `text`
- `textarea`
- `select`
- `boolean`
- `date`

Do not introduce nested groups, matrices, arbitrary nested objects, or other dynamic types unless the contract is explicitly extended or versioned.

#### `number`

Schema example:

```json
{
  "key": "value",
  "label": "Indeks Ketahanan Pangan",
  "type": "number",
  "unit": "indeks",
  "required": false
}
```

Persist actual JSON numbers:

```json
{
  "value": 80.4
}
```

Do not persist numeric values as strings such as:

```json
{
  "value": "80.4"
}
```

#### `text`

Schema values must be persisted as JSON strings.

Example:

```json
{
  "keterangan": "Kondisi aman"
}
```

#### `textarea`

The persisted representation is also a JSON string.

`textarea` differs from `text` only in frontend presentation.

#### `select`

Schema example:

```json
{
  "key": "status",
  "label": "Status",
  "type": "select",
  "required": false,
  "options": [
    {
      "value": "AMAN",
      "label": "Aman"
    },
    {
      "value": "WASPADA",
      "label": "Waspada"
    },
    {
      "value": "RAWAN",
      "label": "Rawan"
    }
  ]
}
```

Persist only the selected option value:

```json
{
  "status": "AMAN"
}
```

Do not persist duplicated option objects such as:

```json
{
  "status": {
    "value": "AMAN",
    "label": "Aman"
  }
}
```

The label belongs to `dataSchema`.

#### `boolean`

Persist actual JSON booleans:

```json
{
  "terverifikasi": true
}
```

#### `date`

Persist date values using the canonical format `YYYY-MM-DD`.

Example:

```json
{
  "tanggalPublikasi": "2026-08-11"
}
```

### 5. Required and Null Behavior

`required: true` means:

- the field must exist; and
- the field must not be `null`.

`required: false` means:

- the field may contain `null`.

For optional schema-defined fields, prefer preserving the key with a `null` value rather than omitting the key.

Preferred:

```json
{
  "ikp": 80.4,
  "catatan": null
}
```

This keeps forms, dynamic tables, exports, validation, and chart processing predictable.

### 6. `dataset_records.data`

`dataset_records.data` must be a flat JSON object.

Its keys must correspond exactly to `datasets.dataSchema.fields[].key`.

Example schema field keys:

- `beras`
- `jagung`
- `cabaiRawit`

Valid record payload:

```json
{
  "beras": 5000,
  "jagung": 2100,
  "cabaiRawit": 24
}
```

Do not duplicate relational metadata inside `data`.

The following values belong only in relational columns:

- `datasetId`
- `regionId`
- `ownerBidangId`
- `periodDate`
- `status`
- `createdBy`
- `createdAt`
- `updatedAt`

Invalid example:

```json
{
  "regionId": "52.07",
  "periodDate": "2026-01-01",
  "createdBy": "user-id",
  "value": 80.4
}
```

Correct:

- `dataset_records.datasetId = IKP_YEARLY`
- `dataset_records.regionId = 52.07`
- `dataset_records.periodDate = 2026-01-01`

`dataset_records.data`:

```json
{
  "value": 80.4
}
```

The JSON payload contains business data only.

### 7. Unknown Fields

Server-side validation must reject fields that are not declared in `dataSchema`.

If the schema contains only:

- `value`
- `catatan`

then this payload must be rejected:

```json
{
  "value": 80,
  "catatan": null,
  "randomField": "abc"
}
```

Do not silently persist unknown fields.

### 8. `datasets.dataConfig`

`dataConfig` defines how the dataset behaves in the application.

Canonical Dataset Schema Contract V1 structure:

```json
{
  "version": 1,
  "periodicity": "YEARLY",
  "useRegion": true,
  "regionLevel": "KABUPATEN"
}
```

Canonical properties:

- `version`
- `periodicity`
- `useRegion`
- `regionLevel`

`dataSchema` and `dataConfig` have strictly separate responsibilities:

- `dataSchema` = what data exists
- `dataConfig` = how the dataset behaves

Do not store dashboard presentation configuration in `dataConfig`.

Do not place things such as:

- chart colors
- widget size
- widget position
- dashboard layout
- UI styling

inside Dataset Schema Contract V1 `dataConfig`.

### 9. Periodicity

Canonical V1 periodicity values:

- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `QUARTERLY`
- `YEARLY`

`dataset_records.periodDate` stores one normalized SQL `DATE`.

Normalization rules:

- `DAILY`: use the actual selected date.
- `WEEKLY`: use the canonical start date of the week according to the application's weekly convention.
- `MONTHLY`: use the first day of the month.
- `QUARTERLY`: use the first day of the quarter.
- `YEARLY`: use the first day of the year.

Examples:

- `11 August 2026 -> 2026-08-11`
- `August 2026 -> 2026-08-01`
- `Q3 2026 -> 2026-07-01`
- `2026 -> 2026-01-01`

Do not introduce `periodStart` or `periodEnd` for standard dataset records.

### 10. Region Contract

The application uses the canonical `regions` table.

`regions.id` directly stores the Kemendagri region identifier.

Examples:

- `52.07`
- `52.07.02`
- `52.07.02.2001`

Canonical V1 region levels:

- `KABUPATEN`
- `KECAMATAN`
- `DESA_KELURAHAN`

`dataConfig.regionLevel` defines the region level allowed for dataset record creation.

Example:

```json
{
  "version": 1,
  "periodicity": "DAILY",
  "useRegion": true,
  "regionLevel": "KECAMATAN"
}
```

This means the dataset record must reference a region whose level is `KECAMATAN`.

Do not duplicate region names or region codes inside `dataset_records.data`.

Use only `dataset_records.regionId`.

### 11. Dataset Record Identity and Uniqueness

The canonical business identity of a dataset record is:

`datasetId + regionId + periodDate`

The database must enforce:

`UNIQUE(datasetId, regionId, periodDate)`

`ownerBidangId` must not be included in this unique constraint.

There must never be two independent snapshots for the same dataset, region, and normalized period.

If the snapshot already exists, edit or update the existing record instead of creating another record.

### 12. Authorization

Dataset authorization uses the existing application architecture:

`user.role`
-> `auth_user_to_bidang`
-> `auth_bidang`
-> `auth_bidang_dataset_permissions`
-> `datasets`
-> `dataset_records`

`auth_bidang_dataset_permissions` defines dataset-level permissions:

- `canRead`
- `canCreate`
- `canUpdate`
- `canDelete`
- `canImport`
- `canExport`

All permission flags follow deny-by-default behavior and default to `false`.

`dataset_records.ownerBidangId` identifies which bidang owns or is responsible for the specific record.

Keep these concepts separate:

- `user.role` = global application role or access level
- `auth_bidang_dataset_permissions` = which actions a bidang may perform against a dataset
- `dataset_records.ownerBidangId` = which bidang owns or is responsible for a particular record

Do not store authorization inside:

- `datasets.dataSchema`
- `datasets.dataConfig`
- `dataset_records.data`

Do not create a second RBAC system.

### 13. Server Validation Contract

When creating or updating `dataset_records`, server-side code must:

1. authenticate the request using the existing Better Auth implementation;
2. load the referenced dataset;
3. read `dataset.dataSchema`;
4. validate submitted data against all declared fields;
5. reject unknown fields;
6. enforce `required`;
7. enforce declared field types;
8. enforce valid `select.options`;
9. allow `null` only when `required = false`;
10. persist actual JSON values, not serialized JSON strings;
11. read `dataset.dataConfig`;
12. validate and normalize `periodDate` according to periodicity;
13. validate `regionId` and `regionLevel`;
14. enforce `UNIQUE(datasetId, regionId, periodDate)`;
15. enforce existing bidang permissions; and
16. derive `createdBy` from the authenticated user instead of trusting client input.

Frontend validation is UX only and must never replace server-side validation.

### 14. Dynamic Form Contract

Dataset record forms must be generated from `dataSchema`.

Canonical mapping:

- `number` -> numeric input
- `text` -> text input
- `textarea` -> textarea
- `select` -> select using `options`
- `boolean` -> checkbox or switch
- `date` -> date picker or date input

Operators must not be required to manually edit raw JSON when entering dataset records.

### 15. Import Contract

Import logic must use the same Dataset Schema Contract V1.

One imported tabular row represents:

- one complete dataset snapshot;
- for one region; and
- for one period.

Business columns map to `dataSchema.fields[].key`.

Example spreadsheet for `FOOD_STOCK_DAILY`:

```text
Tanggal | Kecamatan | Beras | Jagung | Padi
2026-08-11 | Taliwang | 5000 | 2100 | 3200
2026-08-11 | Maluk    | 1200 | 800  | 950
2026-08-12 | Taliwang | 4980 | 2150 | 3180
```

Each row becomes one `dataset_record`.

Imported values must pass the exact same validation as manually entered records.

Do not implement separate validation rules specifically for imports.

### 16. Export Contract

Exports should derive business columns from `dataSchema`.

Use human-readable `label` values for exported column headers while retaining canonical `key` values internally.

Do not export the business payload as one unreadable raw JSON column unless explicitly requested.

### 17. Versioning

Both `dataSchema` and `dataConfig` must contain:

```json
{
  "version": 1
}
```

Dataset Schema Contract V1 is the current canonical format.

Do not silently change V1 semantics.

If future requirements require incompatible structures, introduce a new explicit contract version rather than mutating the meaning of V1.

### 18. Schema Mutation Safety

Changing `datasets.dataSchema` may affect historical `dataset_records`.

Examples of generally safe changes:

- adding a new optional field

Examples of potentially breaking changes:

- renaming an existing field key
- removing a used field
- changing a field type
- changing an optional field to required after historical records already exist

Do not automatically rewrite historical dataset records or perform breaking schema migrations unless explicitly requested.

Treat `dataSchema.fields[].key` as a stable persisted data contract once records exist.

### 19. Architectural Boundary

Keep the following distinction strict.

Relational database columns are responsible for:

- identity
- authentication
- authorization
- region
- ownership
- period
- status
- audit or user metadata

JSON is responsible for:

- dynamic business payload

Do not introduce business master tables such as:

- commodities
- units
- markets
- institutions
- `data_sources`
- indicators

unless explicitly requested by the project owner.

### 20. Source of Truth for Future Agents

This `Dataset Schema Contract V1` section must be treated as the source of truth for future work involving:

- `datasets`
- `dataset_records`
- dataset CRUD
- dataset record CRUD
- dynamic forms
- API validation
- import/export
- dataset tables
- dataset filters
- dashboard dataset consumption

If a future requirement conflicts with Dataset Schema Contract V1:

- do not silently invent a different data structure;
- explicitly identify the conflict; and
- only extend or version the contract when the requirement genuinely requires it.

---

## Nuxt UI

When implementing or modifying UI using Nuxt UI:

- Use the installed Nuxt UI MCP when component/API knowledge is needed.
- Prefer official Nuxt UI components over manually recreating equivalent controls.
- Use current component APIs discovered through MCP instead of guessing props or behavior.
- Reuse existing project UI conventions and components.
- Do not introduce another UI framework unless explicitly requested.

Do not call Nuxt UI MCP unnecessarily for trivial text or style-only changes where the existing component usage already provides sufficient context.

---

## Validation Policy

Use the cheapest validation that provides meaningful confidence for the actual change.

Do NOT automatically run every available validation command after every edit.

Do NOT run `pnpm run build` by default.

### Small/localized changes

For changes such as:

- copy/text changes;
- small layout changes;
- styling;
- simple component edits;
- small composable changes;
- straightforward server-route edits;

prefer:

1. inspect the changed files;
2. review the diff;
3. run targeted validation only when useful.

A full production build is normally unnecessary.

### ESLint

Prefer targeted ESLint against changed files when practical.

Do not run repository-wide lint repeatedly for small isolated changes unless necessary.

### TypeScript / Vue

Run:

`pnpm run typecheck`

when the change materially affects:

- TypeScript behavior;
- Vue component contracts;
- composables;
- server APIs;
- shared types;
- complex state;
- public interfaces.

Typecheck is usually unnecessary for trivial copy/style-only changes.

### Prisma

When Prisma-related source changes require validation, use as appropriate:

- `pnpm exec prisma validate`
- `pnpm exec prisma generate`
- relevant type checking

Do not run Prisma validation/generation for unrelated changes.

---

## Local Production Build Policy

`pnpm run build` is a production packaging check, not a default post-edit validation step.

Run a local production build only when the change materially affects:

- `nuxt.config.ts`;
- Nitro or production server bundling;
- PWA/service workers;
- Nuxt modules;
- Nuxt plugins;
- dependencies or package configuration;
- SSR/client boundaries;
- runtime configuration;
- deployment configuration;
- production-only module resolution;
- build-time generated artifacts;
- or when explicitly requested.

Examples where a local build IS appropriate:

- changing `generateSW` / `injectManifest`;
- modifying a custom service worker;
- changing Nitro presets;
- changing Nuxt modules;
- changing production runtime configuration;
- adding dependencies that must be bundled server-side;
- changing deployment entrypoints.

Examples where a local build is normally NOT needed:

- changing button text;
- changing card layout;
- modifying simple settings UI;
- updating labels;
- small Vue component changes;
- straightforward API logic;
- small composable changes.

The GitHub Actions deployment pipeline performs the authoritative production build before deployment.

Do not duplicate full CI build validation locally without a concrete technical reason.

---

## Repeated Validation

Do not rerun expensive checks when:

- the same check already passed; and
- no relevant files changed afterward.

Do not repeatedly run:

- build;
- typecheck;
- Prisma generate;
- Graphify update;

without a meaningful reason.

Choose validation once, at the appropriate point after relevant edits are complete.

---

## pnpm / Corepack Sandbox

The Codex sandbox may block `pnpm` because Corepack cannot verify or resolve the pinned package-manager release, registry metadata, or package signature.

If a `pnpm` command fails because of:

- Corepack;
- package signature verification;
- package registry/network access;
- sandbox restrictions;

then:

- do not automatically retry with elevated permissions when the command is optional;
- do not repeatedly retry the same command;
- do not modify package-manager configuration merely to bypass the sandbox;
- do not reinstall or replace the package manager merely for optional validation;
- report the validation as blocked when appropriate;
- continue the task when it can safely be completed without that validation.

Use elevated execution only when the blocked command is genuinely required to complete the requested task.

Optional validation is not sufficient justification for elevated execution.

---

## Runtime Testing

Always distinguish between:

- static inspection;
- linting;
- type checking;
- production build;
- actual runtime testing.

Do not claim runtime behavior was tested when it was only:

- inspected;
- linted;
- typechecked;
- built.

If browser/device/database/external-service runtime testing cannot be completed, state that clearly.

Do not create risky or unnecessary workarounds solely to claim runtime validation succeeded.

---

## PWA

The project uses `@vite-pwa/nuxt`.

Preserve the existing PWA architecture unless the requested task explicitly requires changes.

When modifying:

- service workers;
- precaching;
- Web Push;
- install behavior;
- manifest behavior;

verify browser-only APIs are safe with SSR and run a production build when necessary.

Do not introduce Firebase or another push infrastructure when the existing standard Web Push implementation is sufficient unless explicitly requested.

---

## Audit Logs

`audit_logs` is application-level audit infrastructure.

Use it only for meaningful actions where an audit trail provides value.

Do not produce excessive audit events for trivial or high-frequency internal operations.

Do not store:

- passwords;
- auth tokens;
- private keys;
- sensitive credential material;

inside audit metadata.

---

## Scope Discipline

Before finishing a task:

- review the diff;
- ensure unrelated files were not modified;
- preserve user work already present in the working tree;
- remove accidental temporary artifacts;
- do not expand scope without a concrete technical reason;
- do not refactor unrelated systems;
- do not create new abstractions when an existing one already solves the problem.

If an unrelated issue is discovered:

- mention it briefly;
- do not fix it unless necessary for the requested task.

---

## Git

- Do not create commits unless explicitly requested.
- Do not push unless explicitly requested.
- Do not revert unrelated user changes.
- Preserve existing worktree changes.
- Generated artifacts that are intentionally ignored must remain untracked.

---

## Final Response

Keep completion reports concise.

Prefer reporting:

- what changed;
- important architectural decisions;
- validation actually performed;
- runtime tests actually performed;
- blockers or validations skipped.

Do not produce long file-by-file inventories unless explicitly requested.

Do not claim success for tests that were not actually executed.

---

## Formatting

- Do not run Prettier unless explicitly requested.
- Do not auto-format edited files.
- Prefer preserving existing formatting when possible.
