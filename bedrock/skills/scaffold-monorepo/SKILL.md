---
name: scaffold-monorepo
description: Set up or evolve a monorepo with a shell app composing independently-owned features, applying the kit's decision guide (modular monolith → Multi-Zones → Module Federation). Establishes the Nx workspace shape (shell + feature libs/apps + shared ui/tokens/data/util) and module-boundary tags, keeping shell and remotes decoupled. Use when the user says "set up the monorepo", "add a shell and feature apps", "how should these share code", or "split into micro-frontends". For deeper design trade-offs, hand off to the monorepo-architect agent.
---

# Scaffold Monorepo

Stand up (or grow) a shell + features monorepo per the kit. **Read
`.claude/rules/monorepo-architecture.md` first** and inspect the repo (Nx? existing apps/libs?
what constraint is actually present?).

## 1. Pick the tier (state the constraint)

- **Tier 1 — modular monolith (default):** no real deploy-independence/build constraint. One
  Next.js app + Nx libraries, boundaries by tags. Recommend this unless a constraint forces more.
- **Tier 2 — Multi-Zones:** independent deploys split cleanly by route/section. Shell rewrites/
  proxies to zone apps; `assetPrefix` isolation.
- **Tier 3 — Module Federation:** genuine runtime cross-app component sharing. ⚠️ Not on Next.js
  App Router (`nextjs-mf` EOL late 2026) — use a Vite/Webpack `@module-federation/enhanced`
  host+remotes setup. Only at real org/build scale.

If the user defaults to federation, surface the caveat and recommend the lower tier unless they
confirm the constraint.

## 2. Create the workspace shape (same at every tier)

```
apps/shell/                 # NEXT routing (root app/) + providers; no business logic
pages/<route>/  widgets/<block>/   # FSD pages + widgets layers (Nx libs)
features/<action>/          # FSD features layer (Nx libs): one action slice each — ui/ model/ api/
entities/<model>/           # FSD entities layer (Nx libs): one domain model each — ui/ model/ api/ [@x/]
shared/{ui,api,lib,config,tokens}/
tools/
```

Use Nx generators (`nx g host`, `nx g remote`, library generators) — don't hand-roll what
tooling provides. Keep slice internals identical to a lib so lib→app promotion is structural. The
layers, import direction, and public-API barrier are exactly `feature-sliced-design.md`'s, at
project scope.

## 3. Enforce boundaries

- Tag every project by FSD layer: `type:{app|pages|widgets|feature|entity|shared}` and
  `scope:{<slice>|shared}`.
- Configure `@nx/enforce-module-boundaries` (or `eslint-plugin-boundaries`) for the FSD direction
  `app → pages → widgets → feature → entity → shared`. For single-build repos, also run **Steiger**.
- **No same-layer slice imports** (`scope:a` ↛ `scope:b` within a layer; the one exception is an
  `@x` cross-import on `entities`); shell↔remotes decoupled.

## 4. Wire integration

- **T1:** features are libs the shell imports; `nx serve shell`.
- **T2:** shell `next.config` rewrites per zone path; each zone sets `assetPrefix`; cross-zone
  links use `<a>`, not `<Link>`.
- **T3:** host config + per-remote `expose ./Module`; React/Query/i18n as `singleton` shared deps.

## Done when

The workspace shape exists, boundary tags + enforcement are configured, dev/serve works, and the
chosen tier + its justifying constraint are recorded in `rules/project-specifics.md`. Report the
structure, tags, serve commands, and any caveat. For nuanced trade-offs, defer to the
**monorepo-architect** agent.
