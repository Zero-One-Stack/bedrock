# Rule: Cross-slice communication & event modelling

> **Non-negotiable.** When two slices must coordinate, the **default is compose-from-above**
> (`feature-sliced-design.md`): one parent owns both and wires them — synchronously, with props and
> headless feature hooks. **Events are the exception, not the default.** For the cases composition
> can't reach — one action with **many independent reactors**, reactors **not co-located** under one
> parent, or a **cross-cutting observer** (analytics/audit/telemetry) — use the kit's single sanctioned
> channel: a **typed event bus** created in `shared/lib/events/`. Both slices import *down* into
> `@/shared/lib/events`, so **no slice ever imports another slice** — import direction is preserved.
> **The bus carries transient, non-state, fire-once *facts*, never state, never commands, never
> request/response, and a missed delivery must never matter** (it has no replay). Server state stays in
> React Query; client state in React primitives. This does **not** reopen the Effector ban.

## Why this exists (the gap this closes)

FSD bans same-layer slice imports and offers four fixes — merge, push down to `entities`, compose from
above, public-API-only — **none of which is events**. The `@x` cross-import is entities-only by
decree. FSD's official position is "delegate cross-feature events to your state manager." **This kit
bans the state managers people use for that** (Effector, global server-state stores;
`services-and-data.md`). So without this rule the kit has *closed the doors FSD assumes you'll use and
opened no replacement.*

