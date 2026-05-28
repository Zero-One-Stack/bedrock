---
name: scaffold-service
description: Scaffold a new data layer following this kit's Feature-Sliced Design segments — an ENTITY READ side (entities/<model>/api + model) for queries, and/or a FEATURE WRITE side (features/<action>/api + model) for Server-Action mutations: endpoints, Zod schemas/types, transport api functions, a server-only <model>.queries.ts for RSC reads, a client <model>.hooks.ts for React Query, the Server Action ('use server'), mock fixtures, and MSW handlers. Use when the user says "add a service", "wire up an API", "create data hooks for X", or needs to connect a component to remote data. Enforces React Query for server state and bans Effector.
---

# Scaffold Service

Generate a new data layer matching the kit's FSD data contract. In FSD a "service" is **not one
folder** — it splits by direction: **reads (queries)** belong to the **entity** that owns the model
(`entities/<model>/api/` + `model/`), and **writes (mutations)** belong to the **feature** that
performs the action (`features/<action>/api/` + `model/`). Only features mutate. **Do Step 0 Recon
first** (`.claude/CLAUDE.md`) and **read `.claude/rules/feature-sliced-design.md` +
`.claude/rules/services-and-data.md`** — confirm the repo's import alias, package-manager scripts,
the installed Zod/MSW majors, and which side(s) you're scaffolding (entity read, feature write, or
both) before generating. There is **no top-level `services/` bucket**; `shared/api` is only the
generic fetch client. All file/identifier names below are generic patterns — substitute the real
slice name.

## Inputs to determine

1. **Direction** — is this a **read** (a query for a domain model → entity side), a **write**
   (a mutation/Server Action → feature side), or **both**? This picks the placement below.
2. **Names** — entity = **singular noun** in `kebab-case` (`<model>`, e.g. `employee`); feature =
   **action phrase** in `kebab-case` (`<action>`, e.g. `file-grievance`). PascalCase domain type `<Entity>`.
3. **Placement** — reads → `entities/<model>/api/` + schema/types in `entities/<model>/model/`;
   writes → `features/<action>/api/` + form schema/hooks in `features/<action>/model/`.
4. **Endpoints** and methods (GET reads; POST/PATCH/DELETE writes) and their request/response shapes.
5. The base URL / fetch client the repo already uses (the generic one lives in `shared/api`).

## Steps

Scaffold the side(s) you need, with **kebab-case files throughout** (no camelCase filenames).

### A. Entity READ side — `entities/<model>/` (queries; no mutations)

1. `model/<model>.ts` — **Zod schema as the source of truth**; derive types with `z.infer`.
   Reuse this schema in any form that maps to the payload. (Verify Zod's API for the installed
   major — string-format helpers differ between v3 and v4.)
2. `api/<model>.endpoints.ts` — path constants (`const … = { LIST, BY_ID: (id) => … } as const`).
3. `api/<model>.api.ts` — transport functions only (no React). Each validates the response with
   the Zod schema at the boundary; throws on non-ok responses.
4. `api/<model>.queries.ts` — **server-only** RSC read fns (`getX`/`listX`, called directly in
   page/widget Server Components). First import is `import 'server-only';` — the PreToolUse hook
   blocks writes without it (prevents client-bundle leaks of secrets/DB calls).
5. `api/<model>.hooks.ts` — client React Query hooks (`useX`) and stable namespaced query keys
   (`<entity>Keys` object). Split from `queries.ts` because `useQuery` is client-only and would
   defeat `server-only` if co-located.
6. `api/<model>.mock.ts` — typed mock responses.
7. `api/<model>.msw.ts` — MSW handlers built from endpoints + mocks (verify the installed MSW
   major; 2.x uses `http` / `HttpResponse.json`).
8. `api/<model>.api.spec.ts` (or `.test.ts` — match the repo) — transport-layer tests
   (success + error + validation), using the repo's test runner (`vi.*` on Vitest).
9. `index.ts` — the entity's public API: re-export the types, the server-only `getX`/`listX` from
   `queries.ts`, the client `useX` + key object from `hooks.ts`, and read-only UI
   (public API only — never `export *`).

### B. Feature WRITE side — `features/<action>/` (the only place that mutates)

1. `model/schema.ts` — Zod schema for the form/mutation payload (reuse the entity's schema when the
   write maps to a domain payload, imported via the entity's public API).
2. `model/use-<action>.ts` — RHF + (optional) React Query `useMutation` that invalidates the
   affected entity query keys on success.
3. `api/<action>.action.ts` — the **Server Action** (`'use server'`): validate input with Zod →
   mutate → `revalidatePath`/`revalidateTag` so the top-of-tree re-fetches.
4. `api/<action>.api.spec.ts` (or `.test.ts`) — action/transport tests (success + error + validation).
5. `index.ts` — the feature's public API: re-export the form/button UI + the action (public API only).

Consumers import each slice **through its `index.ts` public API** via the repo's alias — never a
deep `api/`/`model/` path.

## Hard rules

- ❌ **No Effector** or any external server-state store.
- ❌ **Mutations outside a feature** — entities and widgets never POST/PUT/PATCH/DELETE; only features do.
- ❌ A **domain read in `shared`** — it belongs in the entity's `api/`. `shared/api` is the generic client only.
- ❌ No `fetch` in components, and no importing a slice's `api/`/`model/` by deep path — go through
  the slice's `index.ts` public API.
- ✅ Validate every response/payload with Zod at the boundary; never trust untyped JSON.
- ✅ Namespaced, stable query keys; mutations `revalidatePath`/`revalidateTag` (or invalidate the
  affected query keys).

## Done when

All files exist with kebab-case names in the correct slice (entity `api/`+`model/` for reads,
feature `api/`+`model/` for writes), types derive from Zod, the queries.ts begins with
`import 'server-only';`, the hooks.ts begins with `'use client';`, the action.ts begins with
`'use server';`, all three plus the read-only UI are exported from the slice's `index.ts` public
API, and `/verify-build` passes (compiles, api spec green, Steiger + dependency-cruiser clean,
lint/format clean) using the repo's actual scripts. Report the file list and the
queries/hooks/action names components should import via the slice's public API.
