# Rule: Data Layer (within FSD segments)

> **Non-negotiable.** Data lives in the **`api/` and `model/` segments** of the slice that owns it,
> and reaches components only through the slice's public API. **Reads down, writes up:** entity
> queries fetch (high, in RSC) and pass data down as props; feature Server Actions mutate and
> invalidate. Server state = React Query / RSC; client state = React primitives. **No Effector. No
> global server-state stores.** Placement is governed by `feature-sliced-design.md`; this file is the
> file-per-concern data contract.

## Where data lives (the FSD answer)

| Kind of data code | Segment | Why |
| --- | --- | --- |
| **Reads** of a domain model (`getEmployee`, `listGrievances`) | `entities/<model>/api/` | The model owns its own queries; pages/widgets call them and render. |
| **Writes** (mutations) for an action | `features/<action>/api/` | Mutations are the feature's job; only features may POST/PUT/PATCH/DELETE. |
| The model's **schemas + types** (source of truth) | `entities/<model>/model/` | Zod schema + `z.infer` types live with the entity. |
| Form state + validation for an action | `features/<action>/model/` | A feature owns its form, schema, and hooks. |
| The **base fetch client / query-client** | `shared/api/` | Business-agnostic transport; configured once. |
| Cross-cutting client cache hooks | the consuming slice's `model/` | React Query hooks wrapping entity/feature api fns. |

> **There is no top-level `services/` bucket in FSD.** A "service" is just an entity's `api/`
> (reads) or a feature's `api/` (writes). Truly generic transport is `shared/api`. If you're tempted
> to put a *domain* read in `shared`, it belongs in the **entity** instead — `shared` is business-agnostic.

> **Paths/aliases are repo-specific.** `@/entities/…`, `@/features/…`, `@/shared/…`, `src/…` below
> are illustrative. Read `tsconfig.json` `compilerOptions.paths` for the real aliases (Recon, Step 0).
> A slice's api is imported via the slice's **public API barrel**, never a deep path.

Files are **kebab-case throughout** — including the endpoints file. Every file ends in the role
suffix shown below (`.endpoints.ts`, `.api.ts`, `.queries.ts`, `.action.ts`, …). No camelCase filenames.

## State boundaries (memorize)

| Kind of state            | Where it lives                          |
| ------------------------ | --------------------------------------- |
| Remote/server data       | **React Query** (`useQuery`/`useMutation`) or RSC fetch in pages/widgets |
| Form state               | **React Hook Form** (+ Zod), in the feature's `model/` |
| Ephemeral UI/local state | `useState` / `useReducer`               |
| Shared client state      | React **Context** (in `app/` providers), sparingly |
| ❌ Anything in Effector   | **Banned.** Do not introduce it.        |

Never copy server data into client state. Read it from the query cache (or receive it as RSC props).

## Reads down, writes up (the FSD + App Router data flow)

```
                 ┌─────────────────────────── pages / widgets (Server Components) ───────────────────────────┐
   FETCH (RSC) → │ call entity query fns (entities/<x>/api) → pass plain data DOWN as props                  │
                 └───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                              │ props
                 ┌────────────────────────────────────────────▼──────────────────────────────────────────────┐
                 │ entities/<x>/ui  (read-only display)   features/<y>/ui  ('use client' action leaf)          │
                 └────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                               │ user acts
   MUTATE (up) ←  features/<y>/api  Server Action  →  revalidatePath/Tag (or React Query invalidate)
                                                               │
                                                               └→ top-of-tree re-fetches → fresh data flows back down
```

## RSC ↔ Client serialization (what may cross the boundary)

Data crossing the RSC → Client Component boundary must **serialize**. React serializes props
on this boundary using a format slightly stricter than JSON. The kit's rule: every entity
query returns a **Zod-parsed plain object** (POJO) at the boundary, and only POJO-shaped
values cross.

What survives the boundary:

