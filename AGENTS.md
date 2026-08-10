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

## Dataset Architecture

The canonical detailed Dataset Schema Contract is:

`docs/architecture/dataset-schema-contract.md`

Before modifying Dataset-related implementation, read and follow that document.

Core invariants:

- `datasets` 1:N `dataset_records`.
- Every Dataset has exactly one canonical owner through `datasets.ownerBidangId`.
- `datasets.ownerBidangId` is ownership; `auth_bidang_dataset_permissions` is authorization.
- `dataset_records` do not store ownership directly.
- One Dataset Record represents one Dataset + one Region + one normalized Period.
- `dataset_records.data` must conform to `datasets.dataSchema`.
- `datasets.dataConfig` defines Dataset behavior.
- V1 periodicity values are `HARIAN`, `MINGGUAN`, `BULANAN`, `TRIWULANAN`, and `TAHUNAN`.
- V1 region levels are `KABUPATEN`, `KECAMATAN`, and `DESA`.
- Dataset Record identity is `datasetId + regionId + periodDate`.
- Preserve `UNIQUE(datasetId, regionId, periodDate)`.
- Dynamic business values belong in JSON; identity, ownership, authorization, region, period, status, and audit metadata remain relational.
- Do not introduce another Dataset structure or business master model unless explicitly requested.

If a requested change conflicts with the canonical Dataset Schema Contract, do not silently invent a different architecture. Identify the conflict and only extend or version the contract when explicitly required.

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
