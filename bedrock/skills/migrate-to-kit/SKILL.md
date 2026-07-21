---
name: migrate-to-kit
description: Bring an existing (non-greenfield) React/Next.js repo onto this kit's standard incrementally — ad-hoc folders → Feature-Sliced Design layers/slices, Effector/Redux server-state → React Query, loose files → the file-per-concern contract, scattered design values → a single token source, missing tests → unit + E2E. The kit is engine-agnostic on styling, so this does NOT migrate you off Tailwind, Chakra, or CSS-in-JS — it records your engine in project-specifics.md and fixes the architecture around it. Produces a phased plan and executes it slice by slice, never a big-bang rewrite. Use when adopting the kit in a repo that already has code, or when a review finds the repo systematically violates the constitution.
---

# Migrate to Kit

Adopt the kit in a repo that already exists. Greenfield projects just `cp -R` the `.claude/` and
go; **this skill is for the messy real case** — a repo on Chakra, Effector, or no conventions —
where the constitution and the repo's reality conflict. The goal is **convergence without a
big-bang rewrite**: each slice moves toward the standard, stays shippable, and the gap shrinks.

## 1. Install the kit + take inventory (Recon, repo-wide)

1. Copy the kit's `.claude/` into the repo (if absent). Leave `project-specifics.md` as the template.
2. Run a **gap inventory** — where does the repo violate the constitution, and how much?
   - Styling: `@chakra-ui`, `styled-components`, `emotion` runtime, Tailwind, inline hex/px.
   - State: `effector`, `redux` for server state, `fetch` in components.
   - Structure (FSD): non-FSD layout — flat folders, essence-named segments (`components/`,
     `hooks/`, `utils/`), deep imports past a slice's `index.ts`, missing per-slice `index.ts`,
     upward or same-layer-slice imports; components not following the file-per-concern contract;
     circular deps (`madge --circular`); run **Steiger** to surface FSD violations.
   - Tokens: is there a token source at all, or hardcoded values?
   - Tests: unit coverage? any E2E? what runner?
   - Recon facts (scripts, aliases, runner) → write them to `project-specifics.md` now.
3. Write the inventory to `project-specifics.md` (a "Migration status" note) so progress is tracked.

## 2. Decide the order (lowest-risk, highest-leverage first)

Typical sequence — adapt to the repo:

1. **Foundations, no behavior change:** add the token source + generated CSS vars
   (`/add-design-token` to seed it from existing values); add the shared `cx` in `shared/lib/`; set
   up `test-utils`; install the test runner + Playwright if missing.
2. **Tokenize styling in place:** replace hardcoded values with `var(--…)` (no framework swap yet).
3. **Swap the styling engine, component by component:** Chakra/styled → CSS Modules + tokens,
   one component per change, following `component-structure.md`. Don't convert the whole app at once.
4. **Move server state to React Query:** replace Effector/Redux data + in-component `fetch` with
   entity `api/` reads (server-only `<model>.queries.ts` for RSC + client `<model>.hooks.ts` for
   React Query) and feature `api/` writes (Server Actions) (`/scaffold-service`), one domain at a time.
5. **Restructure into FSD layers & boundaries:** move code into `pages`/`widgets`/`features`/
   `entities`/`shared` slices with purpose-named segments (`ui/ model/ api/ lib/ config/`), add a
   per-slice public-API `index.ts`, and kill upward imports, same-layer-slice imports, deep imports
   past `index.ts`, and cycles. Follow FSD's official **"migrate incrementally, divide by pages
   first"** approach — slice the routes into `pages`, then pull shared blocks down into
   `widgets`/`features`/`entities` as reuse appears; don't big-bang. Run **Steiger** to verify each slice.
6. **Backfill tests:** unit/integration to coverage, then **E2E** for each critical flow.

Each step is its own PR-sized slice, `/verify-build`-green, `frontend-reviewer`-checked.

## 3. Handle the conflict honestly (constitution-wins-unless-logged)

- The end state has **no** Chakra/Effector/etc. — those are hard bans, not negotiables.
- **While migrating**, the repo will temporarily violate the constitution. That's expected, but
  make it **explicit and bounded**: log each still-violating area in `project-specifics.md` →
  *Approved overrides* as a **time-boxed migration exception** ("Chakra still in `features/legacy/*`,
  removing by <milestone>") so the reviewer doesn't re-flag it and the debt stays visible.
- A *permanent* exception (the repo genuinely must keep something banned) is a deliberate, dated,
  reasoned override entry — not a silent adaptation.

## 4. Don't

- ❌ Big-bang rewrite the whole app in one change. Migrate by slice; keep it shippable.
- ❌ Mix two styling engines or two state models inside one component.
- ❌ Convert without tests — add/keep tests so each slice is provably behavior-preserving.
- ❌ Edit the universal rule files to match the legacy repo. Adaptation lives in
  `project-specifics.md`, never in the constitution (that's what keeps the kit portable).

## Done when

The repo passes `frontend-reviewer` with no Blockers (or only logged, time-boxed migration
exceptions), `/verify-build` is green, and `project-specifics.md` reflects the current migration
status. Report what converted, what remains, and the next slice.
