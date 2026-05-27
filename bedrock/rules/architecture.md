# Rule: Application Architecture (plan before you build)

> **Non-negotiable.** Anything spanning more than one component starts with a **plan**, not a
> scaffold. The `frontend-architect` agent (`/architect`) produces it. A consistent *application*
> is more than a pile of consistent components — the FSD layer decomposition, data flow, and render
> boundaries have to be decided up front, or inconsistency creeps back in component-by-component.

## Why this exists

`component-builder` keeps each unit consistent; it does **not** decide which FSD **layer** a unit
belongs to, where data lives, or what's a Server vs. Client Component. Made implicitly, those
decisions drift. This rule is the missing Phase 1: **map routes → place each unit on its FSD layer →
plan data → plan render → order the build.** It applies `feature-sliced-design.md` (the layer/slice
rules), and feeds `services-and-data.md` (the data layer) and `component-structure.md` (the file
contract); it does not duplicate them.

## The decomposition order (top-down, by FSD layer)

```
Product/feature request
  → Routes (root app/.../page.tsx)   what URLs/screens exist (thin re-exports of src/pages/*)
  → pages/<route>/                    the screen slice that arranges the route
  → widgets/<block>/                  self-contained blocks the page composes (only if reused/large)
  → features/<action>/                user actions that mutate state (verbs, singular)
  → entities/<model>/                 domain models: schema+types, read-only UI, read queries (nouns)
  → shared/                           generic UI kit / api client / lib the above reuse
```

Then **build bottom-up** (shared → entities → features → widgets → pages → route) so every dependency
exists before the thing that needs it — this is also FSD's import direction, so building in this order
means you never write an import that would later be illegal. The plan also names the **test surface**
up front: which components get unit/integration tests and **which user journey gets the E2E**
(`testing.md` — both layers are mandatory), so neither is an afterthought.

## Decisions to make explicitly (each is a place drift hides)

### 1. Layer placement (apply `feature-sliced-design.md`)
For every unit, decide its **layer** with the singular-unit test: a route screen → `pages`; a
complete composed block → `widgets`; a state-changing action → `features`; a domain model + read-only
view → `entities`; generic/business-agnostic → `shared`. Then its **slice** (the business name) and
**segment** (`ui`/`model`/`api`/`lib`/`config`).
- **Don't over-slice.** A block used on one page and never reused stays *in that page* — don't mint a
  widget/feature for it (the insignificant-slice trap). Build where it's needed, extract up only when
  reuse is real.
- **No same-layer slice coupling.** Two features needed together are composed by the **page/widget**
  above them (Inversion of Control), not by importing each other. Cross-entity domain links use `@x`
  (rare). Plan the composition point, not the cross-import.
- Route ≠ page slice. The root `app/.../page.tsx` is a thin re-export; the screen lives in
  `src/pages/<route>/ui/`. Routes hold no business logic.

### 2. Data & state placement (defer to `services-and-data.md`)
For each piece of data, classify it once, in the plan:

| It is…                         | It lives in…                              |
| ------------------------------ | ----------------------------------------- |
| Remote/server **read**         | an **entity** `api/` query (RSC), exposed via the entity's public API |
| Remote/server **write**        | a **feature** `api/` Server Action (then invalidate) |
| Client-side server-state cache | **React Query** hook (in the consuming slice) |
| Form input                     | **React Hook Form** + Zod, inside the feature `model/` |
| Ephemeral UI (open/selected)   | `useState` / `useReducer`                 |
| Shared client state            | React **Context** (in `app/` providers), sparingly |

Name the entity queries / feature actions to **scaffold vs. reuse**, their Zod schemas, and query
keys. Reads flow **down** as props (pages/widgets fetch → entities render); writes flow **up**
(feature mutates → invalidate → re-fetch at top). Never plan the same data twice; never copy server
data into client state.

### 3. Render & boundaries (Next.js App Router)
- **Server Components by default.** Decide the **single interactive leaf** that needs `'use client'`
  and place it in a **feature** or **widget** — never `'use client'` at the top of a page or route.
- Server-side reads call entity query fns directly; client interactivity uses React Query hooks.
- Place `loading.tsx` / `error.tsx` beside the **route** in root `app/`; decide Suspense boundaries.
  Identify the **LCP element** and any heavy/below-fold client code to split (see `performance.md`).

### 4. Component inventory (defer to `component-structure.md` for the file contract)
List every component before building one. For each: its **layer/slice/segment**, **new vs. reuse**,
the tokens/roles/data it needs. Reuse existing `shared/ui` and entity UI first. Composition flows
**downward** (shared → entities → features → widgets → pages); **no cycles, no upward imports, no
same-layer slice imports**.

## Output of a plan (the architect's deliverable)

The six sections in `agents/frontend-architect.md`: scope/layer-decomposition · data & state · render
& boundaries · component inventory · build order & routing · risks/open questions. It ends with the
**first concrete command** and routes each unit to `/add-design-token`, `/scaffold-service`, or
`component-builder`. The architect **plans and routes — it does not write implementation.**

## Hard rules

- ❌ Scaffolding a multi-component feature with **no plan** (you'll re-decide placement/data ad hoc).
- ❌ A route (`app/.../page.tsx`) holding business logic or being more than a re-export of `@/pages/*`.
- ❌ Planning a unit that reaches into another same-layer slice — compose from above, push down, or `@x` (entities).
- ❌ Planning a speculative widget/feature for single-use UI — keep it in the page until reuse is real.
- ❌ Planning duplicate data/queries that already exist — Recon first, reuse.
- ✅ Decompose top-down by FSD layer, build bottom-up; classify every state once; pick the deepest `'use client'` leaf.
- ✅ Record material layer/slice/boundary decisions (a new entity, a feature→widget extraction, an `@x` link) in `rules/project-specifics.md`.

## Sources
- [Feature-Sliced Design](https://feature-sliced.design/)
- [FSD — The Ultimate Next.js App Router Architecture](https://feature-sliced.design/blog/nextjs-app-router-guide)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js — Project structure & organization](https://nextjs.org/docs/app/getting-started/project-structure)
