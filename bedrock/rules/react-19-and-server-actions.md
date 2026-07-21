# Rule: React 19 & the Server Action security boundary

> **Non-negotiable.** A Server Action is a **public HTTP endpoint** — it re-verifies
> authentication *and* authorization inside the action body, every time, no exceptions. On the
> client, form mutations use the **React 19 action hooks** (`useActionState`, `useOptimistic`,
> `useFormStatus`) rather than hand-rolled `isLoading`/`error` `useState` triplets. Server reads
> go through a **Data Access Layer** that owns the authorization check, so "who may see this"
> is answered in one place instead of re-derived per caller.

## Why this exists

`services-and-data.md` establishes *where* data code lives (entity `api/` reads, feature `api/`
writes) and `security.md` covers client-side risk (XSS, secrets, deps). Neither covers the two
things that actually break Next.js apps in production:

1. **Server Actions are silently public.** A page-level auth check does **not** protect the
   actions defined on that page. Next.js's own guidance is explicit: *"Page-level authentication
   checks do not automatically extend to Server Actions defined within that page… the action
   serves as a separate entry point that must independently confirm the caller's permissions."*
   An action is reachable by anyone who can POST to the route — the closure it was defined in is
   not a security boundary.
2. **React 19 shipped a first-class mutation model** (`useActionState`, `useOptimistic`,
   `useFormStatus`, `use()`, ref-as-prop) that replaces the manual pending/error state most
   codebases still hand-roll. Without a rule, half the app uses the new model and half doesn't.

This rule is the depth behind both. It assumes React 19+ and Next.js 15+ — **verify the installed
majors in Step 0 Recon** (`package.json`); on older majors the hooks below don't exist and the
`forwardRef` guidance inverts.

---

## Part 1 — The Server Action security contract

### The four checks, in order, in every action

```ts
// features/file-grievance/api/file-grievance.action.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/entities/session';          // 2. authenticate
import { getAccessibleGrievance } from '@/entities/grievance'; // 3. authorize
import { db } from '@/shared/lib/db';

const Input = z.object({ grievanceId: z.string().min(1), note: z.string().max(2_000) });

export async function addGrievanceNote(input: unknown): Promise<{ ok: true }> {
  // 1. VALIDATE — the caller controls this payload entirely. Never trust its shape.
  const data = Input.parse(input);

  // 2. AUTHENTICATE — who is calling? Re-checked here, not inherited from the page.
  const user = await requireUser();

  // 3. AUTHORIZE — may THIS user act on THIS resource? Ownership, not just identity.
  const grievance = await getAccessibleGrievance(user, data.grievanceId);
  if (!grievance) throw new Error('Not found');   // 404-shaped: don't leak existence

  // 4. MUTATE, then invalidate so the read tree re-fetches.
  await db.grievanceNote.create({ data: { grievanceId: grievance.id, note: data.note } });
  revalidatePath(`/grievances/${grievance.id}`);
  return { ok: true };
}
```

**Every one of the four is mandatory.** The most common real-world failure is shipping 1, 2, 4
and skipping **3** — an authenticated user acting on someone else's resource (IDOR). Identity is
not authorization.

### Authorization is per-resource, not per-route

```ts
// ❌ WRONG — authenticated, but any logged-in user can delete ANY project.
export async function deleteProject(id: string) {
  'use server';
  await requireUser();                    // knows WHO, never checks WHETHER
  await db.project.delete({ where: { id } });
}

// ✅ RIGHT — the ownership check is part of the query, so it cannot be forgotten.
export async function deleteProject(id: string) {
  'use server';
  const user = await requireUser();
  const project = await getAccessibleProject(user, id);   // scoped read
  if (!project) throw new Error('Not found');
  await db.project.delete({ where: { id: project.id } });
}
```

Prefer **scoping the query** (`where: { id, ownerId: user.id }`) over a separate `if` — a filter
that's part of the read can't be bypassed by a later refactor that drops the guard.

### The closure is not a boundary

Arguments bound into an inline action's closure are **serialized to the client and sent back**.
They are encrypted by Next.js, but they are still caller-influenced round-trip data, and anything
you *read from the request* is fully attacker-controlled.

```tsx
// ⚠️ The `role` here rides to the client and back. NEVER branch on it for authorization.
export default async function Page() {
  const { role } = await getSession();
  async function promote(formData: FormData) {
    'use server';
    if (role === 'admin') { /* ❌ trusting a closed-over value */ }
    // ✅ re-read the role from the session INSIDE the action instead.
  }
}
```

Rule: **re-read identity and permissions from the session/DB inside the action.** Treat every
closed-over value as untrusted input.

### The Data Access Layer (DAL)

Authorization belongs next to the data, not scattered across callers. Centralize it so each
resource has exactly one "can this user see it" answer:

```ts
// entities/project/api/project.queries.ts
import 'server-only';                          // hard-fails the build if it reaches the client
import { cache } from 'react';

/** The ONLY sanctioned way to read a project. Access scoping is inside the query. */
export const getAccessibleProject = cache(async (user: SessionUser, id: string) => {
  return db.project.findFirst({
    where: { id, OR: [{ ownerId: user.id }, { team: { members: { some: { userId: user.id } } } }] },
  });
});
```

- `import 'server-only'` on every module that touches secrets/DB — already a hard ban in
  `services-and-data.md`; the DAL is where it matters most.
- Wrap in React `cache()` so `generateMetadata` + the page don't double-query.
- **Never** export a raw unscoped `findMany` from an entity's public API; a caller who forgets the
  filter creates the leak.

### Rate-limit and audit the expensive ones

Actions that send email, call a paid API, or run a job are DoS and cost surfaces — rate-limit by
user/IP and log the attempt (`observability.md`, PII-free). Cheap reads don't need it; anything
that spends money or writes to a third party does.

---

## Part 2 — React 19 on the client

### `useActionState` replaces the pending/error triplet

```tsx
'use client';
import { useActionState } from 'react';
import { addGrievanceNote } from '../api/file-grievance.action';

type State = { error?: string };

export function NoteForm({ grievanceId }: { grievanceId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      try {
        await addGrievanceNote({ grievanceId, note: formData.get('note') });
        return {};
      } catch {
        return { error: 'Could not save the note.' };   // never leak the raw server error
      }
    },
    {},
  );

  return (
    <form action={formAction}>
      <textarea name="note" required aria-invalid={!!state.error} />
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
```

Why it beats the hand-rolled version: the pending flag is **managed by React** (no stale
`finally` bug), submissions are queued rather than raced, and the `<form action>` form works
**before hydration** — progressive enhancement for free.

> ❌ Don't pair `useActionState` with a `useState` mirror of the same value — one source of truth.
> ❌ Don't return a raw `Error`/exception object as state; it isn't reliably serializable and
> leaks internals. Return a plain, user-safe shape.

### `useOptimistic` for instant feedback

```tsx
'use client';
import { useOptimistic, startTransition } from 'react';

export function NoteList({ notes, onAdd }: { notes: Note[]; onAdd: (t: string) => Promise<void> }) {
  const [optimisticNotes, addOptimistic] = useOptimistic(
    notes,
    (state, pending: string) => [...state, { id: 'pending', text: pending, sending: true }],
  );

  async function submit(formData: FormData) {
    const text = String(formData.get('note'));
    startTransition(() => addOptimistic(text));   // optimistic updates need a transition
    await onAdd(text);                            // real state arrives via the server re-render
  }
  return <form action={submit}>{/* render optimisticNotes */}</form>;
}
```

The optimistic value **auto-reverts** when the action settles and the real data arrives — you
never manually roll back. Requirements: the update must run inside an action or
`startTransition`, and the base value must be the real server state (not a local mirror).

### `useFormStatus` — pending state for a nested submit button

Reads the status of the **nearest parent `<form>`**, so a shared `<SubmitButton>` needs no props:

```tsx
'use client';
import { useFormStatus } from 'react-dom';   // NOTE: react-dom, not react

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Working…' : children}</button>;
}
```

❌ It returns `pending: false` if called in the **same** component that renders the `<form>` — it
must be in a child. That's the single most common misuse.

### `ref` is a prop — `forwardRef` is legacy

React 19 passes `ref` as an ordinary prop to function components. New components take it
directly:

```tsx
// ✅ React 19
export function Input({ ref, ...props }: React.ComponentProps<'input'>) {
  return <input ref={ref} {...props} />;
}
// ❌ Don't add new forwardRef wrappers — deprecated, and a codemod exists for the old ones.
```

Existing `forwardRef` components keep working; don't churn them without reason. **New** ones use
the prop.

### `use()` for reading a promise or context conditionally

`use()` unwraps a promise (suspending until it resolves) and — unlike a hook — may be called
inside a condition or loop. The canonical pattern is a Server Component starting the fetch and a
Client Component awaiting it, so the request begins before the client bundle loads:

```tsx
// Server Component — start the fetch, DON'T await; pass the promise down.
export default function Page() {
  return <Suspense fallback={<Skeleton />}><Comments promise={getComments()} /></Suspense>;
}
// Client Component
'use client';
import { use } from 'react';
export function Comments({ promise }: { promise: Promise<Comment[]> }) {
  const comments = use(promise);   // suspends here; Suspense boundary above is REQUIRED
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

❌ `use()` without an enclosing `<Suspense>` throws to the nearest error boundary.
❌ Never create the promise *during render of the consuming client component* — it makes a new
promise every render and loops forever. Create it in the Server Component (or memoize it).

### React Compiler — earn your memoization

Where the React Compiler is enabled, it auto-memoizes; hand-written `useMemo`/`useCallback`/
`React.memo` become noise. Where it isn't, memoize only what a profiler showed to be hot. Either
way: **no reflexive `useMemo` on every derived value.** Record whether the compiler is on in
`project-specifics.md`.

---

## Part 3 — Next.js specifics this kit pins

- **`params` / `searchParams` / `cookies()` / `headers()` / `draftMode()` are async** (Next 15+).
  Always `await` them. A sync read is a build-time type error.
- **`middleware.ts` → `proxy.ts` in Next 16.** Shipping both breaks the build. Same composition
  rule as before (`shared/lib/middleware`, imports only from `shared/`).
- **Default to the Node.js runtime.** Edge is opt-in for a measured latency reason, not a default.
- **`'use cache'`** (Cache Components) requires `cacheComponents: true` in `next.config.ts`. Pair
  with `cacheLife`/`cacheTag`; a cached function must not read auth-scoped data unless the
  identity is part of the cache key — otherwise one user's data is served to another.
- **Route Handlers vs Server Actions** — mutations from your own UI use Server Actions; webhooks,
  OAuth callbacks, public/3rd-party APIs, and cacheable GETs use Route Handlers
  (`nextjs-app-router-fsd.md`).

---

## Hard rules

- ❌ A Server Action that **doesn't re-check authentication AND authorization** in its own body.
  Page/layout/middleware checks do **not** protect it.
- ❌ Authorization by **identity alone** (`requireUser()` then mutate by id) — check that the user
  may act on *that resource*. Prefer scoping the query.
- ❌ **Trusting a closed-over value** (role, tenant, price) for an authorization decision — re-read
  it inside the action.
- ❌ An **unvalidated** Server Action payload — Zod-parse before any other use.
- ❌ Returning a raw exception/`Error` from an action to the client (leaks internals, unreliable
  serialization). Return a user-safe shape.
- ❌ An **unscoped** read exported from an entity's public API, or a DAL module missing
  `import 'server-only'`.
- ❌ Hand-rolled `useState` pending/error triplets for form mutations where `useActionState` fits.
- ❌ `useFormStatus` in the same component that renders the `<form>` (always `false` there).
- ❌ `useOptimistic` updated outside an action/`startTransition`, or a manual rollback.
- ❌ `use(promise)` with no `<Suspense>` above it, or a promise created during the consuming
  client component's render.
- ❌ **New** `forwardRef` components on React 19 (`ref` is a prop).
- ❌ Reflexive `useMemo`/`useCallback` with no profile and no compiler rationale.
- ❌ Un-awaited `params`/`searchParams`/`cookies()`/`headers()` on Next 15+; `middleware.ts`
  alongside `proxy.ts` on Next 16.
- ✅ Validate → authenticate → authorize → mutate → revalidate, in that order, in every action.
- ✅ Authorization lives in a `server-only`, `cache()`-wrapped DAL; scoping is inside the query.
- ✅ Client mutations use the React 19 action hooks; optimistic state reverts by itself.

## Checklist — a mutation is "done" when

- [ ] The action Zod-validates its input before anything else.
- [ ] It calls the session helper itself — it does not inherit a page check.
- [ ] It verifies the caller may act on **that specific resource** (scoped query preferred).
- [ ] No authorization decision reads a closed-over value.
- [ ] It revalidates (`revalidatePath`/`revalidateTag`) or invalidates the query cache.
- [ ] Errors returned to the client are user-safe; the raw error is captured server-side.
- [ ] Expensive/outbound actions are rate-limited and audit-logged (PII-free).
- [ ] The form uses `useActionState` (+ `useOptimistic` where instant feedback matters).
- [ ] The DAL module has `import 'server-only'` and is `cache()`-wrapped.

## Sources
- [Next.js — Authentication guide (Server Actions as public endpoints)](https://nextjs.org/docs/app/guides/authentication)
- [Next.js — Data security & the Data Access Layer](https://nextjs.org/docs/app/guides/data-security)
- [Next.js — Production checklist (verify authz in each action; DAL; rate limiting)](https://nextjs.org/docs/app/guides/production-checklist)
- [React — `useActionState`](https://react.dev/reference/react/useActionState)
- [React — `useOptimistic`](https://react.dev/reference/react/useOptimistic)
- [React — `useFormStatus`](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [React — `use`](https://react.dev/reference/react/use)
- [React 19 release notes (ref as a prop; `forwardRef` deprecation)](https://react.dev/blog/2024/12/05/react-19)
- [Next.js — `use cache` directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
