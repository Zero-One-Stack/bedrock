# Rule: Cross-slice communication & event modelling

> **Non-negotiable.** When two slices must coordinate, the **default is compose-from-above**
> (`feature-sliced-design.md`): one parent owns both and wires them — synchronously, with props and
> headless feature hooks. **Events are the exception, not the default.** For the cases composition
> can't reach — one action with **many independent reactors**, reactors **not co-located** under one
> parent, or a **cross-cutting observer** (analytics/audit/telemetry) — use the kit's single sanctioned
> channel: a **typed event bus that lives on the `shared` floor** (`shared/lib/events/`). Events flow
> *through the floor*, so **no slice ever imports another slice** — import direction is preserved.
> **The bus carries events (facts), never state, never commands, never request/response.** Server
> state stays in React Query; client state in React primitives. This does not reopen the Effector ban.

## Why this exists (the gap this closes)

FSD bans same-layer slice imports and offers four fixes — merge, push down to `entities`, compose from
above, public-API-only — **none of which is events**. The `@x` cross-import is entities-only by
decree. FSD's official position is "delegate cross-feature events to your state manager." **This kit
bans the state managers people use for that** (Effector, global server-state stores;
`services-and-data.md`). So without this rule the kit has *closed the doors FSD assumes you'll use and
opened no replacement.*

