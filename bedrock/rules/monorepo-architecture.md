# Rule: Monorepo & Multi-App Architecture

> **Non-negotiable: don't split before you must, and when you split, pick the lightest model
> that solves the actual constraint.** A shell app composing independently-owned features is
> the goal — but *how* they integrate is a deliberate choice, not "always Module Federation."

## Why this rule exists (state of the art, 2025–2026)

The reference app (`digital-health`) uses **Webpack Module Federation** with a Next.js shell +
remotes. That pattern works, but the ecosystem has moved:

- **`@module-federation/nextjs-mf` is Pages-Router only, "App Router not recommended," and
  support ends after late 2026.** For new **Next.js App Router** work, runtime MF is a dead end.
- Next.js now ships **Multi-Zones** as the native path for independent per-domain deploys.
- Current consensus: a **modular monolith (one app, Nx libraries, boundaries enforced by tags)**
  is the right answer for ~90% of teams. Split only when **org scale (50+ engineers)** or
  **CI/CD pain (long builds, blocked deploys)** forces it.

So this kit **defaults to the modular monolith** and graduates deliberately. Federation is
reserved for the narrow case that truly needs runtime, cross-app, component-level sharing —
and even then, not on Next.js App Router.

## Decision guide (use this before structuring anything)

```
Do separate teams need to DEPLOY independently / are builds a bottleneck?
│
├─ NO  → TIER 1: Modular monolith.
│        One Next.js app + Nx libraries (ui, feature-*, data-*, util-*).
│        Boundaries enforced by @nx/enforce-module-boundaries tags. One build, one deploy.
│        ✅ Default. Most projects stop here.
│
└─ YES → Do the parts share a URL/domain but split cleanly by ROUTE/section
         (e.g. /, /dashboard, /blog), each independently deployable?
         │
         ├─ YES → TIER 2: Next.js Multi-Zones.
         │        Shell app owns the root + routes via rewrites/proxy to zone apps.
         │        Each zone is a full Next.js app (its own deploy), assetPrefix-isolated.
         │        ✅ Native, App-Router-safe, simplest independent-deploy story.
         │
         └─ NO, we need RUNTIME component/module sharing across apps at the same route
                (not route-level split) → TIER 3: Module Federation.
                ⚠️ Not on Next.js App Router (nextjs-mf EOL late 2026).
                Use a Vite/Webpack + @module-federation/enhanced host+remotes setup
                (e.g. a non-Next React shell, or per-remote framework freedom), Nx host/remote
                generators, React/Query/i18n as shared singletons.
                Only justified at real org/build scale.
```

Record the chosen tier in `rules/project-specifics.md` with the constraint that forced it.

## The constant across all tiers: the workspace shape (FSD layers as Nx libraries)

Whatever the integration model, the **library structure and boundaries are the same** — and they
mirror the **FSD layers** from `feature-sliced-design.md`. A monorepo just turns FSD slices into Nx
libraries (and, at Tier 2/3, some into apps). The layering and import rule are *identical*; the
monorepo only adds project-level enforcement and independent build/deploy.

```
workspace/
├── apps/
│   ├── shell/                # NEXT ROUTING ONLY (root app/): thin re-exports of pages/*; providers. No business logic.
│   └── <feature-app>/        # TIER 2/3 only: independently deployable apps (zones/remotes), each its own FSD app+pages
├── pages/                    # FSD pages layer — Nx libs: one route screen each
├── widgets/                  # FSD widgets layer — Nx libs: one composed block each
├── features/                 # FSD features layer — Nx libs: one action slice each (ui/ model/ api/)
├── entities/                 # FSD entities layer — Nx libs: one domain model each (ui/ model/ api/ [@x/])
├── shared/ (or libs/shared)  # FSD shared layer — segments, not slices:
│   ├── ui/                   #   design system (atomic sub-convention optional)
│   ├── api/                  #   base fetch/query client (services-and-data.md)
│   ├── lib/                  #   framework-light helpers (incl. cx)
│   ├── config/               #   env + feature-flag plumbing
│   └── tokens/               #   design tokens (styling-and-tokens.md)
└── tools/                    # generators, scripts
```

- The **shell composes; it does not implement.** Business logic lives in `features/*` / `entities/*`
  / `widgets/*`; the shell (root `app/`) is Next routing + providers only.
