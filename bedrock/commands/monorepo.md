---
description: Design or evolve a shell + features monorepo using the kit's decision guide (modular monolith → Multi-Zones → Module Federation) with enforced module boundaries.
---

Set up or evolve the monorepo for **$ARGUMENTS** (or the current repo).

Launch the **monorepo-architect** agent. It should read `.claude/rules/monorepo-architecture.md`,
inspect the repo and the *actual* constraint (independent deploys? build time? team boundaries?),
then:

- Pick the lightest tier that fits: **Tier 1 modular monolith (default)** → **Tier 2 Multi-Zones**
  → **Tier 3 Module Federation** (warning: not on Next.js App Router; `nextjs-mf` is EOL late 2026).
- Establish the workspace shape (`apps/shell` + `features/*` + `shared/{ui,api,lib,config,tokens}`),
  with each Nx lib mapping to an FSD slice/layer — the shell composing and feature slices owning logic.
- Enforce module boundaries via Nx tags (`type:*`/`scope:*`) aligned to FSD layers +
  `@nx/enforce-module-boundaries`; no same-layer slice imports; shell↔remotes decoupled.
- Record the chosen tier and its justifying constraint in `rules/project-specifics.md`.

If the request defaults to federation, surface the trade-offs and recommend the lower tier
unless the constraint is confirmed.
