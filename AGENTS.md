# AGENTS.md

## Project

This is the `pintarmakan` Nuxt application.

Stack:

- Nuxt
- TypeScript
- Prisma
- MySQL
- Better Auth
- Nuxt UI
- `@vite-pwa/nuxt`
- pnpm

The global OpenCode `AGENTS.md` already defines general agent workflow,
exploration, Git, MCP usage, context efficiency, and verification policy.

This file contains only project-specific architecture and domain contracts.

Preserve the existing architecture and established project decisions unless the
task explicitly requests a redesign.

---

## Better Auth

Better Auth is the canonical authentication and authorization system.

The canonical access-control definition is:

`auth/permissions.ts`

It is the single source of truth for:

- resources;
- actions;
- permissions;
- system roles;
- role hierarchy;
- role permission sets;
- Better Auth access-control configuration.

Do not introduce another RBAC implementation.

Use documented Better Auth public APIs for Better Auth-owned operations.

Do not:

- manually hash passwords;
- manually create credential account records when Better Auth provides an API;
- manipulate Better Auth user/account/session/verification records directly
  when a supported public API exists;
- create another role/permission storage model.

---

## System Roles

The canonical role hierarchy is:

`user < operator < admin < super-admin`

New role writes use exactly ONE canonical system role.

Valid canonical roles:

- `user`
- `operator`
- `admin`
- `super-admin`

Do not create new comma-separated multi-role combinations.

Legacy stored multi-role values may still exist and remain readable for
backward compatibility.

When reading legacy role values:

- parse only known roles;
- resolve the highest effective role using the canonical hierarchy;
- unknown values must never elevate privileges;
- do not automatically rewrite unrelated legacy records merely because they
  were read.

Examples:

`user,operator`
→ `operator`

`operator,admin`
→ `admin`

Role inheritance is implemented by the existing access-control composition.

Do not duplicate inherited lower-role permissions manually.

---

## User Management

Normal user-management flows may assign only:

- `user`
- `operator`
- `admin`

`super-admin` is a valid system role but must NOT be assignable through normal
user-management create/edit flows.

This restriction must remain server-enforced.

Existing Super Admin accounts remain valid.

When handling an existing Super Admin:

- preserve `super-admin`;
- do not silently downgrade it;
- do not expose normal promotion/role-changing behavior for it;
- unrelated edits must not overwrite its role.

Operator users may have one or more assigned Bidang.

User, Admin, and Super Admin do not require editable Operator-style Bidang
assignment controls.

Existing Operator assignment rows may remain when a user changes to another
role; they simply become authorization-irrelevant unless the canonical
implementation explicitly changes this behavior.

---

## Capability and Bidang Scope

Authorization has two separate dimensions:

1. capability;
2. scope.

Better Auth capability answers:

`WHAT may this user do?`

Bidang scope answers:

`WHERE may this user do it?`

For scoped operations, both must pass.

A Bidang assignment never grants a capability that the user's system role does
not already possess.

### Operator

Operator capabilities come from the canonical role hierarchy.

Operator business access is additionally restricted to assigned Bidang using
the existing database-backed scope implementation.

Do not encode Bidang into role names.

Do not create roles such as:

- `operator-harga`;
- `operator-produksi`;
- `operator-cadangan`;
- `operator-kerawanan`.

### Admin and Super Admin

Admin and Super Admin have global Bidang scope according to the existing
canonical authorization helpers.

They do not require per-Bidang assignment rows.

### Enforcement

Server authorization is authoritative.

For protected scoped operations:

1. authenticate;
2. check the required capability;
3. resolve authoritative ownership/Bidang state;
4. check applicable scope;
5. execute the operation.

For update/delete operations, prefer the target's Bidang from trusted database
state rather than a client-provided value.

For create operations, validate the proposed target Bidang server-side before
insertion.

Reuse the existing canonical permission and Bidang-scope helpers.

Do not duplicate authorization logic across route handlers.

---

## Bidang

Canonical Bidang master:

`auth_bidang`

Canonical user-to-Bidang assignment:

`auth_user_to_bidang`

Bidang IDs are stable machine/business identifiers.

Do not casually rename or regenerate an existing Bidang ID after referenced
data exists.

Human-readable Bidang names may change independently of IDs.

`auth_user_to_bidang` represents scope assignment.

It is NOT:

- another RBAC system;
- a role table;
- a permission table.

Do not add action flags such as:

- `canCreate`;
- `canUpdate`;
- `canDelete`;

to the assignment table.

Capabilities belong to Better Auth.

Scope belongs to Bidang assignment.

---

## Prisma

Canonical schema:

`prisma/schema.prisma`

Generated Prisma Client:

`server/generated/prisma/**`

Never manually edit generated Prisma Client files.

### Migrations

Preserve migration history.

Do not modify, delete, rewrite, repair, resolve, reset, or squash previously
applied migrations unless explicitly requested.

If a new schema change genuinely requires a migration, create a new migration
using the current project workflow.

Do not perform production migrations automatically.

Do not repair unrelated migration-state issues discovered during another task.

---

## Dataset Architecture

The canonical Dataset architecture is documented in:

`docs/architecture/dataset-schema-contract.md`

Read that contract before changing Dataset-related implementation.

Do not read it for unrelated tasks.

Core invariants:

- `datasets` 1:N `dataset_records`.
- Every Dataset has exactly one canonical owner through
  `datasets.ownerBidangId`.
- `datasets.ownerBidangId` represents ownership.
- `auth_bidang_dataset_permissions` represents Dataset authorization.
- `dataset_records` do not duplicate ownership.
- One Dataset Record represents:
  Dataset + Region + normalized Period.
- `dataset_records.data` must conform to `datasets.dataSchema`.
- `datasets.dataConfig` defines Dataset behavior.

V1 periodicity values:

- `HARIAN`
- `MINGGUAN`
- `BULANAN`
- `TRIWULANAN`
- `TAHUNAN`

V1 region levels:

- `KABUPATEN`
- `KECAMATAN`
- `DESA`

Dataset Record identity is:

`datasetId + regionId + periodDate`

Preserve:

`UNIQUE(datasetId, regionId, periodDate)`

Dynamic business values belong in JSON.

Identity, ownership, authorization, region, period, status, and audit metadata
remain relational.

Do not create a parallel Dataset architecture or separate business-master model
unless explicitly requested.

If a requested change conflicts with this contract, identify the conflict
instead of silently redesigning the model.

---

## Dashboard Architecture

The main dashboard is a full-width monitoring workspace.

Current direction:

- no permanent sidebar;
- compact enterprise-style information density;
- responsive CSS Grid;
- reusable dashboard widgets;
- widget spans based on content needs.

### Dashboard Widget

Use the existing reusable dashboard widget shell where applicable.

The shell must remain presentation-agnostic and capable of hosting:

- statistics;
- charts;
- tables;
- OSM/maps;
- rankings;
- alerts;
- other monitoring content.

Grid placement belongs to the dashboard composition layer.

Do not hardcode grid placement into the generic widget shell.

Preserve consistent data-source attribution such as:

`Sumber: ...`

at the widget level where applicable.

### Global Indicator Context

The primary dashboard context is controlled by the global Indicator selector.

Changing the active indicator may trigger one bounded server/API/database load
for that indicator.

Do not preload all indicator datasets by default.

### Widget-local Controls

Widget-local filters should normally transform the already loaded indicator
payload client-side.

They should not trigger API/database requests merely for display changes.

If required data is not present in the current payload:

- extend the intentionally bounded indicator payload when appropriate; or
- classify the control explicitly as request-level.

Preserve protection against stale asynchronous responses when indicators are
switched rapidly.

---

## UI

Nuxt UI is the primary UI component system.

Preserve the existing application visual direction and semantic theme usage.

Prefer:

- compact enterprise UI;
- clear hierarchy;
- efficient vertical space;
- existing reusable patterns.

Avoid:

- unnecessary nested cards;
- oversized whitespace;
- unrelated structural redesign;
- additional UI frameworks.

If the project already uses the Cobalt/Hallmark design direction, preserve that
visual foundation.

Hallmark is appropriate for substantial design/redesign work, not routine UI
polish.

---

## PWA and Web Push

The project uses:

`@vite-pwa/nuxt`

Preserve the existing PWA architecture unless the task explicitly changes it.

The project uses standard Web Push rather than Firebase-based notification
infrastructure.

Preserve:

- the existing custom service-worker strategy;
- VAPID-based Web Push;
- authenticated PushSubscription ownership;
- existing install-state behavior.

Do not introduce:

- Firebase;
- Redis;
- BullMQ;
- notification queues;
- separate workers;

unless explicitly requested.

VAPID private material must remain server-only.

When service-worker/PWA build behavior changes, production-build verification
may be appropriate according to the global verification policy.

---

## Audit Logs

`audit_logs` is application-level audit infrastructure.

Use it only for meaningful operations.

Do not store:

- passwords;
- authentication tokens;
- private keys;
- VAPID private keys;
- subscription secrets;
- other credential material;

inside audit metadata.

Prefer concise metadata representing the meaningful change rather than storing
entire request payloads.