Compose-from-above (`feature-sliced-design.md`'s headless feature hooks) is the right default and
handles the common case: one widget owns two features and wires them. But it breaks down in three
shapes that are real and recurring:

| Shape | Why compose-from-above fails | The case |
| --- | --- | --- |
| **Fan-out** | One action, many *independent* reactors; the parent would have to know all of them and grow a new prop per reactor forever. | A grievance is filed → toast + analytics event + unsaved-changes-guard reset + a list cache warm. |
| **Distance** | The two features are deep in *different* subtrees; the nearest common owner is the whole app, so "compose from above" degenerates into drilling props through many layers or a global store (banned). | A header notification badge must react to a mutation that happens inside a dialog three routes away. |
| **Cross-cutting observer** | A capability observes *many* features and belongs to *none* — it isn't a sibling of anything (FSD Concern: "auth/logging/permissions don't fit a feature"). | Analytics, audit logging, session telemetry. |

For these, a **typed, central, downward-imported event channel** decouples publisher from subscriber
without an upward or sideways import. That is the whole rule.

## The decision rule (read this before reaching for an event)

> **An event is a scalpel. Reach for it only when composition genuinely can't reach.** Misusing the bus
> as a general message channel produces coupling *worse* than the import you avoided — invisible,
> untyped-at-the-callsite, and impossible to follow in the editor.

| Situation | Use | Rule |
| --- | --- | --- |
| One parent owns both pieces; synchronous wiring; a return value is needed | **Compose-from-above + headless feature hook** | `feature-sliced-design.md` |
| Two features read the same *state* | **Push it down to an `entity`** / the React Query cache | `feature-sliced-design.md`, `services-and-data.md` |
| Server data is stale after a mutation | **React Query `invalidateQueries` / `revalidatePath`/`Tag`** — **NOT** the bus | `services-and-data.md` |
| One action → **many independent reactors**, not co-located | **Event bus** (this rule) | below |
| **Cross-cutting observer** (analytics/audit/telemetry) of many features | **Event bus** (this rule) | below |

If the answer is in any row above the event-bus rows, **stop — you don't have an event-bus case.**

## The mechanism — `shared/lib/events/`

The bus is **business-agnostic infrastructure** (it knows nothing of any domain), so it lives in
`shared/lib`. The **event-name vocabulary is the domain contract** and lives *with the map* — exactly
how `shared/api` is generic transport while the endpoint list is domain-specific.

```
shared/lib/events/
├── bus.ts          the typed EventBus instance (a thin EventTarget / mitt-style wrapper). No React.
├── events.ts       THE CONTRACT: the central typed event map. Every event + its payload, in one place.
├── use-event.ts    'use client' — React subscription hook (bridges the bus into component state)
└── index.ts        public API: export { bus, type AppEvents, useEvent }
```

### The contract — a single central typed event map (`events.ts`)

```ts
// shared/lib/events/events.ts — the ONE place every cross-slice event is declared.
// Event names are PAST-TENSE FACTS ("what happened"), namespaced by domain, never commands.
export interface AppEvents {
  'grievance:filed':   { grievanceId: string; employeeId: string };
  'grievance:resolved': { grievanceId: string };
  'session:expired':   { reason: 'idle' | 'revoked' };
  // ❌ NOT 'dialog:open' — that's a command. Commands are hook calls (compose-from-above).
}
export type AppEventName = keyof AppEvents;
```

The map is **reviewed like a public API**: adding an event is a deliberate contract change, not an
ad-hoc string. Payloads are **POJOs only** — same serialization discipline as the RSC boundary
(`services-and-data.md`); no class instances, no functions, no live references.

### The bus (`bus.ts`) — typed publish/subscribe, no React

```ts
// shared/lib/events/bus.ts — framework-agnostic. Wrap mitt, or EventTarget; the surface is the contract.
import type { AppEvents, AppEventName } from './events';

type Handler<E extends AppEventName> = (payload: AppEvents[E]) => void;

class TypedBus {
  #target = new EventTarget();

  emit<E extends AppEventName>(name: E, payload: AppEvents[E]): void {
    this.#target.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }

  /** Returns an unsubscribe fn — always call it in cleanup. */
  on<E extends AppEventName>(name: E, handler: Handler<E>): () => void {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    this.#target.addEventListener(name, listener);
    return () => this.#target.removeEventListener(name, listener);
  }
}

export const bus = new TypedBus();
```

### The React bridge (`use-event.ts`) — subscribe inside a component

```ts
// shared/lib/events/use-event.ts
'use client';
import { useEffect, useRef } from 'react';
import { bus } from './bus';
import type { AppEvents, AppEventName } from './events';

/** Subscribe to a bus event for the component's lifetime. Handler is kept fresh via a ref so
 *  the subscription isn't torn down on every render. */
export function useEvent<E extends AppEventName>(
  name: E,
  handler: (payload: AppEvents[E]) => void,
): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => bus.on(name, (p) => ref.current(p)), [name]);
}
```

### Using it — publisher and subscriber never see each other

```ts
// features/file-grievance/api/file-grievance.action.ts  — the PUBLISHER (downward import into shared)
'use server';
// ...after a successful mutation + revalidate:
//   import { bus } from '@/shared/lib/events';
//   bus.emit('grievance:filed', { grievanceId, employeeId });
// NOTE: server actions can't emit to a client bus — emit from the feature's client hook on success,
// or use the bus only on the client. (See "Server vs client" below.)
```

```tsx
// features/notification-badge/ui/notification-badge.tsx  — a SUBSCRIBER, in a totally different subtree
'use client';
import { useEvent } from '@/shared/lib/events';
import { useState } from 'react';

export function NotificationBadge() {
  const [count, setCount] = useState(0);
  useEvent('grievance:filed', () => setCount((c) => c + 1));  // reacts without importing file-grievance
  return <span aria-label={`${count} new`}>{count}</span>;
}
```

`features/file-grievance` and `features/notification-badge` **never import each other.** Both import
*down* into `@/shared/lib/events`. Import direction holds; the same-layer ban holds; fan-out and
distance are solved.

## Server vs. client (the RSC reality)

The bus is a **client-runtime** channel — `EventTarget` lives in the browser, and subscribers are
React components. So:

- **Publish from the client.** A feature emits on its client hook after a mutation resolves
  (`onSuccess`), **not** from inside the `'use server'` action (the server has no client bus).
- **Server → client state changes still go through React Query / `revalidateTag`** — the bus is **not**
  a cache-invalidation mechanism (`services-and-data.md` owns that). Emit a bus event only for the
  *additional, non-data* reactions (toast, analytics, a UI flag elsewhere).
- **Never put server-derived data on the bus as a source of truth.** The bus says *"a grievance was
  filed"*; the badge then reads counts from the entity query cache if it needs the real number. The
  event is a *signal*, the cache is the *truth*.

## Hard guard-rails (so the bus can't rot into a global store)

- ❌ **State on the bus.** No "current value" reads, no replaying the last event as state. Server state
  = React Query; client state = React primitives. The bus is fire-and-forget signals only. (This is
  what keeps the Effector / global-store ban meaningful — the bus is not a store with a different name.)
- ❌ **Commands on the bus.** Events are past-tense facts (`grievance:filed`), never imperatives
  (`openDialog`, `refetchList`). An imperative across slices is a **hook call composed from above**, not
  an event. If you're tempted to emit a command, you have a compose-from-above case.
- ❌ **Request/response on the bus.** No "emit and await a reply." If you need a return value, it's a
  hook (compose-from-above). The bus is one-way.
- ❌ **Off-contract string events.** Every event name must exist in `events.ts`'s `AppEvents` map. No
  `bus.emit('some-string', …)` that isn't typed.
- ❌ **Publish/subscribe outside `@/shared/lib/events`.** No slice ships its own emitter; no slice-to-slice
  event wiring. One bus per repo, on the floor.
- ❌ **Using the bus to dodge a legitimate compose-from-above.** If one parent already owns both
  features, wire them with a hook + props — routing that through the bus hides the dependency and the
  reviewer rejects it.
- ❌ **Non-POJO payloads.** Same discipline as the RSC boundary — no class instances, functions, or live
  references in `detail`.
- ✅ Events are typed, central, past-tense facts; publisher and subscriber both import **down** into
  `shared/lib/events`; subscriptions clean up (the `useEvent` hook does this); the bus carries signals,
  the cache/state carries truth.
- ✅ Record a new event in `events.ts` *and* note material cross-slice event links in
  `project-specifics.md` (like any boundary decision — `feature-sliced-design.md`).

## Enforcement (layered — matches `governance.md`'s matrix)

| Rule | Hook (write-time) | ESLint | Steiger/dep-cruiser (CI) | Reviewer |
| --- | --- | --- | --- | --- |
| Deep import past `@/shared/lib/events` index | ✓ | ✓ `bedrock/no-deep-slice-import` | ✓ (`fsd/no-public-api-sidestep`) | ✓ |
| Publish/subscribe outside `shared/lib/events` (a slice with its own emitter) | — | ✓ `bedrock/events-only-from-shared` (proposed) | ✓ (no `EventTarget`/`mitt` import outside `shared/lib/events`) | ✓ |
| Off-contract string event name | — | ✓ (typecheck — `emit`/`on` are generic over `AppEventName`) | — | ✓ |
| Event used where compose-from-above would do | — | — | — | ✓ (judgment call) |
| Command/state/request-response on the bus | — | — | — | ✓ (judgment call) |

The strongest single enforcer is **TypeScript itself**: `emit`/`on` are generic over `keyof AppEvents`,
so an off-contract name or a wrong payload shape **doesn't compile**. The reviewer agent owns the two
judgment calls (event-vs-compose, fact-vs-command) — those can't be mechanically decided.

## Checklist — a cross-slice link is "done" when

- [ ] You first asked: does **one parent own both**? If yes → compose-from-above, not an event.
- [ ] You first asked: is this **shared state**? If yes → push to an entity / the cache, not an event.
- [ ] You first asked: is this **server-data staleness**? If yes → React Query invalidate /
      `revalidateTag`, not the bus.
- [ ] The event is a **past-tense fact** declared in `shared/lib/events/events.ts`'s `AppEvents` map.
- [ ] Publisher and subscriber import **only** `@/shared/lib/events` — never each other.
- [ ] Payload is a POJO; the bus carries a signal, not state or a command.
- [ ] Subscriptions clean up (use `useEvent`, which does); publish happens on the client (`onSuccess`),
      not inside `'use server'`.
- [ ] New event recorded in `events.ts`; material link noted in `project-specifics.md`.

## Sources
- [FSD — Cross-imports (the four sanctioned fixes; events are not one)](https://feature-sliced.design/docs/guides/issues/cross-imports)
- [FSD — Public API & `@x` (entities-only)](https://feature-sliced.design/docs/reference/public-api)
- [FSD — Redux architecture 2025 (actions-as-events; store-as-coordinator)](https://feature-sliced.design/blog/redux-architecture-2025)
- [FSD — Layers reference](https://feature-sliced.design/docs/reference/layers)
- Companion investigation: `../../INVESTIGATION-fsd-features-and-events.md` (community concerns + sources)
- Pairs with: `feature-sliced-design.md` (compose-from-above + headless hooks), `services-and-data.md` (state boundaries), `governance.md` (enforcement matrix).