- ✅ Plain objects (`{ id, status, … }`), arrays of them.
- ✅ Primitives: `string`, `number`, `boolean`, `null`, `undefined`, `bigint`.
- ✅ `Date` instances (Next.js + React serialize them — but consume on the client only via
  the props you receive; don't re-instantiate from a string-pretending-to-be-a-date).
- ✅ `Map`, `Set` (React 19 — verify your installed version supports them; the kit's safe
  default is "convert to array of entries on the server, reconstruct on the client only if
  needed").
- ✅ Promises (RSC can pass a promise as a prop; the client awaits it via `use()`).

What does NOT survive:

- ❌ **Class instances** (a Mongoose document, a Sequelize row, a Date subclass). React
  throws or silently produces `{}`. Map to a POJO before the boundary.
- ❌ **Functions**. The boundary is data-only. To pass behavior, mark the client component
  `'use client'` and define handlers there; or pass a Server Action reference (Next.js
  serializes server actions specifically as opaque tokens).
- ❌ **Cyclic references**, **`Symbol`**, custom serializers.
- ❌ **`undefined` inside arrays** in some serializers — safer to omit or use `null`.

The rule that catches every variant of this bug: **entity queries return what Zod parsed.**
Zod's output is by construction a POJO of the shape you declared; there's nothing else for
React to choke on.

```ts
// entities/employee/api/employee.api.ts — already in the kit's template; this is WHY.
export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(ENDPOINTS.LIST);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return EmployeeSchema.array().parse(await res.json());  // Zod returns POJOs only
}
```

When the entity model has a domain Date that the UI displays, convert at the entity boundary
(in `model/<model>.ts`'s `z.coerce.date()` or a `z.string().datetime()`) so the rest of the
codebase consumes the typed shape consistently.

```ts
// entities/grievance/model/grievance.ts
export const GrievanceSchema = z.object({
  id: z.string(),
  filedAt: z.string().datetime(),     // ISO string — survives boundary trivially
  // …or use z.coerce.date() if components prefer Date instances; both work.
});
```

What this means for **page → widget → feature** prop flow:

```tsx
// pages/active-grievances/ui/ActiveGrievancesPage.tsx (RSC)
import { listGrievances } from '@/entities/grievance';
import { GrievanceDashboard } from '@/widgets/grievance-dashboard';

export async function ActiveGrievancesPage() {
  const grievances = await listGrievances();   // Zod-parsed POJOs
  return <GrievanceDashboard grievances={grievances} />;   // crosses RSC→Client boundary safely
}
```

The page passes plain data down. The widget (client component) consumes it directly — no
re-fetch, no re-parse, no rehydration step beyond React's standard one.

## Entity reads — `entities/<model>/api/` (RSC-first)

```
entities/employee/
├── api/
│   ├── employee.endpoints.ts   # path constants
│   ├── employee.api.ts         # transport: fetch fns returning Zod-validated data. No React.
│   ├── employee.queries.ts     # server-only RSC read fns (getEmployee, listEmployees) — `import 'server-only';`
│   ├── employee.hooks.ts       # client React Query hooks + query keys (useEmployees, employeeKeys)
│   ├── employee.mock.ts        # mock responses for tests/stories/MSW
│   └── employee.msw.ts         # MSW handlers built from endpoints + mocks
├── model/
│   └── employee.ts             # Zod schema (source of truth) + z.infer types
├── ui/                         # read-only views: <EmployeeCard> — NO action buttons
└── index.ts                    # public API: export the types, queries/hooks, and read-only UI
```

## Feature writes — `features/<action>/api/` (the only layer that mutates)

```
features/file-grievance/
├── api/
│   └── file-grievance.action.ts   # Server Action: validate input → mutate → revalidatePath/Tag
├── model/
│   ├── schema.ts                  # Zod schema for the form payload
│   └── use-file-grievance.ts      # RHF + (optional) React Query useMutation
├── ui/
│   └── file-grievance-form.tsx    # 'use client' — the action leaf
└── index.ts                       # public API: export the form/button + the action
```

The `/scaffold-service` skill generates the read (entity) or write (feature) set, placed correctly.

## Templates

> These are **generic patterns, not real code.** Substitute your own names: `<model>` / `<action>` =
> the slice in kebab-case (the folder/file stem), `<Entity>` = the PascalCase domain type. Filenames
> in headings are the canonical kebab-case form. Cross-folder imports use the repo's real alias (Recon).

### `model/<model>.ts` — Zod is the source of truth (entity layer)

Derive TS types from schemas; validate at the boundary. **Verify Zod's current API for the installed
major version before using it** (Recon → check `package.json`): Zod's string-format helpers moved
across versions — e.g. `z.string().datetime()` (v3) became top-level `z.iso.datetime()` /
`z.iso.date()` in v4. Confirm via Context7/official docs, don't assume.

```ts
import { z } from 'zod';

export const EmployeeSchema = z.object({
  id: z.string(),
  // …domain fields…
  status: z.enum(['active', 'inactive']),
});
export type Employee = z.infer<typeof EmployeeSchema>;
```

### `api/<model>.endpoints.ts`

```ts
const BASE = '/api/<model>';
export const ENDPOINTS = {
  LIST: BASE,
  BY_ID: (id: string) => `${BASE}/${id}`,
  CREATE: BASE,
} as const;
```

### `api/<model>.api.ts` — transport only (no React, importable from server or client)

```ts
import { ENDPOINTS } from './<model>.endpoints';
import { EmployeeSchema, type Employee } from '../model/<model>';

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(ENDPOINTS.LIST);
  if (!res.ok) throw new Error(`Failed to load employees: ${res.status}`);
  return EmployeeSchema.array().parse(await res.json()); // validate at the boundary
}
```

### `api/<model>.queries.ts` — **server-only** RSC query fns (entity layer)

The page (Server Component) calls these directly. They open secrets / hit the DB / hit upstreams,
so they **must never be bundled into the client**. Declare `import 'server-only';` at the top —
Next.js will then refuse to compile if a client component pulls them in (the build error names
the offending import path). Query keys and client-side React Query hooks live in a sibling
`<model>.hooks.ts` (no `server-only`). Enforced by the PreToolUse hook
(`block-banned-patterns.sh`) — a `queries.ts` missing `'server-only'` is rejected at write time.

```ts
// entities/<model>/api/<model>.queries.ts
import 'server-only';
import { fetchEmployees } from './<model>.api';

// Server-side (RSC): call directly in a page/widget Server Component.
export const listEmployees = () => fetchEmployees();
```

### `api/<model>.hooks.ts` — client React Query hooks (entity layer)

`'use client'` lives **on this file**, not on `queries.ts`. The directive marks the module
boundary so a Server Component that imports the entity's barrel (`@/entities/<model>`) doesn't
try to evaluate `useQuery` server-side — Next.js will treat the hook as a reference to a
client-only export.

```ts
// entities/<model>/api/<model>.hooks.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from './<model>.api';

// Stable, namespaced query keys for the client cache.
export const employeeKeys = {
  all: ['<model>'] as const,
  list: () => [...employeeKeys.all, 'list'] as const,
};

// Client-side: live/interactive reads.
export const useEmployees = () =>
  useQuery({ queryKey: employeeKeys.list(), queryFn: fetchEmployees });
```

> **Why split.** `useQuery` is client-only; `'server-only'` is server-only. Keeping them in one
> file would either force the whole file into the client bundle (defeating `server-only`) or
> break the client cache hook. The split is the cheapest invariant: one file per runtime.

### `api/<action>.action.ts` — the feature's Server Action (the only place that mutates)

Server Actions run on the server and `revalidate` after writing. `'use server'` at the top is
**mandatory** — Next.js treats the missing directive as a regular module and may expose the
function as a client RPC by accident. Enforced by the PreToolUse hook.

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { CreateGrievanceSchema } from '../model/schema';
import { ENDPOINTS } from '@/entities/grievance'; // or the feature's own endpoints

export async function fileGrievance(input: unknown) {
  const data = CreateGrievanceSchema.parse(input); // validate at the boundary
  const res = await fetch(ENDPOINTS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to file grievance: ${res.status}`);
  revalidatePath('/active-grievances'); // top-of-tree re-fetches and flows fresh data down
  return EmployeeSchema; // return what the UI needs
}
```

### `api/<model>.mock.ts` + `api/<model>.msw.ts`

```ts
// <model>.mock.ts
import type { Employee } from '../model/<model>';
export const mockEmployees: Employee[] = [
  { id: '1', status: 'active' /* …domain fields… */ },
];

// <model>.msw.ts (MSW 2.x syntax — verify the installed MSW major)
import { http, HttpResponse } from 'msw';
import { ENDPOINTS } from './<model>.endpoints';
import { mockEmployees } from './<model>.mock';

export const handlers = [
  http.get(ENDPOINTS.LIST, () => HttpResponse.json(mockEmployees)),
  http.post(ENDPOINTS.CREATE, () => HttpResponse.json(mockEmployees[0], { status: 201 })),
];
```

## Forms: React Hook Form + Zod (inside the feature's `model/`)

A feature **self-contains** its form state, validation schema, and hooks — the schema does **not** go
in `shared`. Reuse the entity's schema when the form maps to a domain payload (import it from the
entity's public API). Import the schema and the action **via the slice's barrel through the repo's
real alias** — `<alias>/…` below is illustrative (Recon).

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// from the feature's own model + the entity's public schema:
import { CreateGrievanceSchema, type CreateGrievanceInput } from '../model/schema';
import { fileGrievance } from '../api/file-grievance.action';

export function FileGrievanceForm() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<CreateGrievanceInput>({ resolver: zodResolver(CreateGrievanceSchema) });

  return (
    <form onSubmit={handleSubmit((values) => fileGrievance(values))}>
      {/* fields built from shared/ui atoms/molecules; surface errors[...] as errorText */}
    </form>
  );
}
```

## Hard rules

- ❌ **No Effector** or any external server-state store.
- ❌ **Mutations outside a feature** — entities and widgets never POST/PUT/PATCH/DELETE; only features do.
- ❌ A **domain read in `shared`** — it belongs in the entity's `api/`. `shared/api` is the generic client only.
- ❌ A **form schema in `shared`** — it lives in the owning feature's `model/`.
- ❌ Components calling `fetch` directly, or importing a slice's api by deep path. Go through the slice's public API.
- ❌ Untyped responses. Validate with Zod at the api boundary.
- ❌ An `entities/<x>/api/*.queries.ts` **without `import 'server-only';`** — silent client-bundle leak. Layered: PreToolUse hook (Write), ESLint (existing code), reviewer. See `governance.md`.
- ❌ A `features/<x>/api/*.action.ts` **without `'use server';`** at the top — Next.js may expose it as a client RPC. Same layered enforcement.
- ❌ Mixing `useQuery` (client) and `import 'server-only'` (server) in the **same** file — split into `<model>.queries.ts` (server) and `<model>.hooks.ts` (client).
- ❌ Passing **class instances**, **functions**, or **cyclic references** across the RSC → Client boundary. Return Zod-parsed POJOs from entity queries; Server Actions can cross as opaque references (Next.js serializes them as tokens). See "RSC ↔ Client serialization" above.
- ✅ Reads split: server-only `getX`/`listX` in `<model>.queries.ts` (RSC) + client `useX` in `<model>.hooks.ts` (React Query); writes in feature `api/` (Server Action) that invalidate.
- ✅ Stable, namespaced query keys (`xKeys` object); one Zod schema per shape; derive types via `z.infer`.
- ✅ Reads flow down as props; writes flow up then re-fetch at the top.

## Sources

**Bundled reference snippets (cat locally — no web fetch needed):**
- `docs/external-references/react-query.md` — QueryClient setup, HydrationBoundary for RSC, key naming, useMutation+invalidate pattern, v5 vs v4 differences.
- `docs/external-references/react-hook-form.md` — the canonical Controller wiring for the kit's form primitives + zodResolver + async submit + FormProvider.
- `docs/external-references/zod.md` — v3 vs v4 API differences (z.string().datetime() → z.iso.datetime()), parse vs safeParse, env validation.
- `docs/external-references/msw-2.md` — MSW 2.x http+HttpResponse syntax (v1's rest.* is GONE), per-test handler override, setupServer + onUnhandledRequest.
- `docs/external-references/next-15-hot-spots.md` — async params/searchParams, generateMetadata + React cache(), route segment config placement.

**Library docs (for anything not bundled):**
- [FSD — Slices and segments (api / model)](https://feature-sliced.design/docs/reference/slices-segments)
- [FSD — The Ultimate Next.js App Router Architecture (entity queries, feature actions)](https://feature-sliced.design/blog/nextjs-app-router-guide)
- [Next.js — Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [TanStack Query — Query keys & invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
