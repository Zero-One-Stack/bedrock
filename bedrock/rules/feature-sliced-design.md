# Rule: Feature-Sliced Design (the architecture)

> **Non-negotiable.** This kit's frontend architecture **is** Feature-Sliced Design (FSD). Every
> file lives in exactly one **layer → slice → segment** address, imports flow **downward only**,
> slices on the same layer **never** import each other (sole exception: the `@x` cross-import API
> on `entities`), and every slice exposes a **public API** (`index.ts`) that outsiders import — never
> a deep path. This is the *what goes where* and *what may import what* rule; the file-per-concern
> contract for a component lives in `component-structure.md`, the data segments in
> `services-and-data.md`. Read this first when placing anything.

## Why this exists

A consistent *application* is more than a pile of consistent components. Without an enforced
layering, "where does this go?" gets re-answered ad hoc per file, features quietly reach into each
other, and the dependency graph grows cycles that break tree-shaking and produce `undefined`-at-runtime
bugs. FSD fixes this by making the structure **standardized and mechanically checkable**: a fixed set
of layers ordered by how app-specific they are, business-domain slices that can't entangle, and
technical-purpose segments inside them. The payoff is **isolation** (rewrite a slice's internals and
nothing outside breaks, because the public API is the only contract) and **locatability** (the folder
path tells you the scope and blast radius of any change).

> **Pairs with, doesn't replace.** Atomic design still applies *inside* `shared/ui` as an optional
> grouping (`component-structure.md`); FSD governs the layers *above* `shared`, which is the gap
> atomic design never addressed.

## The six layers (high → low — most app-specific to most generic)

```
src/
├── app/        1. App-wide setup: providers, global styles, router wiring. Imports any layer below.
├── pages/      2. Full pages / route compositions. One slice per route screen.
├── widgets/    3. Large self-contained UI blocks that deliver a complete use case.
├── features/   4. Reused product actions that bring business value ("the how" — verbs).
├── entities/   5. Business domain models ("the what" — nouns): types, schemas, read-only UI.
└── shared/     6. Business-agnostic infrastructure & design system. Imports nothing above it.
```

> **`processes/` is deprecated — do not add it.** Cross-page flows live in `app` or are composed by
> a `page`. Steiger's `fsd/no-processes` flags it. **Multi-step wizards live in a `widget` slice:**
> a wizard is "a complete self-contained block" (the widget definition) that composes feature
> steps. Step state — current step, accumulated form values, can-go-next, can-go-back — lives
> in `widgets/<wizard-name>/model/`. Each step's form + submit logic stays in its own
> `feature/<step-action>/`. The widget orchestrates; the features execute. Don't reach for a
> `processes/` revival, and don't drill step state through the page.

Each layer is one job:

| Layer | Owns | Singular unit is a… |
| --- | --- | --- |
| **app** | Providers (Theme/Auth/QueryClient), global CSS resets, router/entrypoint wiring. **No UI, no layout styling, no business logic** — with one documented exception: **app-wide metadata files** that don't belong to any single route or widget (Next.js `sitemap.ts`/`robots.ts`/`manifest.ts`) live in `src/app/model/` and may read from `entities/` to enumerate URLs. See `nextjs-app-router-fsd.md`. | — (segments only) |
| **pages** | A route's screen: reads URL params, pulls server data (RSC), arranges widgets/features/entities. **No business rules.** | page slice |
| **widgets** | A complete, self-contained block (a dashboard panel, a header) composing entities + features. May own its own store/api as of FSD v2.1. | widget slice |
| **features** | One user-valuable **action** that mutates state (`file-grievance`, `resolve-dispute`). Owns its own form, validation schema, hooks, server action. Context-aware, **never full-screen**. | feature slice |
| **entities** | One business **model** (`employee`, `collective-agreement`): its Zod schema + TS types (the source of truth), its read-only UI (`<EmployeeCard>`), its read queries. **No mutations, no action buttons.** | entity slice |
| **shared** | The design system (`ui/`), base API/fetch clients (`api/`), generic libs/config/tokens. **Zero business terminology.** | — (segments only) |

## The import rule (memorize this — it's the whole methodology)

> **A module in a slice can only import other slices that are on layers *strictly below* it.**

Concretely:

