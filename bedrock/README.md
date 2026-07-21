# Next.js / React Claude Kit

A portable, **scalable** engineering kit that makes every Next.js/React project follow the same
philosophy, structure, and conventions — **one unified kit** spanning the engineering constitution
*and* enterprise governance (managed-settings, hooks, ADRs, tech-radar, CI fitness functions,
policy-as-code). **Installable as a Claude Code plugin** (`/plugin install bedrock@zos` →
`/bedrock:kit-init` → `/bedrock:enterprise-init`) or by copying it into a repo.

> **Layout note.** This kit is packaged at the **plugin root** so `/plugin install` works: Claude
> Code auto-discovers `skills/ agents/ commands/ hooks/` from the plugin. But plugins **cannot
> auto-load `CLAUDE.md` or `rules/`** — those are memory files that must live in the project, so
> they sit here as **payload** that **`/bedrock:kit-init`** copies into the target's
> `./.claude/`. See **`INSTALL.md`** for all install paths.

Distilled from the file-per-concern structure proven in the `digital-health` monorepo, then
**modernized and researched against current (2025–2026) best practice**: always-latest versions,
**engine-agnostic on styling** (CSS Modules, Tailwind, Chakra v3, vanilla-extract, Panda CSS —
pick one per repo; 3-tier DTCG design tokens recommended for theming durability), **no Effector**
(architectural rule — server state goes through React Query), **Feature-Sliced Design** with
Steiger-enforced boundaries (atomic design kept as an optional `shared/ui` sub-convention), and
a **monorepo decision guide** (modular monolith → Multi-Zones → Module Federation).

## Design principle: thin index, modular depth

`CLAUDE.md` is intentionally ~1 page — hard bans + a routing table. **Depth lives in `rules/`
and loads on demand.** This is what lets the kit scale: new guidance is a new rule file (+ one
routing row), new capability is a new agent or skill — `CLAUDE.md` never bloats.

```
bedrock/                      # the plugin root
├── .claude-plugin/plugin.json     # plugin manifest (name → /bedrock:* namespace)
├── CLAUDE.md                      # PAYLOAD (kit-init copies → project) — thin constitution: hard bans + routing
├── rules/                         # PAYLOAD (kit-init copies → project's .claude/rules/) — UNIVERSAL
│   ├── README.md                  # rules + skills + agents index, two-tier model, authoring convention
│   ├── feature-sliced-design.md   # THE ARCHITECTURE: FSD layers/slices/segments, import rule, @x, public API, Next.js layout
│   ├── architecture.md            # Phase 1: decompose request → FSD layers → data → build order
│   ├── component-structure.md     # file-per-concern contract within FSD ui/ segment; shared/ui atomic sub-convention; no cycles
│   ├── styling-engine.md          # engine-agnostic — project picks one
│   ├── styling-and-tokens.md      # recommended pattern (any engine): 3-tier DTCG tokens
│   ├── accessibility.md           # WCAG 2.2 AA: semantics, keyboard, focus, contrast, targets, motion
│   ├── responsive-design.md       # mobile-first, breakpoint tokens, container queries, touch targets
│   ├── performance.md             # Core Web Vitals, next/image+next/font, RSC-first, bundle budgets
│   ├── services-and-data.md       # FSD data layer: entity reads (RSC) + feature writes (Server Actions); React Query + RHF/Zod (no Effector)
│   ├── security.md                # XSS/raw-HTML, secrets, href/src schemes, auth, dependency vetting
│   ├── testing.md                 # unit/integration (TL+MSW, 13 rules) AND E2E (Playwright) — both required
│   ├── i18n.md                    # react-i18next: semantic keys, plurals/Intl, RTL via logical CSS
│   ├── observability.md           # error boundaries, Sentry + PII scrubbing, field Web-Vitals, analytics
│   ├── typescript-and-quality.md  # strict TS, App Router, logging, docs tone
│   ├── ci.md                      # local + CI gate (typecheck/lint/cycles/unit/e2e/build); sample workflow
│   ├── monorepo-architecture.md   # FSD slices as Nx libs; modular monolith → Multi-Zones → Federation
│   ├── governance.md              # ENTERPRISE: locked-vs-delegated tiers, expiring waivers, audit
│   ├── adr.md                     # ENTERPRISE: Architecture Decision Records (durable "why" memory)
│   ├── tech-radar.md              # ENTERPRISE: org-level Adopt/Trial/Assess/Hold register
│   ├── compliance.md              # ENTERPRISE: WCAG 2.1 AA legal floor, SOC2 evidence, SBOM
│   └── project-specifics.md       # LOCAL — the project's living memory + approved overrides (never synced over)
├── agents/                        # AUTO-LOADED by the plugin
│   ├── frontend-architect.md      # Phase 1 planner: decomposes + routes work to the builders
│   ├── component-builder.md       # builds components to the full contract
│   ├── frontend-reviewer.md       # reviews diffs AND runs /verify-build → evidence-backed verdict
│   ├── monorepo-architect.md      # designs/evolves the monorepo via the decision guide
│   └── adr-author.md              # authors/supersedes ADRs; maintains the decision record
├── skills/                        # AUTO-LOADED — invoked as /bedrock:<name>
│   ├── kit-init/                  # copy CLAUDE.md + rules/ into the project (run first)
│   ├── enterprise-init/           # wire governance/CI/ADR/hooks into the project
│   ├── scaffold-component/  scaffold-service/  scaffold-monorepo/  add-design-token/
│   ├── verify-build/              # compiles · tokens resolve · no cycles · unit+E2E · lint
│   ├── migrate-to-kit/  sync-kit/
│   ├── adr/  adr-index/           # create/supersede ADRs; roll them into an index
│   ├── agents-md-export/          # mirror constitution → cross-tool AGENTS.md
│   └── memory-hygiene/            # reconcile project-specifics.md against the repo
├── commands/  architect.md · component.md · fe-review.md · monorepo.md   # AUTO-LOADED
├── hooks/                         # ENTERPRISE: hooks.json + scripts (block / audit / session-context)
├── managed-settings/              # ENTERPRISE: the LOCKED org tier (OS-deployed) + deploy guide
├── policy/                        # ENTERPRISE: Conftest/OPA dep policy + expiring waivers
├── ci/                            # ENTERPRISE: Steiger (FSD) + dependency-cruiser + eslint boundaries + fitness/ + GH Actions
├── docs/{adr,radar}/              # ENTERPRISE: ADR template + Tech Radar register
└── INSTALL.md                     # every install path (plugin · copy · managed-settings)
```

