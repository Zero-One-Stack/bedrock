# Rules Index

`CLAUDE.md` is a thin router. The depth lives here, one file per concern, loaded on demand.

| Rule file                     | Covers | Read when |
| ----------------------------- | ------ | --------- |
| `feature-sliced-design.md`    | **THE ARCHITECTURE.** FSD layers (`app→pages→widgets→features→entities→shared`), the downward-only import rule, same-layer ban + the `@x` entities exception, slices/segments, the per-slice public API, the Next.js root-`app/`+`src/` layout, reads-down/writes-up, and the insignificant-slice trap. | **Placing ANY file; deciding what may import what.** |
| `nextjs-app-router-fsd.md`    | Every Next.js App Router primitive mapped to its FSD slice/segment: `error.tsx`/`loading.tsx`/`not-found.tsx`/`route.ts`/`middleware.ts`, `generateMetadata`/`generateStaticParams`, parallel routes (`@slot/`), intercepting routes (`(.)`), route groups, `sitemap`/`robots`/`manifest`/`opengraph-image`. Root `app/` files are thin re-exports only. | Placing or wiring any Next.js App Router file. |
| `architecture.md`             | Phase 1 planning: decompose request → FSD layers → data/state → component inventory → build order. Plan before scaffolding. | Starting any multi-component feature/app. |
| `component-structure.md`      | The file-per-concern component contract **within a slice's `ui/` segment**, the `shared/ui` atomic sub-convention, **no circular deps / barrel loops**, Storybook title convention. (Placement → `feature-sliced-design.md`.) | Building/placing/editing a component. |
| `component-composition.md`    | Multi-part component namespace exports (Tabs/Dialog/Menu); polymorphism via `asChild` + Slot (banning raw `as`); `*.behavior.ts` split when interaction logic ≥30 LOC; one approved headless behavior library per repo (Base UI / Radix / React Aria / Ariakit) wrapping behavior in token-styled atoms. | Composing a multi-part component; choosing/using the headless behavior layer. |
| `styling-engine.md`           | **The kit is engine-agnostic.** Project picks one engine (CSS Modules, Tailwind, Chakra v3, vanilla-extract, Panda CSS, …) and records the per-engine conventions in `project-specifics.md`. The legacy Tailwind/Chakra/CSS-in-JS ban is removed. | Picking or swapping the styling engine. |
| `styling-and-tokens.md`       | **Recommended pattern (any engine):** 3-tier (primitive→semantic→component) DTCG-aligned design tokens → mapped to the engine's token system (CSS vars, Tailwind theme, Chakra tokens). | Adding a design value (when the project uses tokens). |
| `accessibility.md`            | WCAG 2.2 AA: semantic HTML, keyboard, focus management, contrast, target size, reduced motion, forms; jsx-a11y + jest-axe + addon-a11y. | Any UI a user sees or operates. |
| `responsive-design.md`        | Mobile-first; breakpoint tokens; container queries; `clamp()` fluid type; touch targets; viewport testing. | Any layout across screen sizes. |
| `performance.md`              | Core Web Vitals (LCP/INP/CLS); RSC-first; `next/image`/`next/font`; code-split; bundle budgets; field measurement. | Page speed, images, fonts, bundle. |
| `services-and-data.md`        | FSD data layer: entity `api/` reads (RSC queries) + feature `api/` writes (Server Actions); Zod-validated, React Query, RHF+Zod forms. Reads down, writes up. No Effector. | Fetching data, hooks, forms. |
| `security.md`                 | Client-side security: XSS/raw-HTML, secrets, `href`/`src` schemes, auth/session, dependency vetting. | Handling user input, auth, secrets, or adding a dep. |
| `testing.md`                  | Unit/integration (Testing Library + MSW, 13 rules) **and E2E (Playwright)** — both mandatory per build. | Writing tests. |
| `i18n.md`                     | react-i18next: semantic namespaced keys, interpolation/plurals/`Intl`, RTL via logical CSS, `lang`/`dir`. | Any user-facing copy, locales, RTL. |
| `observability.md`            | Error boundaries (`error.tsx`), error tracking (Sentry) with PII scrubbing, field Web-Vitals, PII-free analytics. | Error handling, monitoring, analytics. |
| `typescript-and-quality.md`   | Strict TS, Next.js App Router specifics, logging, docs tone. | Cross-cutting quality. |
| `ci.md`                       | The local + CI gate (typecheck/lint/cycles/unit/e2e/build); pre-commit hooks; merge gate; sample workflow. | Wiring CI/CD or git hooks. |
| `release-and-deploy.md` ⛨    | **Enterprise.** Promotion path, build-once-promote, feature flags, canary + rollback; **plus the server surface** (Route Handlers/Server Actions/BFF — thin, validated, authenticated). | Releasing/deploying; writing server-side code. |
| `monorepo-architecture.md`    | Decision guide for scaling to multiple apps: modular monolith → Multi-Zones → Module Federation; FSD slices as Nx libraries; module boundaries (Nx tags = FSD layers). | Structuring a monorepo / shell + FSD slices. |
| `contracts-and-versioning.md` ⛨ | **Enterprise.** Evolving shared edges (packages/APIs/zones/remotes) across non-atomic deploys: semver, Zod/OpenAPI contracts, expand→migrate→contract for breaking changes. | A shared package/API/zone contract must change. |
| `system-architecture.md` ⛨   | **Enterprise.** The living landscape view (C4-aligned: context → containers → components → data/contract flow → team map). Synthesis above ADRs/radar; built into `docs/architecture/`. | A system goes multi-team or multi-deploy; any container/boundary change. |
| `team-ownership.md` ⛨        | **Enterprise.** Who owns what: `CODEOWNERS` + `scope:team-*` tags + required cross-team review (the `CLAUDE.md` hard ban). Module boundaries ≠ team boundaries. | A repo has multiple teams; any cross-team-owned edit. |
| `governance.md` ⛨            | **Enterprise.** Locked-vs-delegated tiers, time-boxed policy-as-code waivers, audit-as-SOC2-evidence, model/data policy. | Deviating from a rule; setting up the org floor. |
| `adr.md` ⛨                   | **Enterprise.** Architecture Decision Records — immutable, append-only "why" memory (MADR); supersede, never edit. | Recording a material architecture decision. |
| `tech-radar.md` ⛨            | **Enterprise.** Org-level Adopt/Trial/Assess/Hold register above per-project ADRs. | Choosing a library/framework. |
| `compliance.md` ⛨            | **Enterprise.** WCAG 2.1 AA legal floor (EAA/ADA/AODA), SOC 2 evidence, CycloneDX SBOM, data protection. | Client/regulated work; accessibility/supply-chain. |
| `project-specifics.md`        | **The project's living memory** — Recon cache, existing features/services, architecture decisions, approved overrides. Agents read it first and write to it. | First thing every task; whenever a fact/decision/override is recorded. |