- A slice is an **Nx library** (Tier 1) or an **app/remote** (Tier 2/3) — same internal FSD segment
  structure either way, so promoting a slice lib → app is a structural move, not a rewrite.

## Module boundaries (enforced, all tiers — these ARE the FSD import rule, at project scope)

Use Nx **tags** + `@nx/enforce-module-boundaries` (or `eslint-plugin-boundaries` without Nx). For
single-build repos, **Steiger** (`ci/steiger.config.ts`) enforces the same FSD rules on the folder
graph — run both.

- Tag by **type**, one tag per FSD layer: `type:app`, `type:pages`, `type:widgets`, `type:feature`,
  `type:entity`, `type:shared` (optionally `type:ui`/`type:tokens` to sub-gate `shared`); plus
  **scope** (`scope:checkout`, `scope:shared`).
- Allowed dependency direction = **the FSD layer direction**:
  ```
  app → pages → widgets → feature → entity → shared
  ```
- **A slice cannot import another slice on the same layer** (`scope:a` ↛ `scope:b` within a layer).
  Shared need → push it **down** to a lower layer (`shared/*` or an `entity`). A genuine
  entity-to-entity domain link → an `@x` cross-import (entities only), tagged and reviewed. Two
  features needed together → composed by the **page/widget** above them, never a direct import.
- **Shell ↔ remotes stay decoupled** (Tier 2/3): no build-time import from shell into a remote's
  internals or vice-versa; they meet only at the agreed contract (a zone URL, or a federated
  `./Module` export). Keeping them independent is the entire point of splitting.
- **No circular project dependencies.** `@nx/enforce-module-boundaries` already errors on
  project cycles (`A → B → C → A`); keep that on. Within a lib, also guard module-level cycles
  and barrel loops (see `component-structure.md` → `import/no-cycle` / `madge`). A genuine
  self-cycle (a lib importing its own alias) needs `allowCircularSelfDependency: true` — treat
  that as an explicit, documented exception in `rules/project-specifics.md`, not a default.

## Shared dependencies (Tier 2/3)

- Share **as little as possible** — only what must be a singleton: React/React-DOM, the data
  client (React Query), i18n, the router. Over-sharing causes version-mismatch failures because
  deploys aren't atomic.
- Pin singletons via the workspace, mark them `singleton: true` (MF) / shared package (zones).
- Each remote/zone owns its own non-shared deps.

## Local dev & deploy

- **Tier 1:** `nx serve shell`; `nx affected` for test/lint/build.
- **Tier 2 (zones):** run the shell + the zone(s) you're working on; shell rewrites route to
  `localhost` zones in dev, production domains in prod.
- **Tier 3 (MF):** serve the host (brings up the architecture); serve the remote you're editing
  with HMR. Remotes deploy on independent cadences; a failed remote deploy doesn't take down others.
- Prefer **affected** pipelines so only changed apps build/test/deploy.

## Hard rules

- ❌ Splitting into multiple apps without a real deploy-independence or build-time constraint.
- ❌ New **Next.js App Router** project on `@module-federation/nextjs-mf` (unsupported/EOL).
- ❌ Same-layer slice imports (cross-slice); build-time coupling between shell and remotes' internals.
- ❌ Business logic in the shell or in route files.
- ✅ Default to the modular monolith; graduate to Multi-Zones, then (rarely) Federation.
- ✅ Same FSD layer/slice structure at every tier (slices = Nx libs); boundaries enforced by tags + Steiger + lint.
- ✅ Share only true singletons across apps; record the chosen tier in `project-specifics.md`.

## Sources
- [Next.js — Multi-Zones guide](https://nextjs.org/docs/app/guides/multi-zones)
- [Module Federation — Next.js support ending / App Router not recommended](https://module-federation.io/practice/frameworks/next/)
- [Nx — Micro-Frontend Architecture concepts](https://nx.dev/docs/technologies/module-federation/concepts/micro-frontend-architecture)
- [Multi-Zone vs Micro-Frontends in Next.js — practical comparison](https://medium.com/@hariharakumar5196/multi-zone-vs-micro-frontends-in-next-js-a-practical-comparison-a880e3e94ca5)