> When **copied** (not plugin-installed), put `CLAUDE.md` + `rules/` under the project's `.claude/`
> and `skills/agents/commands/hooks` likewise under `.claude/` — i.e. the project keeps the classic
> `.claude/` layout; only the *distribution* root is flattened for the plugin loader. The enterprise
> dirs (`ci/`, `policy/`, `docs/`, `managed-settings/`) go to the repo root via `enterprise-init`.

## The stack (always latest — never pin)

Next.js (App Router) · React · TypeScript strict · **Feature-Sliced Design** (root `app/` routing +
FSD layers under `src/`, enforced by Steiger) · **styling engine of the project's choice**
(CSS Modules, Tailwind, Chakra v3, vanilla-extract, Panda CSS — recorded in
`project-specifics.md`; 3-tier DTCG design tokens recommended) · TanStack React Query · React
Hook Form + Zod · i18next · Testing Library + MSW · local state via React primitives. Every UI
is **WCAG 2.2 AA accessible, mobile-first responsive, and Core-Web-Vitals-budgeted**.

**Hard bans:** Effector / Redux for server state, `any`, pinned versions, hardcoded user-facing
strings, **FSD violations** (upward imports, same-layer slice imports except `@x` on entities,
deep imports past a slice's public API,
business logic in `shared`, mutations in an entity), circular dependencies (incl. barrel loops),
testing implementation details.

**Grounded, not guessed:** every project starts with a **Step 0 Recon** gate — Claude must read
the repo's real scripts, aliases, token names, and test runner before generating, and close the
loop with `/verify-build`. Names in the rule docs are illustrative until confirmed.

## Architecture at a glance

The kit's frontend architecture is **Feature-Sliced Design** — a fixed, checkable answer to "where
does this file go, and what may it import?" (the question an AI agent otherwise answers consistently
wrong, forty files at a time):

```text
/app/                          ← Next.js routing ONLY — thin re-exports of @/pages/*, no logic
/src/
  app/        providers · 'use client' shell · global styles   (segments only — no slices)
  pages/      route screens (composition)        active-grievances/
  widgets/    self-contained screen blocks        grievance-dashboard/
  features/   state-changing actions (verbs)      file-grievance/  resolve-dispute/
  entities/   domain models (nouns): schema, types, read-only UI, queries   employee/  collective-agreement/
  shared/     business-agnostic UI kit, API client, libs        ui/ api/ lib/ config/
        ↑ imports flow strictly DOWNWARD; never upward, never same-layer (except @x on entities)
```

- **Feature-Sliced Design.** Six layers under `src/`, high → low: `app → pages → widgets →
  features → entities → shared`. Imports flow **strictly downward**; **no same-layer slice imports**
  (sole exception: `@x` cross-imports on `entities`); every slice exposes a **public API** (`index.ts`)
  outsiders import — never a deep path. Segments by purpose (`ui/ model/ api/ lib/ config/`).
  *Why it helps:* placement stops being a debate, refactors stay local (only `index.ts` is ever
  imported), and the agent can't deep-import, entangle two features, or put a mutation in an entity —
  each is build-breaking.
- **Next.js:** the Next router lives in the **repo-root `app/`** (thin `export { Page as default }
  from '@/pages/...'` re-exports); all FSD layers under `src/`. Server Components by default;
  `'use client'` on feature/widget leaves. Reads fetched high (entity queries in RSC) and passed
  down; mutations in feature Server Actions, then invalidate.
