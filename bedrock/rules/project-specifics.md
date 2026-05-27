# Project Specifics — this project's living memory

> **This file is the per-project brain.** The other rule files are the **universal constitution**
> (identical in every project); *this* file is where one project's reality and decisions are
> recorded so they don't have to be re-discovered or re-explained. Agents **read this first** on
> every task and **write to it** as they learn the repo and make decisions. It is the **only**
> sanctioned place to deviate from the constitution.
>
> **Conflict policy:** the constitution wins by default. A project may override a rule **only** via
> an explicit, dated, reasoned entry in *Approved overrides* below — agents then honor that entry.
> No entry = the rule still holds. (E.g. a legacy Chakra repo or one that truly needs Effector is
> a logged exception, not a silent adaptation.)

---

## Recon cache (agents fill this from the repo — read, don't guess)

> Populated/updated during Step 0 Recon (see `CLAUDE.md`). Once filled, later tasks **read here
> instead of re-deriving**. If the repo changes, update the stale line.

- **Package manager:** <!-- pnpm | npm | yarn (+ version) -->
- **Scripts:** `lint`=<!-- --> · `typecheck`=<!-- --> · `test`=<!-- --> · `e2e`=<!-- --> · `token-build`=<!-- -->
- **Test runner:** <!-- jest | vitest --> · **a11y:** <!-- jest-axe | vitest-axe -->
- **E2E runner:** <!-- Playwright | Cypress --> (see `testing.md`)
- **Import aliases:** <!-- from tsconfig paths, e.g. @/* → src/* -->
- **test-utils render path:** <!-- e.g. @/test-utils -->
- **Shared `cx` / class-merge util path:** <!-- e.g. @/lib/cx, or "none" -->
- **Token source + authoring format:** <!-- path to tokens/; DTCG JSON | typed-TS --> · **generated CSS:** <!-- path to tokens.css -->
- **Token naming sample (real, confirmed):** <!-- e.g. --color-text-default, --space-inset-md … -->
- **Cycle check available:** <!-- import/no-cycle in eslint | madge | nx boundaries | none yet -->
- **FSD enforcement:** <!-- steiger config? dependency-cruiser? eslint-plugin-boundaries? none yet -->
- **FSD layout:** <!-- root app/ + src/ layers? shared/ui flat or atomic sub-convention? confirm src/ layer folders present -->

## This project

- **Name:**
- **Monorepo tool / structure / tier:** <!-- Nx? modular monolith | multi-zones | federation — record the constraint that justified the tier -->
- **Apps & ports:** <!-- shell + feature apps, dev ports -->
- **API base URL(s):**
- **Auth / session model:** <!-- see security.md -->
- **Feature flags:**

## Existing slices (entities / features / widgets / pages — so plans reuse, not duplicate)

> The architect updates this as FSD slices are added, so the next plan reuses them. Note any `@x`
> cross-imports between entities (each is a deliberate coupling worth tracking).

| Slice | Layer (entity/feature/widget/page) | Path | What it owns | `@x` links |
| ----- | ---------------------------------- | ---- | ------------ | ---------- |

## Brand tokens

<!-- Only the primitive values that differ from defaults; everything else inherits the kit. -->

## Architecture decisions (the architect logs material calls here)

> New feature boundary, shared-vs-feature call, render-strategy choice, monorepo tier — with the why.

| Date | Decision | Why |
| ---- | -------- | --- |

## Approved overrides

> The **only** place a constitution rule may be relaxed. Each entry: rule overridden, reason,
> who approved, date. No entry = not approved; the rule holds.

| Date | Rule overridden | Reason | Approved by |
| ---- | --------------- | ------ | ----------- |

## Notes

<!-- Anything project-specific Claude should know that isn't derivable from the code. -->
