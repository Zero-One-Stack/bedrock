# Engineering Constitution — Next.js / React

A **binding contract** for every project built with this kit. This file stays short on
purpose: it holds only the hard bans and a routing table. **Depth lives in `rules/` and is
loaded on demand** — read the relevant rule file before working in that area.

> **Non-negotiable.** If a request conflicts with this constitution, do not silently comply.
> Name the conflict, cite the rule, and either refuse the violating part with a compliant
> alternative, or proceed only on an explicit written override — recorded in
> `rules/project-specifics.md`.

---

## Step 0 — Repo Reconnaissance (a hard gate, not a suggestion)

You can't be consistent with code you haven't read, and **every name in `rules/` and the
templates is illustrative until verified against the actual repo.** `@/services/…`,
`--color-border-strong`, `pnpm tokens:build`, `jest.fn()` are **examples, not facts about this
repo.** Before writing or editing any code you MUST produce a short **Recon block** stating
what you actually found by reading. No Recon block → do not generate code.

```
## Recon
- Package manager + scripts:   <pnpm|npm|yarn>; lint=<…> typecheck=<…> test=<…> token-build=<…>   (from package.json "scripts")
- Test runner:                 <jest|vitest>   (→ use vi.* iff vitest — see testing.md)
- Import aliases:              <e.g. @/* → src/*>   (from tsconfig.json compilerOptions.paths)
- Token vars available:        <how enumerated: tokens/ files or generated tokens.css>; sample: --color-…
- test-utils render path:      <e.g. @/test-utils>   (or "none found")
- cx / class-merge util:       <path to existing shared util>   (or "none found → may define one")
- Sibling to copy from:        <path to closest existing component/service>
- Constitution conflicts:      <repo facts that violate a hard ban>   (or "none")
```