⛨ = enterprise-governance rule (applied via `/enterprise-init`; always shipped in the kit).

## Skills (repeatable actions)

| Skill                 | Does | Use when |
| --------------------- | ---- | -------- |
| `scaffold-component`  | Generates the full file-per-concern component set in the right FSD slice's `ui/` segment. | "scaffold/add a component". |
| `scaffold-service`    | Generates the FSD data layer — entity `api/` reads (queries) and/or feature `api/` writes (Server Actions), Zod + React Query. | "add a service / wire up an API". |
| `add-design-token`    | Adds a token to the 3-tier source and regenerates the CSS vars. | A needed design value has no token. |
| `scaffold-unit-test`  | Writes/backfills a unit/integration test for an **existing** component or hook (Testing Library + MSW, the 13 rules). | "write/add tests for X"; a component/hook has no test. |
| `scaffold-e2e`        | Stands up the Playwright harness (one-time) and a per-feature journey spec (happy + failure + auth redirect). | "add E2E"; "test this flow"; a feature ships with no E2E. |
| `scaffold-monorepo`   | Stands up / grows a shell + features workspace with enforced boundaries. | "set up the monorepo". |
| `verify-build`        | Proves a change compiles, tokens resolve, **no new cycle**, unit + E2E pass — via the repo's real scripts. | Before declaring any change "done". |
| `migrate-to-kit`      | Brings an existing repo (e.g. Chakra/Effector-based) onto the kit standard incrementally. | Adopting the kit in a non-greenfield project. |
| `sync-kit`            | Updates a project's universal rules/agents/skills from the vault master **without** touching its `project-specifics.md`. | The constitution improved and a project should adopt it. |
| `kit-init`            | Copies `CLAUDE.md` + `rules/` into the project (plugins can't auto-load those). | Right after `/plugin install`. |
| `enterprise-init` ⛨  | Wires the governance pieces into the project: hooks, CI fitness functions, ADR + radar scaffolding, policy. | Once per project, after `kit-init`. |
| `adr` ⛨              | Create or supersede an Architecture Decision Record (MADR). | A trigger-level decision is made (`adr.md`). |
| `adr-index` ⛨        | Rolls all ADRs into a navigable `docs/adr/README.md`. | After creating/superseding an ADR. |
| `agents-md-export` ⛨ | Mirrors the constitution to a cross-tool `AGENTS.md`. | Project worked on with multiple AI tools. |
| `memory-hygiene` ⛨   | Reconciles `project-specifics.md` against the repo (stale cache, drifted features, expired waivers). | Periodically / after a big refactor. |

## Agents (multi-step roles)

| Agent                 | Does | Invoke for |
| --------------------- | ---- | ---------- |
| `frontend-architect`  | Phase 1: decomposes a request into routes/features/data/components and a build order; routes units to the builders. | "build/plan the X feature/page" (`/architect`). |
| `component-builder`   | Builds one component to the full contract; wires data/forms; respects boundaries + no cycles. | "build/add/refactor a component". |
| `frontend-reviewer`   | Reviews a diff against the constitution **and runs `/verify-build`**; returns severity-grouped findings + an evidence-backed verdict. | Before merge (`/fe-review`). |
| `monorepo-architect`  | Multi-app sharing: modular monolith → zones → federation; Nx boundaries. | "set up the monorepo" (`/monorepo`). |
| `adr-author` ⛨       | Authors/supersedes ADRs and keeps the decision record consistent; audits a diff for undocumented decisions. | Recording/maintaining decisions (`adr.md`). |

## The tiered model (why this is portable to every project)

- **Tier 0 — locked org floor** (enterprise): `managed-settings/` (OS-deployed) + `hooks/` + the CI
  fitness functions in `ci/`/`policy/`. Projects **inherit, can't weaken**.
- **Tier 1 — universal constitution** — `CLAUDE.md`, every `rules/*.md` except `project-specifics.md`,
  the agents, skills, and commands. **Identical in every project.** Maintained once in the vault
  master; projects adopt updates via `/sync-kit` or `/plugin update`. Deviate only via a logged,
  expiring waiver (`governance.md`).
- **Tier 2 — project memory** — `rules/project-specifics.md` (mutable state) + `docs/adr/`
  (immutable "why"). **Unique per project**, written by agents, read first on every task. Preserved
  across syncs.

Same rules everywhere; each project adapts through its memory file and dated, expiring overrides —
never by editing the constitution.

## Authoring convention (so the kit scales)

A rule file is:
1. A one-line **non-negotiable** banner stating what it governs.
2. A short **why** (link primary sources).
3. The **rule** with copy-pasteable templates.
4. **Hard rules** (the ❌/✅ list a reviewer checks).
5. A **checklist** where useful, and a **Sources** list.

Keep each rule self-contained and skimmable. When you add a rule:
- Create `rules/<name>.md`.
- Add a row to the table above **and** a row to the routing table in `CLAUDE.md`.
- If it introduces a repeatable action, add a matching skill (`skills/`) or agent (`agents/`).

Do not grow `CLAUDE.md` — grow this folder.