- **Atomic Design** is kept as an *optional sub-convention inside `shared/ui`* (atoms/molecules/
  organisms) — the gap FSD endorses it filling, not a set of layers.
- **Tokens:** primitive → semantic → component, DTCG-aligned, generated to CSS variables;
  components use semantic/component tokens only.
- **Monorepo:** FSD slices become **Nx libraries**; a **shell** composes them. Integration model is
  a deliberate choice — **modular monolith (default)** → **Multi-Zones** → **Module Federation**
  (which is *not* viable on Next.js App Router; `nextjs-mf` is EOL late 2026).
- **Enforced, not advisory:** **Steiger** (the official FSD linter) + dependency-cruiser +
  eslint-plugin-boundaries + a write-time hook make the architecture build-breaking.

## Use it in a new project

**Plugin (recommended):** `/plugin install bedrock@zos`, then in the project
`/bedrock:kit-init` (installs the constitution) and `/bedrock:enterprise-init` (wires
governance/CI/ADR/hooks). **Or copy** — assemble the project's `.claude/` from this plugin root:

```bash
KIT=/path/to/bedrock/bedrock     # your local checkout of this plugin's bedrock/ dir
mkdir -p /path/to/new-project/.claude
cp "$KIT/CLAUDE.md" /path/to/new-project/.claude/
cp -R "$KIT/rules" "$KIT/agents" "$KIT/commands" "$KIT/skills" "$KIT/hooks" /path/to/new-project/.claude/
```
Full instructions (existing repos, batch, managed-settings, enterprise pieces): **`INSTALL.md`**.

Then in Claude Code:
- `/architect` — plan a feature: decompose → FSD layers (pages/widgets/features/entities) → data → build order.
- `/component MyThing` — full file set in the right slice's `ui/` segment, semantic-token styling, public-API export.
- `/scaffold-service` — FSD data layer: entity reads (RSC) and/or feature writes (Server Actions), React Query + Zod.
- `/add-design-token` — add a token to the right tier, regenerate CSS vars.
- `/verify-build` — prove a change compiles, tokens resolve, FSD (Steiger) + boundaries pass, no new cycle, lint/test pass.
- `/fe-review` — constitution-compliance review before merge (runs `/verify-build`).
- `/adr` — record an architecture decision as durable, append-only memory.

## Enterprise governance (included, always-on)

The kit ships the governance layer in-box — apply it with `/bedrock:enterprise-init`:

- **Layered enforcement, not just docs:** deterministic `hooks/` block banned patterns at
  write time; **`tools/eslint-plugin-bedrock/`** (6 rules covering deep slice imports,
  cross-feature `@x`, primitive token use in components, missing `server-only` on entity
  queries, `'use client'` at a page top, event emitters outside `shared/lib/events`) plus
  **`ci/eslint.config.recommended.js`** (the ecosystem half — `jsx-a11y`,
  `typescript-eslint`, `import/no-cycle`, `@next/next`, no `export *`) backstops existing
  code; CI **fitness functions**
  (`ci/`: boundaries/cycles, token coverage, Web-Vitals + a11y budget, SBOM, ADR-reference
  gate) catch tree-wide violations regardless of source; `frontend-reviewer` reads the diff.
  See `rules/governance.md` § "The enforcement matrix" for what catches what and the
  documented hook bypasses.
- **Locked org tier:** `managed-settings/` deployed to the OS path → projects inherit, can't weaken.
- **Durable memory:** immutable, append-only **ADRs** (`docs/adr/`, `rules/adr.md`) + a `docs/radar/`
  **Tech Radar** above them. `project-specifics.md` holds mutable state; ADRs hold the "why".
- **Policy-as-code waivers:** `policy/` (Conftest/OPA) — banned/pinned deps fail CI; deviations are
  dated, **expiring** waivers (governance.md).
- **Compliance as evidence:** the audit log + ADRs + CI gates *are* the SOC 2 / WCAG-2.1-AA evidence.

**Two-tier model:** a small **locked floor** projects can't weaken · the **delegated constitution**
they tune via logged waivers · **project memory** unique to each repo. Same rules everywhere; each
project adapts through its memory file and dated, expiring overrides — never by editing the constitution.

## Customizing per project

Put project facts (brand palette, API URLs, app names, ports) and any explicitly approved
override in **`rules/project-specifics.md`** — never edit the rules themselves. Improvements
meant for *every* project go back into this source kit. Extend; don't dilute.

## Lineage & divergences

- **Structure from:** `digital-health` (the per-component file set, 13 testing rules; atomic design,
  now folded into `shared/ui`).
- **Researched divergences:** no version pins; tokens + CSS Modules instead of Chakra; no
  Effector; **Feature-Sliced Design** with Steiger + tag-enforced boundaries (atomic design kept as
  an optional `shared/ui` sub-convention); monorepo decision guide that defaults to a modular
  monolith and treats Module Federation as a last resort (and a dead end on Next.js App Router).