How to fill it (read, don't guess):
0. **Read `rules/project-specifics.md` FIRST.** It's this project's living memory — if its Recon
   cache is already filled, use it instead of re-deriving; only re-check lines that look stale.
1. Read this file + the relevant `rules/*.md` (see the table below).
2. Read `package.json` `scripts` (never invent a script name), `tsconfig.json`
   `compilerOptions.paths` (never invent an alias), and **enumerate the real token variables**
   from `tokens/` or the generated `tokens.css` (never copy a token name from an example).
3. Open the closest sibling component/service and copy its patterns.
4. **Write what you learned back to `rules/project-specifics.md`** (Recon cache + any new
   feature/service + any architecture decision). This is how the kit "remembers" per project so
   the next task doesn't re-discover it.

**The repo's reality wins over a template** when they differ; if the repo violates the
constitution, **flag it — do not silently adapt.** A deviation is allowed only as a dated entry
in `project-specifics.md`'s *Approved overrides* (constitution-wins-unless-logged). Reuse before
creating (tokens, atoms, mocks, hooks, the class-merge util). Skipping Step 0, filling it with
guesses, or silently deviating from the constitution is itself a violation. Close the loop with
`/verify-build`.

---

## Hard bans (a reviewer fails the change on any of these)

- ❌ **Effector** or any external/global server-state store. (Server state = React Query; local = React primitives.)
- 🟦 **Styling engine is a project choice, not a kit ban.** This kit is **engine-agnostic on styling** (`styling-engine.md`): CSS Modules, Tailwind, Chakra v3, vanilla-extract, Panda CSS, etc. are all valid — pick one per repo and record it in `project-specifics.md`. What the kit DOES enforce is the *architecture* around styling (FSD placement, accessibility, responsive design, observability) and a **strong recommendation** to drive any chosen engine from a single token source for theming/dark-mode/RTL durability — see `styling-and-tokens.md` (now recommended, not mandated). The legacy ban on Tailwind/Chakra/CSS-in-JS is removed. **Carve-out (`component-composition.md`):** **behavior-only** headless libraries that ship no styles (Base UI, Radix Primitives, React Aria Components, Ariakit) remain the recommended layer for multi-part interactive components — pick one per repo and log it in `tech-radar.md` + `project-specifics.md`.
- ❌ **`any`**, and **`as` casts** without a runtime guard.
- ❌ **Pinned versions** in code/docs, or installing non-latest without a written reason.
- 🟦 **Design values** — if the repo opted into tokens (recommended), use them; otherwise the styling engine's idiomatic configuration is fine. The kit no longer bans literal `hex`/`px`/`rem` outright — that's the engine layer's job.
- 🟦 **Token references** — if the repo uses a token system, don't reference a token name you haven't verified exists; add missing tokens via `/add-design-token`. Example token names in these docs are illustrative.
- ❌ **Hardcoded user-facing strings** → i18next.
- 🟦 **Primitive vs semantic token usage** — if the repo runs a 3-tier token system, prefer semantic; if it doesn't, this doesn't apply.
- ❌ **Violating the FSD import rule** (`feature-sliced-design.md`): an **upward import** (a lower layer importing a higher one), a **same-layer slice import** (except an `@x` cross-import on `entities`), or a **deep import past a slice's `index.ts`** (public-API sidestep). And **barrels that `export *`**.
- ❌ **Misplaced FSD code:** business terminology in `shared`; a mutation or action button in an `entity`; a full-screen `feature`; layout styling or business logic in `app`/route files; segments named by essence (`components/hooks/utils/modals`); the deprecated `processes/` layer; a speculative "insignificant" slice used 0–1 times.
- ❌ **Server/client runtime leaks** (`services-and-data.md`, layered enforcement — see the enforcement matrix in `governance.md`): an entity `*.queries.ts` missing `import 'server-only';`; a feature `*.action.ts` missing `'use server';`; `'use client'` at the top of `app/**/page.tsx` or `src/pages/<route>/ui/*.tsx`; an `@x` segment or `@x/` import on `features/widgets/pages` (entities-only).
- ❌ **Editing another team's owned area without that team's review** (multi-team repos) — determine the owning team in Recon (`CODEOWNERS` / `scope:team-*`) and route the change through them. (`team-ownership.md`)
- ❌ **Circular dependencies** — transitive cycles (`A→B→C→A`) and barrel re-export loops (a folder importing its own `index.ts`). Import siblings by leaf path; detect with Steiger / `import/no-cycle` / `madge --circular` / Nx.
- ❌ **Testing implementation details** (internal state, private fns, class names).
- ❌ **Shipping a feature without BOTH test layers** — unit/integration **and** at least one E2E user-flow (Playwright). One layer is incomplete. (`testing.md`)
- ❌ **Inaccessible UI**: `<div onClick>` for actions, `outline:none` with no visible focus, meaning by color alone. Ship WCAG 2.2 AA.
- ❌ **Desktop-first / hardcoded pixel breakpoints**; touch targets under 44px. Mobile-first, breakpoints from tokens.
- ❌ **Raw `<img>`** (use `next/image`), third-party font `<link>` (use `next/font`), `'use client'` on a whole page when a leaf would do.
- ❌ **Security holes** (`security.md`): un-sanitized HTML injection, secrets in client/`NEXT_PUBLIC_*`, unscheme-checked `href`/`src`, `_blank` without `rel="noopener"`, tokens in `localStorage`, unvetted deps.

The "why" and the compliant patterns for each ban are in the rule files below.

---

## Rule routing table — read the file that matches your task

| If you are…                                          | Read first                          |
| ---------------------------------------------------- | ----------------------------------- |
| **Placing ANY file — which layer/slice/segment, what may import what** | **`rules/feature-sliced-design.md`** (the architecture) |
| **Placing a Next.js App Router file** (`error.tsx`, `loading.tsx`, `not-found.tsx`, `route.ts`, `middleware.ts`, `generateMetadata`, parallel/intercepting routes, `sitemap`/`robots`) | **`rules/nextjs-app-router-fsd.md`** |
| Planning a feature/app before building (Phase 1)     | `rules/architecture.md` (`/architect`) |
| Building/editing a component; its file contract      | `rules/component-structure.md`      |
| Composing a multi-part component (Tabs/Dialog/Menu); polymorphism (`asChild`); headless behavior library | `rules/component-composition.md` |
| Building a form; choosing/adding a form primitive (Field, Input, Combobox, …) | `rules/form-primitives.md` |
| Writing Storybook (CSF3, autodocs, play, a11y addon, visual regression, theme matrix) | `rules/storybook.md` |
| Adding an icon; choosing an icon library; icon a11y | `rules/icon-system.md` |
| Picking / swapping the styling engine                | `rules/styling-engine.md`           |
| Styling anything; adding a color/space/etc.          | `rules/styling-and-tokens.md` (recommended pattern, any engine) |
| Dark mode, multi-brand, forced-colors, RTL, SSR-flash | `rules/theming.md`                 |
| Anything users see/operate (a11y, WCAG 2.2 AA)       | `rules/accessibility.md`            |
| Layout across mobile/tablet/desktop                  | `rules/responsive-design.md`        |
| Page speed, images, fonts, bundle, Core Web Vitals   | `rules/performance.md`              |
| Fetching data (entity reads/feature writes), hooks, forms | `rules/services-and-data.md`   |
| Anything handling user input, auth, secrets, or deps | `rules/security.md`                 |
| Writing tests (unit + E2E)                           | `rules/testing.md` (`/scaffold-unit-test`, `/scaffold-e2e`) |
| Any user-facing copy, locales, RTL, pluralization    | `rules/i18n.md`                     |
| Error boundaries, error tracking, analytics, logging | `rules/observability.md`            |
| TypeScript, Next.js App Router, logging, docs tone   | `rules/typescript-and-quality.md`   |
| CI pipelines, pre-commit hooks, merge gates          | `rules/ci.md`                       |
| Releasing/deploying; flags, rollback; the server (Route Handlers/Server Actions) surface | `rules/release-and-deploy.md` |
| Structuring a monorepo / shell + FSD-slice libraries | `rules/monorepo-architecture.md`    |
| Evolving a shared package / API / zone contract across deploys | `rules/contracts-and-versioning.md` |
| The whole-system landscape: containers, data flow, team map | `rules/system-architecture.md`  |
| Who owns a feature/area; CODEOWNERS, cross-team review | `rules/team-ownership.md`          |
| Verifying a change compiles / tokens resolve / lints | run `/verify-build` (skill)         |
| Governance: locked tiers, waivers, audit, audit log  | `rules/governance.md`               |
| Recording an architecture decision (durable "why")   | `rules/adr.md` (`/adr`)             |
| Choosing a library/framework (org Adopt/Trial/Hold)  | `rules/tech-radar.md`               |
| Accessibility law, SOC 2 evidence, SBOM              | `rules/compliance.md`               |
| Project-specific facts or an approved override       | `rules/project-specifics.md`        |

Full index with one-line summaries: **`rules/README.md`**.

---

## Stack (always latest — never pin)

Next.js (App Router) · React · TypeScript strict · **Feature-Sliced Design** (root `app/` routing +
FSD layers under `src/`) · **styling engine of the project's choice** (CSS Modules, Tailwind,
Chakra v3, vanilla-extract, Panda CSS — recorded in `project-specifics.md`; tokens recommended,
see `styling-and-tokens.md`) · TanStack React Query · React Hook Form + Zod · i18next ·
Testing Library + MSW. Architecture enforced by **Steiger** + dependency-cruiser. Details and
rationale per area: the rule files above.

> **"Latest" means verify, not recall.** Your training has a cutoff; library APIs change after
> it (e.g. Zod, Next.js, RHF). Before using a library's API, check the **installed version**
> (`package.json` / lockfile) and confirm the current syntax via **Context7 or official docs** —
> do not write an API from memory and assume it still exists.
>
> **First look locally.** The kit ships curated, cross-checked snippets for its hard-adopt-list
> libraries in `.claude/docs/external-references/` (Next.js 15 hot spots, React Query v5, RHF
> Controller pattern, Zod v3/v4 differences, MSW 2.x, Storybook 9). Read those before
> WebFetching — they cover the patterns the rules use, with version notes, and they don't go
> stale between training cutoffs.

## Quality bar

TS strict / no `any` · coverage ≥ 80% (90%+ new code) · **unit + E2E both present** · accessible
by default · i18n everything · secure (no XSS/secrets, vetted deps) · tokens for every design
value · lint+typecheck+format clean before "done."

## Scaling this kit

New guidance = a new `rules/*.md` (+ one row above and one line in `rules/README.md`) — not
more text here. New capability = a new agent in `agents/` or skill in `skills/`. Keep this
file a router. See `rules/README.md` for the authoring convention.
