# Bedrock — Next.js / React engineering standards for Claude Code

> A **Claude Code plugin** that ships enforced **Next.js** + **React** engineering standards: a **Feature-Sliced Design (FSD)** architecture (layers · slices · segments · the `@x` public-API rule, enforced by **Steiger**) on an **Nx monorepo** (modular monolith → **Multi-Zones** → **Module Federation micro-frontends**), **design tokens** + atomic design inside `shared/ui`, **React Query** data patterns, **accessibility** (a11y), **TypeScript** quality gates, and an **enterprise governance** layer — **ADRs**, a **tech radar**, **CI fitness functions**, **policy-as-code** (OPA/Rego), and **managed settings**.

Portable, **enforced** engineering standards for [Claude Code](https://claude.com/claude-code),
distributed as a plugin. One constitution — hard bans, rules, agents, scaffolding skills, and an
enterprise governance layer — applied the same way to every Next.js / React project, with
per-project memory.

This repo is a **Claude Code plugin marketplace** (named `zos`). It ships **one plugin, `bedrock`**:
the universal constitution *and* the enterprise governance layer (managed-settings, enforcement
hooks, ADRs, tech-radar, CI fitness functions, policy-as-code), merged into a single plugin.

> Earlier drafts split this into a base kit plus a separate `nextjs-react-enterprise` overlay. They
> are now one plugin — the governance pieces are an optional second init step (`enterprise-init`),
> not a separate install.

## The architecture: Feature-Sliced Design

Every frontend codebase answers one question thousands of times — **where does this file go, and
what may it import?** Bedrock's answer is [Feature-Sliced Design](https://feature-sliced.design/)
(FSD): a fixed, *mechanically checkable* layering, so that question stops being a debate (and stops
being answered *consistently wrong* by an AI agent placing forty files at machine speed).

Six layers under `src/`, most app-specific → most generic. Next.js routing stays in the repo-root
`app/` as thin re-exports, so FSD's `app`/`pages` layers don't collide with the App Router:

```text
/app/                          ← Next.js routing ONLY (thin re-exports, no logic)
  active-grievances/page.tsx   → export { ActiveGrievancesPage as default } from '@/pages/active-grievances'
/src/
  app/        # providers, the 'use client' shell, global styles        (no slices — segments only)
  pages/      # route screens — composition only                        active-grievances/
  widgets/    # self-contained blocks of a screen                       grievance-dashboard/
  features/   # user actions that change state (verbs)                  file-grievance/  resolve-dispute/
  entities/   # domain models: schema, types, read-only UI (nouns)      employee/  collective-agreement/
  shared/     # business-agnostic UI kit, API client, libs              ui/ api/ lib/ config/
```

**The one rule that does the work:** a module may import only from layers **strictly below** it —
never upward, never from another slice on the **same** layer. Each slice is reached only through its
**public API** (`index.ts`), so a slice's internals can be rewritten without breaking anything
outside it.

```ts
// ❌ deep import past the public API           ✅ import the slice's public API
import { EmployeeCard }                          import { EmployeeCard } from '@/entities/employee';
  from '@/entities/employee/ui/EmployeeCard';
```

The single sanctioned same-layer exception is the **`@x` cross-import** (entities only) for a genuine
domain relationship (a `collective-agreement` that references its `employee`). **Reads flow down**
(entity queries fetched high in pages/widgets via RSC, passed down as props); **mutations flow up** (a
feature's Server Action fires, then revalidates). Atomic design is kept as an *optional* grouping
inside `shared/ui`. Full rules: [`bedrock/rules/feature-sliced-design.md`](bedrock/rules/feature-sliced-design.md).

**How this helps you:** "where does this go?" stops being a review debate; the agent can't quietly
deep-import, entangle two features, or smuggle a mutation into an entity (each is **build-breaking**,
caught by Steiger/dependency-cruiser or blocked by a hook); and refactors stay local because every
slice is reached only through its `index.ts`.

## What's inside

A quick map of what this kit standardizes, so you can tell at a glance whether it fits your stack:

### Frontend architecture — Feature-Sliced Design, Nx monorepo & micro-frontends

- **Feature-Sliced Design (FSD)** as the core architecture: six layers (`app → pages → widgets →
  features → entities → shared`) under `src/`, downward-only imports, no same-layer slice imports
  (the `@x` exception on entities), per-slice public APIs, segments by purpose. Next.js routing
  stays in the repo-root `app/` as thin re-exports of the FSD `pages` layer. Enforced by **Steiger**
  (the official FSD linter) + dependency-cruiser + eslint-plugin-boundaries.
- **Nx monorepo** workspace shape: FSD slices become Nx libraries, a shell app composing them, with
  `shared/{ui,api,lib,config,tokens}` libraries and **module-boundary tags** (one per FSD layer)
  enforced by `@nx/enforce-module-boundaries`.
- A deliberate **monorepo decision guide**: **modular monolith** (the default for ~90% of teams) →
  **Next.js Multi-Zones** (independent per-route deploys) → **Module Federation micro-frontends**
  (`@module-federation/enhanced`) only at real org/build scale. App-Router-safe by default.
- `scaffold-monorepo` skill + `monorepo-architect` agent to set up or evolve the workspace.

### Components, design tokens & styling

- **FSD slice/segment** component placement (with atomic design as an optional `shared/ui`
  sub-convention), **design tokens** as the single source of styling truth, and an
  `add-design-token` skill.
- `scaffold-component` skill + `component-builder` agent for consistent, accessible React
  components.

### Quality, testing & data

- **TypeScript** strictness and quality rules, **accessibility (a11y)** rules, **responsive design**,
  **internationalization (i18n)**, **performance** budgets, and **observability** conventions.
- **React Query** data-fetching patterns; service/data-layer and API **contract & versioning** rules.
- `scaffold-unit-test` and `scaffold-e2e` skills for test scaffolding; `verify-build` for green-build
  checks.

### Enterprise governance & policy-as-code

- A locked **org floor** via **managed settings** plus enforcement **hooks** that block banned
  patterns.
- **CI fitness functions** (GitHub Actions) that make the standards build-breaking.
- **Architecture Decision Records (ADRs)** — immutable, append-only decision memory — with `adr`,
  `adr-index`, and `adr-author` tooling.
- A **tech radar**, **compliance** rules, **team-ownership** + **release-and-deploy** conventions,
  and **policy-as-code** with **OPA / Rego** (`package-policy.rego`) plus logged, expiring waivers.

### Agents, skills & slash commands

- **Agents:** `frontend-architect`, `component-builder`, `frontend-reviewer`, `monorepo-architect`,
  `adr-author`.
- **Slash commands:** `/architect`, `/component`, `/fe-review`, `/monorepo`.
- **Skills:** `kit-init`, `enterprise-init`, `sync-kit`, `migrate-to-kit`, `memory-hygiene`,
  `agents-md-export`, and the scaffolding skills above.

## Install into Claude Code

Run these in any Claude Code session.

```text
# 1. Add this marketplace (point at the git remote, or a local clone path)
/plugin marketplace add https://github.com/Zero-One-Stack/bedrock

# 2. Install the plugin (one time, per machine)
/plugin install bedrock@zos

# 3. In each project, copy the constitution into the repo
/bedrock:kit-init                  # copies CLAUDE.md + rules/ into ./.claude/

# 4. For client / enterprise projects, also wire the governance layer
/bedrock:enterprise-init           # hooks, CI fitness functions, ADR + tech-radar scaffolding, policy
```

**Why step 3 is required.** A plugin auto-loads **skills, agents, commands, and hooks**
(namespaced `/bedrock:*`) the moment it's installed — but Claude Code plugins **cannot auto-load
`CLAUDE.md` or `rules/`**; those must physically live in the project. `/bedrock:kit-init` copies
them in and is idempotent (re-running refreshes the universal rules while preserving the project's
own `rules/project-specifics.md`).

> **Prefer a local clone?** `/plugin marketplace add` also accepts a filesystem path — clone the
> repo and run `/plugin marketplace add ./bedrock` (or the path to your clone).

### Verify it worked

In a target project, start Claude Code and check:

1. `/bedrock:kit-init`, `/bedrock:enterprise-init`, `/architect`, `/component`, `/adr` are
   available → skills/commands loaded.
2. `.claude/CLAUDE.md` + `.claude/rules/` exist → constitution copied in.
3. Ask Claude to "read the constitution" — it should cite `CLAUDE.md` and the routing table.

### Other install methods

The plugin marketplace path above is the recommended one. For **copying the kit into a repo**
(version-controlled, updated with `/sync-kit`) or deploying the **org-wide locked floor** via
managed settings/MDM, see the full guide:

→ **[`bedrock/INSTALL.md`](bedrock/INSTALL.md)**

## Keeping projects up to date

- **Plugin installs:** `/plugin update bedrock@zos`, then `/bedrock:kit-init` to refresh the copied
  `CLAUDE.md` + `rules/`.
- **Copied installs:** run `/sync-kit` in the project — it pulls changed universal files and **never
  touches `project-specifics.md`** or your `docs/adr/`.
- **Improving the standard:** edit the master here, bump the plugin `version`, and projects adopt via
  update/sync — never by forking the constitution.

## Layout

```
bedrock/                              # repo root (the 'zos' marketplace)
├── .claude-plugin/marketplace.json   # the marketplace catalog (the 'zos' marketplace → bedrock)
├── bedrock/                          # the plugin (plugin root)
│   ├── .claude-plugin/plugin.json    # plugin manifest (name → /bedrock:* namespace)
│   ├── CLAUDE.md  rules/             # payload — copied into projects by /bedrock:kit-init
│   ├── skills/  agents/  commands/  hooks/   # auto-loaded by the plugin
│   ├── managed-settings/  ci/  policy/  docs/adr/   # governance floor + CI fitness functions
│   └── INSTALL.md                    # all install paths (plugin / copy / managed-settings)
├── KIT-PATTERN.md                    # the reusable blueprint for spinning up a new kit
└── ROADMAP.md                        # shipped + forward phases
```

## The model

- **Two tiers.** A small **locked org floor** (managed-settings + hooks + CI gates) projects can't
  weaken, a **delegated constitution** (the rules) they tune via logged, expiring waivers, and
  **project memory** (`rules/project-specifics.md` + `docs/adr/`) unique to each repo.
- **Enforcement, not just docs.** Hooks block banned patterns; CI fitness functions make the
  standards build-breaking; ADRs are immutable, append-only decision memory.
- **One source of truth.** Improve the standard here, bump the plugin `version`, projects adopt via
  `/plugin update` or `/sync-kit` — never by forking the constitution.

See **[`ROADMAP.md`](ROADMAP.md)** for what's shipped and what's next.

---

**Keywords:** Claude Code · Claude Code plugin · Next.js · React · Feature-Sliced Design · FSD ·
Steiger · slices · segments · Nx · monorepo · micro-frontends · Module Federation · Multi-Zones ·
modular monolith · design tokens · atomic design · React Query · TypeScript · accessibility (a11y) ·
i18n · engineering standards · governance · ADR · tech radar · CI fitness functions · policy-as-code ·
OPA · Rego · managed settings · agents · subagents · skills · slash commands.

*Maintained by Zero One Stack. Licensed under [MIT](LICENSE).*