- ✅ `pages` → `widgets`, `features`, `entities`, `shared`
- ✅ `widgets` → `features`, `entities`, `shared`
- ✅ `features` → `entities`, `shared`
- ✅ `entities` → `shared`
- ✅ `app` → any layer; `shared` → nothing above it (it's the floor)
- ❌ **Upward import** (`entities` → `features`, `widgets` → `pages`) — *fatal*. A lower layer knowing about a higher one inverts the dependency and creates cycles.
- ❌ **Same-layer slice import** (`features/file-grievance` → `features/resolve-dispute`, `entities/employee` → `entities/collective-agreement`) — banned. This is what keeps slices independently owned and testable.

### `app` and `shared` are the two exceptions

They are *both a layer and a slice at once* — they have **no slices, only segments**. So the
same-layer-slice ban is vacuous for them: **their segments may import each other freely**
(`shared/ui` may use `shared/lib`). `app` sits at the top (imports everything below); `shared` sits
at the bottom (imports nothing above). Steiger's `fsd/no-segments-on-sliced-layers` conversely
forbids bare segments directly on `pages`/`widgets`/`features`/`entities` — those *must* have a slice
first.

### The ONE same-layer escape hatch: `@x` cross-imports (entities only)

Two entities sometimes genuinely relate — a `collective-agreement` references the `employee` it
covers. A normal same-layer import is still forbidden. The sanctioned answer is a **separate, scoped
public API** that the *imported* entity publishes *for* the *importing* one — the `@x` notation
("employee crossed with collective-agreement"):

```
entities/
  employee/
    @x/
      collective-agreement.ts   ← employee's public API, scoped FOR collective-agreement
    index.ts                    ← employee's general public API
    model/employee.ts
```

```ts
// entities/employee/@x/collective-agreement.ts — expose ONLY what the consumer needs
export type { Employee } from '../model/employee';
```

```ts
// entities/collective-agreement/model/collective-agreement.ts
import type { Employee } from '@/entities/employee/@x/collective-agreement';

export interface CollectiveAgreement {
  coveredEmployees: Employee[];
  // …
}
```

**Rules for `@x`:** only on the **entities** layer (never features/widgets/pages — the PreToolUse
hook rejects `@x` segments and `@x/` imports outside `entities/`); keep cross-imports **rare** (each
one is coupling); the `@x/<consumer>.ts` filename is the *consuming* entity's name; it re-exports a
minimal slice of the API, never `export *`. Before reaching for `@x`, prefer one of the resolutions
below.

### When you hit a same-layer dependency, resolve it (don't reach for `@x` first)

A same-layer dependency is a **code smell**, not a routine pattern. In priority order:

1. **Compose from above (preferred).** Two features both needed on a screen? The **page or widget**
   imports both and wires them together (Inversion of Control: pass one's output into the other via
   props/slots). This is the FSD answer to your "Accord Rule" — a widget takes an entity's data and
   attaches a feature's action; the widget owns the wiring, neither sub-piece imports the other.
2. **Push the shared part *down* to a lower layer.** Logic two features share belongs in an
   `entity` (e.g. session validation → `entities/session`) or in `shared/lib`. Both then import
   downward — legal — and the coupling disappears.
3. **Merge** the two slices if they always change together (they were one slice pretending to be two).
4. **Only then**, for a genuine entity-to-entity domain relationship, use `@x`.

> **Shared *types* between domains** (your "where does `DepartmentID` go?" problem): if the type
> carries business meaning it **cannot** go in `shared` (`shared` is business-agnostic). Define it in
> the most logical **entity** and expose it via that entity's public API — over `@x` if a second
> entity needs it, or via a dedicated intersection entity (`entities/labour-relations`) if the
> relationship is complex/circular. Only truly generic, business-free types (a `Nullable<T>`, an
> `ApiResult<T>`) belong in `shared`.

### Compose-from-above with **headless feature hooks** (the wiring pattern)

"Compose from above" is the rule; **headless feature hooks** are the *mechanism*. A feature
exposes BOTH a rendered UI (its button/form) AND a hook (`useXFeature()`) that returns the
imperative API — `{ open, close, isOpen, trigger, mutate, ... }`. The hook is the seam: any
widget can wire one feature's hook to another feature's UI without the features importing
each other.

```ts
// features/file-grievance/index.ts — public API exposes BOTH the UI and the hook.
export { FileGrievanceForm } from './ui/file-grievance-form';
export { FileGrievanceButton } from './ui/file-grievance-button';
export { useFileGrievance } from './model/use-file-grievance';      // ← the headless hook
```

```ts
// features/file-grievance/model/use-file-grievance.ts
'use client';
import { useState, useCallback } from 'react';

export function useFileGrievance() {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  // …expose what consumers actually need; never internal state shapes.
  return { isOpen, open, close };
}
```

```tsx
// widgets/grievance-dashboard/ui/grievance-dashboard.tsx — composes BOTH features
// without either feature importing the other.
'use client';
import { useFileGrievance, FileGrievanceForm } from '@/features/file-grievance';
import { useResolveDispute, ResolveDisputeButton } from '@/features/resolve-dispute';
import { Dialog } from '@/shared/ui';

export function GrievanceDashboard() {
  const file = useFileGrievance();
  const resolve = useResolveDispute({ onResolved: file.close });  // widget wires them

  return (
    <>
      <Button onClick={file.open}>File new grievance</Button>
      <ResolveDisputeButton />

      <Dialog.Root open={file.isOpen} onOpenChange={file.close}>
        <Dialog.Content>
          <FileGrievanceForm onSubmitted={resolve.maybeAutoResolve} />
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
```

The hook's contract is the same as a headless component (Base UI / Radix style): it owns
state, exposes handlers and refs, the consumer renders the UI. Three features can now share
a wizard, a dialog stack, or a multi-step flow — composed by the widget that owns the
orchestration — and none of the features imports any of the others.

Rules for headless feature hooks:

- The hook's name is `use<Action>` (matches the feature slice name).
- It returns a **stable, documented object** — `{ open, close, isOpen, ... }`. Don't expose
  internal state setters (`setIsOpen`); expose intent (`close`).
- The hook is exported from the slice's `index.ts` (public API).
- A feature that doesn't expose a hook because nothing composes it yet is fine — add the
  hook the first time a widget needs to wire it.

What this is NOT:

- ❌ A feature importing another feature's hook to call it internally. That's still a
  same-layer slice import. The widget calls both hooks; the features don't see each other.
- ❌ Exposing a hook that returns a feature's internal Zod schema, query keys, or fetcher
  functions — those stay internal. The hook returns the *imperative API* the widget needs to
  orchestrate.

## Slices and segments

- **Slice** = the second level: a partition by **business domain** (`employee`, `file-grievance`,
  `grievance-dashboard`). Names come from *your* domain — not standardized. Slices give the
  isolation guarantee (no same-layer reach-in).
- **Segment** = the third level: a partition by **technical purpose**. The standard set:

| Segment | Holds |
| --- | --- |
| `ui/` | Components, styles, formatters — anything display. |
| `model/` | Schemas, types, stores, business logic, selectors. |
| `api/` | Backend interaction: request fns, DTOs, mappers, server queries/actions. |
| `lib/` | Helper code used by *other modules within this same slice*. |
| `config/` | Config and feature flags. |

> **Name segments by *purpose*, never by *essence*.** `components/`, `hooks/`, `modals/`,
> `utils/` are **banned segment names** — they describe what a thing *is*, not *why* it exists, and
> Steiger's `fsd/segments-by-purpose` flags them. A hook that fetches data is `model/`; a hook that's
> a generic helper is `lib/`. (This supersedes the old `components/ hooks/ api/` feature folder shape.)

A typical sliced layer:

```
features/
  file-grievance/
    ui/         FileGrievanceForm.tsx, FileGrievanceButton.tsx ('use client' lives here)
    model/      schema.ts (Zod), use-file-grievance.ts (RHF/state)
    api/        file-grievance.action.ts (Server Action) + revalidate
    index.ts    public API: export { FileGrievanceButton, FileGrievanceForm }  — NOT internals
```

### `shared/lib` — group early by purpose (not by essence)

`shared/lib/` is where business-agnostic utilities live: the class-merge `cx`, formatters,
date helpers, the Slot helper, the variants recipe, DOM utilities, hooks. **Pre-group by
purpose from day one** — a flat list grows past 15 modules quickly and Steiger's
`fsd/shared-lib-grouping` rule warns above that threshold. Group folders are *purposes*
(what the code is for), never *essences* (what the code is):

```
shared/lib/
├── cx/             class-merge util — the kit's one cx helper
├── slot/           the Slot polymorphism helper (component-composition.md)
├── variants/       the recipe() helper (component-composition.md)
├── date/           date parsing/formatting helpers
├── format/         string/number formatters (currency, percent, list)
├── dom/            DOM/event helpers (use-resize, use-click-outside)
├── url/            URL building / query-string helpers
├── observability/  the captureException wrapper (observability.md)
├── error-boundary/ the shared ErrorBoundary
├── middleware/     Next.js middleware composers (nextjs-app-router-fsd.md)
└── instrumentation/ register() for Sentry/OTel (nextjs-app-router-fsd.md)
```

> ❌ `shared/lib/hooks/`, `shared/lib/utils/`, `shared/lib/components/`, `shared/lib/types/` —
> all banned (`segments-by-purpose` flags essence-named groups even one level deep).
> A hook that formats a date goes in `shared/lib/date/`, not `shared/lib/hooks/`.
>
> When the count of purpose-folders itself grows past 15, the kit's answer is the same:
> coarser groups (e.g. fold `dom/`, `url/`, `cx/` into `web/`). Steady-state aim: ~10
> purpose folders for the `shared/lib` root.

## The Public API barrier (the slice's contract)

Every slice has a root `index.ts` that **is** its public contract. Outside code imports the slice
*only* through it:

```ts
// ❌ ILLEGAL — deep import bypasses the public API (Steiger fsd/no-public-api-sidestep)
import { EmployeeCard } from '@/entities/employee/ui/cards/EmployeeCard';

// ✅ REQUIRED — import the slice's public API
import { EmployeeCard } from '@/entities/employee';
```

- **Why:** if a team rewrites `entities/employee`'s internals, nothing outside breaks as long as the
  `index.ts` exports stay stable. The barrier is what makes independent ownership real.
- **No `export *`** in the barrel — it hurts discoverability and silently leaks (then accidentally
  *breaks*) internals. List exports explicitly: `export { Employee } from './model/employee'`.
- **No barrel re-export loops** — a slice's own files import siblings by leaf path, never the slice's
  own `index.ts`. (Cycle mechanics in `component-structure.md`.)
- **No layer-level `index.ts`** — the public API is per-slice, not per-layer (Steiger `fsd/no-layer-public-api`).
- **Use `export type { … }` for type-only exports.** A bare `export { EmployeeSchema, type Employee }`
  is fine; a `export { type Employee }` is fine; an `export { Employee }` for a type-only symbol
  pulls runtime cost into the consumer's bundle even though the symbol vanishes at compile time
  (some bundlers treat the import as a side-effect carrier).
- **Mark deprecated exports with `@deprecated` JSDoc.** The annotation surfaces in every consumer's
  IDE and in TypeScript's compiler diagnostics:
  ```ts
  /** @deprecated Use `useEmployeeQuery` — this hook is removed in v3. */
  export { useEmployeeLegacy } from './hooks/use-employee-legacy';
  ```
  Pair the annotation with an ADR (`docs/adr/`) explaining the replacement. The
  `_deprecated-` slice prefix from the Migration moves section is for entire slices; per-symbol
  deprecation uses `@deprecated` instead.

## FSD on Next.js App Router (the layer-name collision, solved)

FSD owns layer folders named `app` and `pages`; Next.js owns a routing directory named `app/`. They
collide. The official resolution — **keep Next's router at the repo root; put all FSD layers under
`src/`**:

```
/                          repo root
├── app/                   ← NEXT.JS ROUTING ONLY (App Router). Thin. No business logic.
│   ├── layout.tsx         imports the FSD app-layer providers; injects fonts/CSS reset
│   ├── page.tsx           export { HomePage as default } from '@/pages/home'
│   └── active-grievances/
│       └── page.tsx       export { ActiveGrievancesPage as default, metadata } from '@/pages/active-grievances'
├── middleware.ts          stays at root (next to app/)
└── src/                   ← ALL FSD LAYERS
    ├── app/               FSD app layer: providers/ (the 'use client' shell), global styles
    ├── pages/             FSD pages layer: active-grievances/ui/ActiveGrievancesPage.tsx
    ├── widgets/           grievance-dashboard/
    ├── features/          file-grievance/ resolve-dispute/ agentic-reasoning/
    ├── entities/          collective-agreement/ employee/
    └── shared/            ui/ api/ lib/ config/ tokens/
```

- **Root route files are near-empty re-exports** of the FSD `pages` layer:
  `export { ActiveGrievancesPage as default, metadata } from '@/pages/active-grievances';`
- **The Next `app/layout.tsx` carries zero layout styling.** Its only job: inject global context
  **providers** and fonts/reset. Because Next layouts are Server Components and providers need React
  Context (client), build an `src/app/providers/` `'use client'` shell and import *that* into the
  server layout. (Steiger `fsd/no-ui-in-app` forbids a `ui` segment in the app layer.)

### Provider composition root (`src/app/providers/`)

The order in which providers wrap `{children}` is **not arbitrary** — wrong order silently breaks
SSR theming, query hydration, and error-boundary scope. The kit's canonical order, top-down:

```tsx
// src/app/providers/index.tsx
'use client';
import { ReactNode } from 'react';
import { ErrorBoundary } from '@/shared/lib/error-boundary';        // top-most: catches everything inside
import { ThemeProvider } from '@/app/providers/theme';              // sets data-theme; reads cookie/system
import { QueryProvider } from '@/app/providers/query';              // QueryClient + HydrationBoundary
import { I18nProvider } from '@/app/providers/i18n';                // i18next instance; depends on theme for RTL flips
import { AuthProvider } from '@/app/providers/auth';                // session context; consumed by features
import { FeatureFlagsProvider } from '@/app/providers/flags';       // runtime flag context

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<GlobalErrorView />}>
      <ThemeProvider>
        <QueryProvider>
          <I18nProvider>
            <AuthProvider>
              <FeatureFlagsProvider>
                {children}
              </FeatureFlagsProvider>
            </AuthProvider>
          </I18nProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

The order encodes real dependencies — outer providers MUST be ready before inner ones run:

| Layer | Why it sits where it does |
| --- | --- |
| **ErrorBoundary** (outermost) | If any provider below throws on mount (a misconfigured QueryClient, a broken i18n bundle, an Auth session-restore crash), this is the only thing that can catch it. Anything *outside* the boundary brings down the whole tree. |
| **ThemeProvider** | Must run before any provider that emits user-visible UI in its fallback/loading state (Query's Suspense boundaries, Auth's redirect screen, etc.). Reads `data-theme` set by the inline head script (`theming.md`). |
| **QueryProvider** (React Query + HydrationBoundary) | Wraps the cache before Auth/Flags/Features consume it. Hydrates RSC-prefetched queries via `<HydrationBoundary state={dehydratedState}>`. If Auth needs to refresh a token via React Query, Query MUST exist already. |
| **I18nProvider** | Below Query so translated copy in Query's error/loading fallbacks resolves correctly. Above Auth/Flags because their UI strings are translated. Reads `dir` from the document; flips with theme/locale changes. |
| **AuthProvider** | Below I18n so its login-redirect screens are translated. Above Flags so a session-scoped flag override works. |
| **FeatureFlagsProvider** (innermost) | Consumes the user identity from Auth to evaluate per-user variants. Innermost so features can read flags AND auth AND query AND i18n AND theme. |

Rules:

- **One `Providers` shell per repo**, exported from `@/app/providers`, imported by the
  server `app/layout.tsx`. No second `Providers` somewhere else.
- **No business hooks in providers** — providers wire context, they don't fetch domain data.
  Domain reads belong to entity `*.queries.ts`; the providers are pure infrastructure.
- **Providers that don't apply to the project are dropped, not stubbed.** If the app has no
  feature flags, the `FeatureFlagsProvider` simply isn't in the tree — don't ship an empty
  pass-through.
- **HydrationBoundary lives inside QueryProvider** (or QueryProvider IS the hydration
  boundary). The root server layout passes the RSC-prefetched `dehydratedState` down as a
  prop on the client shell; QueryProvider consumes it.
- **The `'use client'` boundary is exactly the `Providers` file** — no `'use client'` on
  individual provider files unless they're consumed independently (which they shouldn't be).
- **Engine-specific providers** (Chakra v3 `ChakraProvider`, MUI `ThemeProvider`,
  vanilla-extract's runtime, etc.) wrap *above* `ThemeProvider` if they own theme, or *below*
  it if they just consume tokens. Document the placement in `project-specifics.md`.

A wrong order in practice — and the symptom you'll see:

- `Auth` above `Query` → Auth tries to refresh a token, `useQuery` crashes with "No
  QueryClient set."
- `I18n` above `Theme` → i18n initialization reads `dir` before the theme script flips RTL;
  every first paint is LTR for one frame.
- `ErrorBoundary` below `Query` → a QueryClient construction error escapes to the global
  Next.js error boundary instead of the kit's fallback.
- No `HydrationBoundary` → RSC-prefetched data isn't picked up by client `useQuery`; the
  client refetches everything, doubling network and showing loading skeletons on a page
  that the server already rendered with data.

- **Route Handlers / API routes:** webhooks/OAuth/3rd-party → root `app/api/.../route.ts`; their
  logic delegates down into a feature/entity `api` segment. Server Actions for UI-driven mutations
  live in the owning feature's `api/` segment.
- A root `pages/` stub may be needed only on mixed Pages-Router setups; pure App Router omits it.

### Render & data flow inside the layers

**Server Components by default.** `'use client'` lives on the **interactive leaf** — and those leaves
live in **features** and **widgets**, never at the top of a route or page. The PreToolUse hook
rejects `'use client'` at the top of `app/**/page.tsx` (root route) and `src/pages/<route>/ui/*.tsx`
(the FSD page slice screen).

- **Data fetching is top-down (RSC).** The page (Server Component) and widgets fetch. Reads are
  **entity queries** (`entities/<x>/api/*.queries.ts` — **server-only**, `import 'server-only';` at
  the top, e.g. `getEmployee(id)`) exposed via the entity's public API; the page calls them and
  passes plain data **down as props** into widgets → features → entity UI. Client-side reuse goes
  through the sibling `<model>.hooks.ts` (React Query). Don't invent a global `services/` bucket —
  domain reads belong to the entity. (Details + the queries/hooks split: `services-and-data.md`.)
- **State mutations are bottom-up.** A user acts on a **feature** (client leaf). The feature runs a
  **Server Action** (its `api/` segment) or a Route Handler mutation, then **invalidates** the cache
  (`revalidatePath`/`revalidateTag`, or a React Query `invalidateQueries`), which re-runs the
  top-of-tree fetch and flows fresh data back down. Reads down, writes up. (Details:
  `services-and-data.md`.)
- **Client state** (open/selected, forms) stays in React primitives / React Hook Form **inside the
  feature**; **server state** is React Query / RSC. Never copy server data into client state.

## Choosing the right layer (and not over-slicing)

Decide with the singular-unit test:

```
Is it a route's screen?                              → pages/<route>/
Is it a complete self-contained block of a screen?   → widgets/<block>/
Is it a user action that changes state?  (a verb)    → features/<action>/
Is it a domain model + its read-only view? (a noun)  → entities/<model>/
Is it generic + business-agnostic (UI kit, fetch)?   → shared/{ui,api,lib,config}/
```

**Don't create a slice you don't need yet (the "insignificant slice" trap).** FSD's biggest failure
mode is over-slicing — a widget used once, a feature referenced nowhere. Build functionality **where
it's first needed** (often straight in the page slice), finish it, and **extract up into a
widget/feature/entity only once reuse is real**. A block that is the sole content of one page and is
never reused **stays in that page**, not in `widgets`. Steiger's `fsd/insignificant-slice` and
`fsd/excessive-slicing` police this; so does review.

- A **feature** must be a *reused, valuable action*. Used in exactly one place and not worth
  isolating → leave it in the page/widget.
- A **widget** is not a mandatory composition layer — small compositions can live in the page. Don't
  wrap a single feature in a widget just to have one.

## Migration moves (extract a slice, retire a slice)

Slices are not immutable; they are extracted when reuse becomes real, and retired when they
stop being needed. The kit documents the move so it stays consistent across teams.

### Extract: inline page UI → widget / feature

When a block initially built inside `pages/<route>/ui/` is now needed on a second screen
(reuse is real), promote it:

1. **Create the destination slice** (`widgets/<block>/` or `features/<action>/`) with the
   standard `ui/`, `model/`, `api/` segments per the singular-unit test.
2. **Move the files** without rewriting; preserve the component's public surface.
3. **Add the slice's `index.ts`** exporting the public API.
4. **Replace the inline usage in the page** with an import from the new slice's barrel
   (`import { GrievanceDetail } from '@/widgets/grievance-detail';`).
5. **The second consumer** (the new screen) imports from the same barrel.
6. **Update `project-specifics.md`** with a one-line note: "extracted `grievance-detail`
   widget from `pages/active-grievances` on 2026-05; second consumer:
   `pages/grievance/[id]`."
7. **Update `CODEOWNERS`** if the new slice belongs to a different team than the source
   page.

Run `/verify-build` after the extract — Steiger's `insignificant-slice` should now pass
because the new slice has ≥2 consumers.

### Retire: collapse an insignificant slice back

A widget/feature created speculatively that never picked up a second consumer is the
insignificant-slice trap. The retire move:

1. **Verify it really is unused** — `grep` the slice's exports across the codebase. If the
   only consumer is the original page, it's a retire candidate.
2. **Inline the files back** into the original consumer (`pages/<route>/ui/` or the parent
   widget's `ui/`).
3. **Delete the slice folder**.
4. **Remove its barrel exports** from any parent (e.g. drop the widget's import in the
   page slice's `index.ts`).
5. **Update `project-specifics.md`** with the retire reason.

### Graveyard: retiring an entity that's been replaced

When an entity is superseded by a different model (a `LegacyEmployee` → `Employee`
migration), the retire is more delicate because external consumers may still need the type
during the transition:

1. **Rename the dying slice** with a `_deprecated-` prefix (`entities/_deprecated-employee/`)
   — the prefix makes the deprecation visible in every import path and IDE autocomplete.
2. **Keep the slice's `index.ts`** re-exporting from the successor for **one release** so
   existing imports don't break instantly:
   ```ts
   // entities/_deprecated-employee/index.ts
   /** @deprecated Use `@/entities/employee` directly — this barrel is removed in v3. */
   export * from '@/entities/employee';
   ```
3. **Add an ADR** (`docs/adr/`) explaining the rename + the cut-over date.
4. **Update every consumer** within the deprecation window (the `@deprecated` JSDoc shows up
   on each call site in TS/IDE).
5. **After the release**, delete `entities/_deprecated-employee/` entirely.

Rules for migration moves:

- ❌ Extracting a slice speculatively — wait until reuse is real (the insignificant-slice
  trap is the entire reason this rule exists).
- ❌ Renaming a slice in-place during a deprecation — use `_deprecated-` so consumers see
  the change everywhere immediately.
- ❌ A graveyard barrel that lingers past one release — kit policy is "one release, then
  delete." Logged in `project-specifics.md` if the team needs longer.
- ✅ Extract moves preserve the public surface (consumers updating an import path is the
  only diff).
- ✅ Retire moves include a `project-specifics.md` note explaining why.
- ✅ Entity retires use the `_deprecated-` prefix + a time-boxed graveyard barrel + an ADR.

## Naming

- **Folders & files: `kebab-case`** — slices (`file-grievance`, `collective-agreement`), files
  (`employee-card.tsx`). Segment names are the fixed set (`ui/model/api/lib/config`) or a
  purpose-named custom one.
- **Component exports: `PascalCase`** (`EmployeeCard`); prefer **named exports**.
- **Entities = singular nouns** (`employee`, `grievance`); **features = action phrases**
  (`file-grievance`, `resolve-dispute`); **pages = the route**; **widgets = the block**.
- Layer names are fixed vocabulary — don't rename them even when a business term collides.
- **Reserved slice names** (forbidden at every sliced layer — `entities/`, `features/`,
  `widgets/`, `pages/`): `ui`, `lib`, `api`, `config`, `model`, `types`, `utils`, `hooks`,
  `components`, `helpers`, `constants`, `theme`, `i18n`. Steiger's `fsd/ambiguous-slice-names`
  flags any slice named the same as a `shared/` segment, and `fsd/segments-by-purpose` flags
  essence-named groups inside `shared/lib/`. Pick a business-domain name (`employee`,
  `file-grievance`, `grievance-dashboard`) — never a technical-essence one.

## Enforcement (this rule is build-breaking, not advisory)

- **Steiger** (the official FSD linter) is the primary gate — `ci/steiger.config.ts`. It uniquely
  understands slices, segments, `@x`, and same-layer isolation.
- **dependency-cruiser** (`ci/.dependency-cruiser.cjs`) and **eslint-plugin-boundaries**
  (`ci/eslint-fsd-boundaries.cjs`) enforce layer *direction* + the public-API barrier in lint/CI.

### Steiger rule ledger (verify on every plugin upgrade)

`configs.recommended` from `@feature-sliced/steiger-plugin` ships 17 rules ON by default and
3 OFF. The kit pins this ledger in `ci/steiger.config.ts` (with one-line descriptions) so a
plugin upgrade that adds or removes a rule shows up in code review instead of silently
changing what fails CI. Verified against `@feature-sliced/steiger-plugin@0.5.8`:

| Rule | State | Catches |
| --- | --- | --- |
| `fsd/ambiguous-slice-names` | ON | Slice name collides with a `shared/` segment (`theme`, `i18n`, `lib`, `ui`, `api`, `config`, `model`, `types`, `utils`, `hooks`). |
| `fsd/excessive-slicing` | ON | A sliced layer has >20 ungrouped slices. |
| `fsd/forbidden-imports` | ON | Lower layers may not import from higher layers (direction enforcement). |
| `fsd/inconsistent-naming` | ON | Mixed singular/plural slice naming on a layer. |
| `fsd/insignificant-slice` | ON | Slice referenced 0–1 times — inline candidate. |
| `fsd/no-layer-public-api` | ON | `index.*` at the *layer* root is forbidden (except `app`). |
| `fsd/no-processes` | ON | The deprecated `processes` layer. |
| `fsd/no-public-api-sidestep` | ON | Deep import past a slice's `index.*`. |
| `fsd/no-reserved-folder-names` | ON | Sub-folders named like segments (`shared/lib/ui`). |
| `fsd/no-segmentless-slices` | ON | A slice without a `ui/model/api/lib/config` segment. |
| `fsd/no-segments-on-sliced-layers` | ON | Bare segments directly under a sliced layer (`features/ui/…`). |
| `fsd/no-ui-in-app` | ON | `ui/` segment inside the `app` layer. |
| `fsd/public-api` | ON | Every slice/segment must expose an `index.*`. |
| `fsd/repetitive-naming` | ON | Slice name redundantly repeats the layer (`pages/home-page`). |
| `fsd/segments-by-purpose` | ON | Essence-named segments (`components`/`hooks`/`utils`/`modals`/`types`/`constants`). |
| `fsd/shared-lib-grouping` | ON | `shared/lib/` has >15 direct children. |
| `fsd/typo-in-layer-name` | ON | Layer-folder typo (`shraed`). |
| `fsd/import-locality` | OFF — opt-in | Self-imports via absolute/aliased paths instead of relative (mirrors the kit's no-barrel-cycles rule — recommend ON for greenfield repos). |
| `fsd/no-cross-imports` | OFF — opt-in | Stricter same-layer ban than `forbidden-imports` (recommend ON for greenfield). |
| `fsd/no-higher-level-imports` | OFF — opt-in | Forbids importing from a higher layer regardless of direction (recommended for shared/library packages). |

- The **block-banned-patterns** hook is the **first layer** at write time (Edit/Write/MultiEdit):
  it catches deep cross-slice imports past a slice's `index.ts`; `@x` segments or `@x/` imports on
  `features/widgets/pages` (entities-only); `'use client'` at the top of `app/**/page.tsx` or
  `src/pages/<route>/ui/*.tsx`; entity `*.queries.ts` missing `import 'server-only';`; feature
  `*.action.ts` missing `'use server';`. **It is not the only layer** — see the enforcement
  matrix in `governance.md` for what catches what (and what hooks CAN'T catch: pipe mode, MCP
  subagents, shell-issued writes, partial Edits).
- `/verify-build` runs Steiger + depcruise and treats a violation (or a new cycle) as a failure.

## Hard rules

- ❌ **Upward import** (a lower layer importing a higher one). Fatal.
- ❌ **Same-layer slice import** — except `@x` on `entities`. Resolve via compose-from-above / push-down / merge.
- ❌ **Deep import** past a slice's `index.ts` (public-API sidestep); `export *` in a barrel; a layer-level barrel.
- ❌ **`processes/` layer** (deprecated); **segments named by essence** (`components/hooks/utils/modals`).
- ❌ **Business terminology in `shared`**; **mutations or action buttons in an `entity`**; **a full-screen feature**; **layout styling or business logic in `app`/route files**.
- ❌ **`'use client'` at the top of a page/route** (`app/**/page.tsx` or `src/pages/<route>/ui/*.tsx`) — push it to a feature/widget leaf. Caught at write-time by the PreToolUse hook on Write, by ESLint on existing code, and by the reviewer agent on diff (`governance.md`'s enforcement matrix).
- ❌ **Entity `*.queries.ts` without `import 'server-only';`** — silent client-bundle leak of secrets/DB calls. PreToolUse hook catches Write; ESLint backstops Edits and existing code.
- ❌ **Feature `*.action.ts` without `'use server';`** — Next.js may expose it as a client RPC. Same layered enforcement.
- ❌ **`@x` on `features/widgets/pages`** — entities-only. PreToolUse hook + Steiger `fsd/forbidden-imports` + ESLint backstop.
- ❌ **An "insignificant" slice** (referenced 0–1 times) created speculatively — keep it in the page until reuse is real.
- ✅ Imports flow strictly downward; every slice has a minimal explicit public API; segments named by purpose.
- ✅ Reads fetched high (pages/widgets via entity queries) and passed down as props; mutations in features that then invalidate.
- ✅ Cross-entity relationships via `@x` (rare) or a dedicated intersection entity; cross-team composition from above.
- ✅ Record material slice/boundary decisions (a new entity, a feature→widget extraction, an `@x` link) in `rules/project-specifics.md`.

## Checklist — a placement is "done" when

- [ ] The file is in exactly one `layer/slice/segment` (or `app`/`shared` segment) and the layer matches the singular-unit test.
- [ ] Every cross-slice import is **downward** and goes through the target slice's `index.ts`.
- [ ] No same-layer slice import (or, on entities, it's a justified `@x` link with a minimal scoped file).
- [ ] The slice's `index.ts` exports only its public surface — no `export *`, no internals.
- [ ] Segments are purpose-named (`ui/model/api/lib/config`), not essence-named.
- [ ] On Next.js: the root route file is a thin re-export of `@/pages/*`; `'use client'` is on a feature/widget leaf, not the page.
- [ ] Reads live in entity/page `api`; mutations live in a feature `api` (Server Action) and invalidate.
- [ ] Steiger + dependency-cruiser pass (`/verify-build`); no new cycle.

## Sources
- [Feature-Sliced Design — Overview](https://feature-sliced.design/docs/get-started/overview)
- [FSD — Layers reference](https://feature-sliced.design/docs/reference/layers)
- [FSD — Slices and segments](https://feature-sliced.design/docs/reference/slices-segments)
- [FSD — Public API](https://feature-sliced.design/docs/reference/public-api)
- [FSD — Isolation of modules (the import rule)](https://feature-sliced.design/docs/reference/isolation)
- [FSD — Cross-imports & the `@x` notation](https://feature-sliced.design/docs/guides/issues/cross-imports)
- [FSD — Types & the `@x` example](https://feature-sliced.design/docs/guides/examples/types)
- [FSD — Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [FSD — The Ultimate Next.js App Router Architecture](https://feature-sliced.design/blog/nextjs-app-router-guide)
- [Steiger — the official FSD linter](https://github.com/feature-sliced/steiger)