Compose-from-above (`feature-sliced-design.md`'s headless feature hooks) is the right default and
handles the common case: one widget owns two features and wires them. It breaks down in three shapes:

| Shape | Why compose-from-above fails | The case |
| --- | --- | --- |
| **Fan-out** | One action, many *independent* reactors; the parent would grow a new prop per reactor forever. | A grievance is filed → toast + analytics ping + an audit log entry. |
| **Distance** | The two features are deep in *different* subtrees; the nearest common owner is the whole app, so "compose from above" degenerates into prop-drilling or a global store (banned). | A header reacts to a mutation that happens inside a dialog three routes away. |
| **Cross-cutting observer** | A capability observes *many* features and belongs to *none* (FSD's "auth/logging/permissions don't fit a feature"). | Analytics, audit logging, session telemetry. |

For these, a **typed, downward-imported event channel** decouples publisher from subscriber without an
upward or sideways import. That is the whole rule.

## The decision rule (read this BEFORE reaching for an event)

> **An event is a scalpel.** The bus's territory is **narrow**: *transient, non-state, fire-once
> signals with many possible reactors.* Almost everything that feels like "cross-feature reactivity" is
> actually **derived state** — and derived state belongs in the **React Query cache**, which already
> broadcasts changes to every observer regardless of tree distance **and replays current state to a
> late-mounting subscriber** (the bug the bus *can't* fix — see "No replay"). Reach for an event only
> when none of the rows above it fit:

| Situation | Use | Why not the bus |
| --- | --- | --- |
| One parent owns both pieces; synchronous; a return value is needed | **Compose-from-above + headless hook** | The bus hides the dependency; a return value needs a hook. |
| Two slices read the same *state* | **Push it down to an `entity`** | State on the bus reopens the global-store ban. |
| Server data is stale after a mutation | **React Query `invalidateQueries` / `revalidateTag`** | The cache is the truth and the channel. |
| **Another slice must reflect derived state**, even cross-distance | **React Query cache** (`setQueryData` / a shared query both observe) | The cache replays to late-mounting subscribers; the bus drops events fired before mount. |
| A *small, fixed* set of cross-cutting signals | **An app-layer context** (`app/providers/*`) consumed downward | Context is tree-scoped, replays its current value, shows in React DevTools. |
| One action → **many, open-ended, independent reactors**; signal is **transient and non-state** | **Event bus** (this rule) | — |
| **Cross-cutting observer** (analytics/audit/telemetry) of many features | **Event bus** (this rule) | — |

If the answer is in any row above the event-bus rows, **stop — you don't have an event-bus case.** The
two judgment calls (event-vs-cache, event-vs-context) are owned by the reviewer agent.

### No replay — the constraint that decides what may be an event

`EventTarget.dispatchEvent` delivers **only to listeners registered at dispatch time**. There is **no
buffer and no replay.** Subscribers register in `useEffect`, which runs **only after mount on the
client.** Therefore:

> **An event a subscriber misses must not matter.** Never derive a count, a total, or any persisted
> state from "+1 per event" — a subscriber that wasn't mounted (first paint, a route away, mid-navigation)
> silently under-counts. The event is a **trigger to re-read the truth**, never the truth itself.

```tsx
// ✅ CORRECT — the event triggers a re-read; the cache is the source of truth.
'use client';
import { useEvent } from '@/shared/lib/events';
import { useQueryClient } from '@tanstack/react-query';
import { unreadGrievanceKeys } from '@/entities/grievance';

export function NotificationBadge({ count }: { count: number }) {
  const qc = useQueryClient();
  // grievance:filed is a SIGNAL — re-read the real count from the cache, don't ++ a local number.
  useEvent('grievance:filed', () => qc.invalidateQueries({ queryKey: unreadGrievanceKeys.count() }));
  return <span aria-label={`${count} unread`}>{count}</span>;
}
```

```tsx
// ❌ WRONG — teaches the hydration-race bug: a badge that was unmounted misses events and under-counts.
useEvent('grievance:filed', () => setCount((c) => c + 1));
```

## The mechanism — `shared/lib/events/`

The bus is **business-agnostic infrastructure** (it knows no domain), so it lives in `shared/lib`. See
**"Reconciling the business-terminology-in-`shared` ban"** below for why the *event vocabulary* is the
one sanctioned business-named artifact on the floor, and how payload *types* stay domain-owned.

```
shared/lib/events/
├── bus.ts          createBus() factory + the singleton (globalThis-guarded). A thin EventTarget wrapper. No React.
├── events.ts       THE CONTRACT: the central typed event map + its version + owner. POJO payloads only.
├── use-event.ts    'use client' — React subscription hook (bridges the bus into component lifecycle)
└── index.ts        public API: export { bus, createBus, type AppEvents, useEvent }
```

> **Copy-paste implementation:** the full, ready-to-use code (factory + MF-safe singleton, async
> error-isolated dispatch, the `useEvent` hook, the analytics bridge, the `BroadcastChannel` cross-tab
> adapter, and the test seam) is bundled at `docs/external-references/event-bus.md` — `cat` it instead
> of re-deriving. The snippets below are the abridged version.

### The contract — a central typed event map (`events.ts`)

```ts
// shared/lib/events/events.ts — the ONE place every cross-slice event is declared.
// Owner: @platform-architecture (CODEOWNERS). Version: bump on any breaking payload change.
// Payload TYPES reference the owning entity's public API so domain types stay slice-owned —
// only the event NAME vocabulary is central. Payloads are POJOs (RSC-serialization discipline).
import type { GrievanceId } from '@/entities/grievance';
import type { EmployeeId } from '@/entities/employee';

/** @contract-version 1 — see contracts-and-versioning.md for the expand→migrate→contract path. */
export interface AppEvents {
  'grievance:filed':    { grievanceId: GrievanceId; employeeId: EmployeeId };
  'grievance:resolved': { grievanceId: GrievanceId };
  // ❌ NOT 'dialog:open' — that's a command. Commands are hook calls (compose-from-above).
  // ❌ NOT 'session:expired' — that's CROSS-TAB. The bus is single-realm; see "Single-realm" below.
}
export type AppEventName = keyof AppEvents;
```

Adding or changing an event is a **reviewed contract change**, not an ad-hoc string — see
**"The event map is a versioned, owned contract"**.

### The bus (`bus.ts`) — typed, MF-safe singleton, test-isolatable, error-isolated

```ts
// shared/lib/events/bus.ts — framework-agnostic. No React.
import type { AppEvents, AppEventName } from './events';
import { captureException } from '@/shared/lib/observability';

type Handler<E extends AppEventName> = (payload: AppEvents[E]) => void;

export interface Bus {
  emit<E extends AppEventName>(name: E, payload: AppEvents[E]): void;
  on<E extends AppEventName>(name: E, handler: Handler<E>): () => void;
  clear(): void; // test seam only
}

/** Factory — call in tests for an isolated bus; production uses the guarded singleton below. */
export function createBus(): Bus {
  const target = new EventTarget();
  return {
    emit(name, payload) {
      // Async dispatch: decouple from the caller's stack, prevent synchronous re-entrant cascades.
      queueMicrotask(() => target.dispatchEvent(new CustomEvent(name, { detail: payload })));
    },
    on(name, handler) {
      const listener = (e: Event) => {
        // Per-handler isolation: one throwing subscriber must NOT break the others (mitt would).
        try { handler((e as CustomEvent).detail); }
        catch (err) { captureException(err, { tags: { busEvent: name } }); }
      };
      target.addEventListener(name, listener);
      return () => target.removeEventListener(name, listener);
    },
    clear() { /* EventTarget has no removeAll; createBus() per test gives a clean instance instead. */ },
  };
}

// MF / multi-root safety: one instance across every bundle that shares this module. A plain
// module-level `new` gives ONE bus PER BUNDLE — under Module Federation a publisher in remote A
// would be invisible to a subscriber in remote B. The globalThis guard collapses them to one.
// (Also mark @/shared/lib/events `singleton: true` in the MF/workspace config — monorepo-architecture.md.)
const KEY = Symbol.for('bedrock.app-bus');
type G = typeof globalThis & { [KEY]?: Bus };
export const bus: Bus = ((globalThis as G)[KEY] ??= createBus());
```

> **Why `mitt` is NOT a drop-in.** `mitt` iterates a handler array; **a throw in one handler aborts the
> rest**, and it dispatches synchronously. EventTarget + the try/catch above gives **per-handler error
> isolation** and the microtask hop gives **non-re-entrant dispatch**. If you swap the implementation,
> preserve both guarantees — they are part of the contract, not incidental.

### The React bridge (`use-event.ts`)

```ts
// shared/lib/events/use-event.ts
'use client';
import { useEffect, useRef } from 'react';
import { bus } from './bus';
import type { AppEvents, AppEventName } from './events';

/** Subscribe for the component's lifetime. Handler kept fresh via ref so the subscription isn't
 *  torn down each render. StrictMode double-invokes the effect; subscribe→unsubscribe→subscribe is
 *  balanced, so no leak and no double-fire. */
export function useEvent<E extends AppEventName>(
  name: E,
  handler: (payload: AppEvents[E]) => void,
): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => bus.on(name, (p) => ref.current(p)), [name]);
}
```

### Server vs. client (the RSC reality)

The bus is a **client-runtime** channel (`EventTarget` + React subscribers). So:

- **Publish from the client**, on a mutation's `onSuccess` — **not** from inside a `'use server'` action
  (the server has no client bus). Never emit from render or a mount effect (StrictMode double-fires
  those; emit from event handlers / `onSuccess`).
- **Server→client data changes go through React Query / `revalidateTag`** — the bus is **not** a
  cache-invalidation mechanism. Emit a bus event only for *additional, non-data* reactions (analytics,
  audit, a toast).
- **Never put server-derived data on the bus as truth.** The event says *"a grievance was filed"*; the
  reactor re-reads counts from the entity cache. Signal, not truth.

### Single-realm — the bus does NOT cross tabs, workers, or iframes

`EventTarget` is single-realm: one JS context. Cross-**tab** ("log out everywhere"), cross-**worker**,
and cross-**iframe** are **out of scope** for the bus. The canonical cross-tab case is
**`session:expired`** — log out in one tab, all tabs follow — which needs **`BroadcastChannel`**, not
the bus. If you need cross-realm delivery, build a small documented adapter in `shared/lib/` that
mirrors specific events onto a `BroadcastChannel`; do not pretend the in-page bus delivers them.

## Reconciling the business-terminology-in-`shared` ban

`CLAUDE.md` and `feature-sliced-design.md` hard-ban **business terminology in `shared`** (domain types
go in the owning entity, crossed via `@x`). The event map names domains (`grievance:filed`). This is a
**deliberate, single, logged carve-out**, justified and bounded:

- **The transport is generic; the vocabulary is the contract.** Like `shared/api` is a generic client
  while the *contract* it carries is domain-shaped. (Note: this kit puts domain *endpoints* in the
  entity's `api/`, not in `shared` — so we go further than the analogy:)
- **Payload TYPES stay domain-owned.** `events.ts` imports `GrievanceId`/`EmployeeId` from the owning
  entity's public API. Only the **event-name strings** are central. No business *type* is defined in
  `shared`.
- **It's logged as an approved deviation.** Record it once in `project-specifics.md`'s *Approved
  overrides* per `CLAUDE.md`'s constitution-wins-unless-logged mechanism: "the central `AppEvents` name
  map is the one sanctioned business-named artifact in `shared/lib/events`; payload types remain
  entity-owned."

If a team rejects the carve-out, the fallback is an **app-layer mediator** (an instance created in
`app/providers` and provided via context) — domain naming then lives at `app/`, not `shared/`. Trade-off:
non-React publishers (analytics init) can't reach a context-provided instance, so the floor-level
guarded singleton is the kit's default and the app-mediator is the documented alternative.

## The event map is a versioned, owned contract

The `AppEvents` map is a textbook cross-team edge (independently-owned publishers and subscribers
depend on its shape) — so it is governed exactly like every other contract in
`contracts-and-versioning.md`:

- **Owner:** a stewarding team in `CODEOWNERS` on `shared/lib/events/events.ts` (e.g.
  `@platform-architecture`). This also manages the single-file merge-bottleneck — additions are
  reviewed, deliberate contract changes.
- **Version + evolution:** an additive field is safe; a **new required field or a renamed/removed event
  is breaking** and follows **expand → migrate → contract** (add the new shape alongside the old →
  migrate every subscriber → remove the old). This matters under Module Federation, where a publisher
  on a new bundle and a subscriber on an old one coexist for minutes-to-days.
- **The map is the only coupling point** — never emit an off-contract string; never reach around it.

## Observability — events must be traceable

Invisible data flow is the #1 event-bus criticism; answer it with tooling, not doctrine:

- **Dev-mode logger.** In development, log every `emit` (name, payload, delivered-listener count) so
  "who fired this / who heard it" is answerable without a debugger.
- **Breadcrumb on emit.** Add a breadcrumb/span (`shared/lib/observability`) so a fired event appears
  in Sentry/OTel context around an error — see `observability.md`.
- **Subscriber errors are captured**, not swallowed — the `createBus` try/catch routes to
  `captureException` (above), never just `window.onerror`.

### Analytics as a first-class consumer (the headline cross-cutting case)

The analytics subscriber is a **cross-cutting observer** — it belongs to no feature. Wire it **once at
the app layer**, not per-render, and tear it down on HMR:

```ts
// src/app/providers/analytics-bridge.ts — registered once at app init, NOT in a component render.
'use client';
import { bus } from '@/shared/lib/events';
import { track } from '@/shared/lib/observability';     // PII-free tracker (observability.md)

let unsubscribers: Array<() => void> = [];
export function startAnalyticsBridge() {
  stopAnalyticsBridge();                                 // HMR-safe: never double-subscribe
  unsubscribers = [
    bus.on('grievance:filed', ({ grievanceId }) => track('grievance_filed', { grievanceId })),
  ];
}
export function stopAnalyticsBridge() {
  unsubscribers.forEach((off) => off());
  unsubscribers = [];
}
```

> **Non-React subscribers own their unsubscribe.** Any non-component code that calls `bus.on`
> (analytics, a service-worker bridge) must register **once** at app init and dispose on teardown/HMR —
> a leaked module-level subscriber lives for the app's lifetime and duplicates on hot reload.

## Testing

A rule that ships a runtime channel must show how to test it. The `createBus()` factory is the seam —
**use a fresh bus per test**, never the shared singleton, so tests don't leak listeners into each other.

```ts
// Publisher in isolation:
import { createBus } from '@/shared/lib/events';
test('files a grievance and announces it', () => {
  const bus = createBus();
  const seen: unknown[] = [];
  bus.on('grievance:filed', (p) => seen.push(p));
  fileGrievance(bus, { /* … */ });                       // pass the bus in (DI) for the test
  return vi.waitFor(() => expect(seen).toHaveLength(1)); // emit is async (microtask) — await it
});

// Subscriber (component) in isolation — Testing Library + a fresh bus, emit in act():
// render(<NotificationBadge count={0} />); await act(async () => bus.emit('grievance:filed', payload));
// then assert the invalidate/refetch fired.
```

> **`emit` is asynchronous** (microtask hop). Tests must `await`/`waitFor` after emitting — a
> synchronous assertion runs before delivery. This is also why a subscriber can't synchronously block
> the publisher.

## Hard guard-rails

- ❌ **State on the bus.** No "current value" reads, no replaying the last event as state, no derived
  counts. Server state = React Query; client state = React primitives. (Keeps the Effector/global-store
  ban meaningful.)
- ❌ **Modeling an event whose miss matters.** No replay — an unmounted subscriber misses it. Events
  trigger a re-read of the truth; they are not the truth.
- ❌ **Commands on the bus.** Past-tense facts (`grievance:filed`), never imperatives (`openDialog`,
  `refetchList`). An imperative across slices is a **hook call composed from above**.
- ❌ **Request/response on the bus.** Fire-and-forget only. A return value means a hook.
- ❌ **Synchronous emit from inside a handler** (cascade/re-entrancy). If a reaction must emit another
  event, reconsider compose-from-above; the bus gives no ordering guarantee (delivery is registration =
  mount order, non-deterministic across a tree).
- ❌ **Cross-tab/worker/iframe on the in-page bus** — single-realm; use `BroadcastChannel` + a
  documented adapter.
- ❌ **Off-contract string events** — every name exists in `AppEvents`; TS enforces it.
- ❌ **Publish/subscribe outside `@/shared/lib/events`** — no slice ships its own emitter; one bus per
  repo (or one app-mediator). No slice-to-slice event wiring.
- ❌ **Using the bus to dodge a legitimate compose-from-above** — if one parent owns both, wire with a
  hook + props; the reviewer rejects bus-as-back-channel.
- ❌ **Non-POJO payloads** — no class instances, functions, or live references (RSC-boundary discipline).
- ❌ **A business *type* defined in `shared`** — payload types import from the owning entity; only the
  name vocabulary is central, logged as an approved override.
- ✅ Events are typed past-tense facts in the versioned, owned `AppEvents` map; publisher and subscriber
  import **down** into `shared/lib/events`; the bus carries signals, the cache/state carries truth;
  subscriptions clean up; emits are traced; the singleton is MF-safe and test-isolatable.

## Enforcement (layered — matches `governance.md`'s matrix)

| Rule | Hook (write-time) | ESLint | Steiger/dep-cruiser (CI) | Reviewer |
| --- | --- | --- | --- | --- |
| Deep import past `@/shared/lib/events` index | ✓ | ✓ `bedrock/no-deep-slice-import` | ✓ (`fsd/no-public-api-sidestep`) | ✓ |
| `EventTarget`/`mitt`/`new EventBus` outside `shared/lib/events` (a slice's own emitter) | — | ✓ `bedrock/events-only-from-shared` | ✓ (no event-lib import outside `shared/lib/events`) | ✓ |
| Off-contract string event name / wrong payload | — | ✓ (typecheck — `emit`/`on` generic over `AppEventName`) | — | ✓ |
| Event used where the cache / compose-from-above / context would do | — | — | — | ✓ (judgment) |
| Command / state / request-response on the bus | — | — | — | ✓ (judgment) |
| `AppEvents` map missing CODEOWNERS / version | — | — | ✓ (CODEOWNERS lint + fitness grep) | ✓ |

The strongest single enforcer is **TypeScript**: `emit`/`on` are generic over `keyof AppEvents`, so an
off-contract name or wrong payload **doesn't compile**. The reviewer owns the judgment calls.

## Checklist — a cross-slice link is "done" when

- [ ] You asked, in order: **one parent owns both?** → compose-from-above. **Shared state?** → entity /
      cache. **Server staleness?** → React Query invalidate. **Derived state another slice reflects,
      even cross-distance?** → the cache (it replays; the bus doesn't). **Small fixed signal set?** →
      app-layer context. Only past all of those → an event.
- [ ] The event is a **past-tense fact** in the versioned `AppEvents` map; **a miss doesn't matter**
      (it triggers a re-read, isn't the truth).
- [ ] Payload is a POJO; payload **types import from the owning entity**; only the name is central.
- [ ] Publisher and subscriber import **only** `@/shared/lib/events`; the map has a CODEOWNERS owner +
      version; the override is logged in `project-specifics.md`.
- [ ] It's **not cross-tab/worker** (or it uses a `BroadcastChannel` adapter); the singleton is
      `globalThis`/MF-guarded; emit is on the client (`onSuccess`), traced in dev.
- [ ] Tests use a **fresh `createBus()`** and `await` the async emit; non-React subscribers register
      once at app init and dispose on HMR.

## Sources
- [FSD — Cross-imports (the four sanctioned fixes; events are not one)](https://feature-sliced.design/docs/guides/issues/cross-imports)
- [FSD — Public API & `@x` (entities-only)](https://feature-sliced.design/docs/reference/public-api)
- [FSD — Redux architecture 2025 (actions-as-events; store-as-coordinator)](https://feature-sliced.design/blog/redux-architecture-2025)
- [MDN — EventTarget.dispatchEvent (synchronous delivery; no replay)](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)
- [MDN — BroadcastChannel (cross-tab)](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- Companion investigation: `../../INVESTIGATION-fsd-features-and-events.md` (community concerns + sources)
- Pairs with: `feature-sliced-design.md` (compose-from-above + headless hooks), `services-and-data.md` (state boundaries / the cache as channel), `contracts-and-versioning.md` (the event map as a versioned edge), `monorepo-architecture.md` (MF shared singleton), `observability.md` (tracing + PII-free analytics), `governance.md` (enforcement matrix).
