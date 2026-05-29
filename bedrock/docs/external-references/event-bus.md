# Reference: the cross-slice event bus (`shared/lib/events/`)

> **Kit-authored reference code** (not a third-party library). This is the copy-paste
> implementation of the typed event bus that `rules/cross-slice-communication.md` specifies.
> Read the rule for the **decision rule** (when an event is even the right tool) and the
> guard-rails; this file is the **mechanism**. Written for React 18/19 + Next.js App Router.
>
> **Before you copy:** an event is a scalpel. Most "cross-feature reactivity" is derived state
> → use the **React Query cache**, which replays to late-mounting subscribers (the bus does
> not). See the decision table in the rule.

The bus is **client-runtime** (browser `EventTarget` + React subscribers), **single-realm**
(no cross-tab/worker/iframe), **fire-and-forget** (no replay, no request/response), and carries
**past-tense facts** (`grievance:filed`), never state or commands.

## File layout

```
src/shared/lib/events/
├── bus.ts          createBus() factory + globalThis-guarded singleton. A thin EventTarget wrapper. No React.
├── events.ts       THE CONTRACT: the central typed event map + version + owner. POJO payloads only.
├── use-event.ts    'use client' — React subscription hook.
└── index.ts        public API: export { bus, createBus, type AppEvents, type AppEventName, useEvent }
```

## `events.ts` — the contract (versioned, owned)

```ts
// src/shared/lib/events/events.ts
// Owner: @platform-architecture (CODEOWNERS on this file). See contracts-and-versioning.md.
// Payload TYPES import from the owning entity's public API so domain types stay slice-owned —
// only the event NAME vocabulary is central. Payloads must be POJOs (RSC-serialization discipline).
import type { GrievanceId } from '@/entities/grievance';
import type { EmployeeId } from '@/entities/employee';

/** @contract-version 1 — payload changes follow expand→migrate→contract (contracts-and-versioning.md). */
export interface AppEvents {
  'grievance:filed':    { grievanceId: GrievanceId; employeeId: EmployeeId };
  'grievance:resolved': { grievanceId: GrievanceId };
  // ❌ NOT 'dialog:open'    — a command. Commands are hook calls (compose-from-above).
  // ❌ NOT 'session:expired' — cross-tab. The bus is single-realm; use BroadcastChannel (see below).
}
export type AppEventName = keyof AppEvents;
```

## `bus.ts` — factory + MF-safe singleton, async + error-isolated

```ts
// src/shared/lib/events/bus.ts — framework-agnostic. No React. No domain logic.
import type { AppEvents, AppEventName } from './events';
import { captureException } from '@/shared/lib/observability';

type Handler<E extends AppEventName> = (payload: AppEvents[E]) => void;

export interface Bus {
  emit<E extends AppEventName>(name: E, payload: AppEvents[E]): void;
  /** Returns an unsubscribe fn — ALWAYS call it in cleanup. */
  on<E extends AppEventName>(name: E, handler: Handler<E>): () => void;
}

/**
 * Factory. Call in TESTS for an isolated bus (no shared global state between tests).
 * Production code uses the `bus` singleton below.
 */
export function createBus(): Bus {
  const target = new EventTarget();
  return {
    emit(name, payload) {
      // Async dispatch (microtask): decouples from the caller's stack and prevents synchronous
      // re-entrant cascades (a handler that emits won't recurse into the same call stack).
      queueMicrotask(() => target.dispatchEvent(new CustomEvent(name, { detail: payload })));
    },
    on(name, handler) {
      const listener = (e: Event) => {
        // Per-handler error isolation: one throwing subscriber must NOT break the others.
        // (mitt would abort the rest — that's why this kit wraps EventTarget, not mitt.)
        try {
          handler((e as CustomEvent).detail as AppEvents[typeof name]);
        } catch (err) {
          captureException(err, { tags: { busEvent: String(name) } });
        }
      };
      target.addEventListener(name as string, listener);
      return () => target.removeEventListener(name as string, listener);
    },
  };
}

// ── Singleton, MF / multi-root safe ──────────────────────────────────────────────────────────
// A plain module-level `new` yields ONE bus PER BUNDLE. Under Module Federation (the kit's
// monorepo Tier 3 — monorepo-architecture.md), a publisher in remote A would be invisible to a
// subscriber in remote B. The globalThis-symbol guard collapses every bundle to ONE instance.
// ALSO: mark `@/shared/lib/events` `singleton: true` in the MF / workspace config.
const BUS_KEY = Symbol.for('bedrock.app-bus');
type GlobalWithBus = typeof globalThis & { [BUS_KEY]?: Bus };
export const bus: Bus = ((globalThis as GlobalWithBus)[BUS_KEY] ??= createBus());

// Dev-mode tracing — answers "who fired this?" without a debugger. Tree-shaken in production.
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  const raw = bus.emit.bind(bus);
  bus.emit = ((name, payload) => {
    // eslint-disable-next-line no-console
    console.debug('[bus] emit', name, payload);
    raw(name, payload);
  }) as Bus['emit'];
}
```

## `use-event.ts` — the React bridge

```ts
// src/shared/lib/events/use-event.ts
'use client';
import { useEffect, useRef } from 'react';
import { bus } from './bus';
import type { AppEvents, AppEventName } from './events';

/**
 * Subscribe to a bus event for the component's lifetime.
 * - Handler kept fresh via ref → the subscription isn't torn down on every render.
 * - StrictMode double-invokes effects; subscribe→unsubscribe→subscribe is balanced (no leak/dup).
 * - REMEMBER: no replay. If the component wasn't mounted, it missed the event. Use the event to
 *   trigger a re-read of the truth (the cache), never to accumulate state.
 */
export function useEvent<E extends AppEventName>(
  name: E,
  handler: (payload: AppEvents[E]) => void,
): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => bus.on(name, (p) => ref.current(p)), [name]);
}
```

## `index.ts` — the public API

```ts
// src/shared/lib/events/index.ts
export { bus, createBus, type Bus } from './bus';
export type { AppEvents, AppEventName } from './events';
export { useEvent } from './use-event';
```

## Publishing (client only, on success)

```tsx
// features/file-grievance/model/use-file-grievance.ts
'use client';
import { useMutation } from '@tanstack/react-query';
import { bus } from '@/shared/lib/events';
import { fileGrievance } from '../api/file-grievance.action';

export function useFileGrievance() {
  return useMutation({
    mutationFn: fileGrievance,
    onSuccess: (res) => {
      // Emit on the CLIENT after success — NOT inside the 'use server' action (no client bus there).
      bus.emit('grievance:filed', { grievanceId: res.id, employeeId: res.employeeId });
    },
  });
}
```

## Subscribing — the event triggers a re-read, never accumulates state

```tsx
// widgets/app-header/ui/notification-badge.tsx — a subscriber in a DIFFERENT subtree
'use client';
import { useEvent } from '@/shared/lib/events';
import { useQueryClient } from '@tanstack/react-query';
import { unreadGrievanceKeys } from '@/entities/grievance';

export function NotificationBadge({ count }: { count: number }) {
  const qc = useQueryClient();
  // ✅ re-read the truth from the cache; ❌ never setCount(c => c + 1) — a miss would under-count.
  useEvent('grievance:filed', () =>
    qc.invalidateQueries({ queryKey: unreadGrievanceKeys.count() }),
  );
  return <span aria-label={`${count} unread`}>{count}</span>;
}
```

## Analytics — the cross-cutting observer, wired once at the app layer

```ts
// src/app/providers/analytics-bridge.ts — registered ONCE at app init, not per render.
'use client';
import { bus } from '@/shared/lib/events';
import { track } from '@/shared/lib/observability'; // PII-free tracker (observability.md)

let offs: Array<() => void> = [];
export function startAnalyticsBridge() {
  stopAnalyticsBridge(); // HMR-safe: never double-subscribe
  offs = [
    bus.on('grievance:filed', ({ grievanceId }) => track('grievance_filed', { grievanceId })),
  ];
}
export function stopAnalyticsBridge() {
  offs.forEach((off) => off());
  offs = [];
}
```

## Cross-tab (the `session:expired` case) — NOT the in-page bus

`EventTarget` is single-realm. "Log out in one tab → all tabs" needs `BroadcastChannel`. Build a
small adapter in `shared/lib/` that mirrors *specific* events; don't pretend the in-page bus does it.

```ts
// src/shared/lib/events/broadcast.ts — cross-tab adapter for the SPECIFIC events that need it.
'use client';
const channel = typeof window !== 'undefined' ? new BroadcastChannel('app') : null;
export function broadcastSessionExpired(reason: 'idle' | 'revoked') {
  channel?.postMessage({ type: 'session:expired', reason });
}
export function onSessionExpired(handler: (reason: 'idle' | 'revoked') => void): () => void {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.data?.type === 'session:expired') handler(e.data.reason);
  };
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
}
```

## Testing — fresh bus per test, await the async emit

```ts
import { createBus } from '@/shared/lib/events';

test('announces a filed grievance', async () => {
  const bus = createBus();                 // fresh instance — no shared global state between tests
  const seen: unknown[] = [];
  bus.on('grievance:filed', (p) => seen.push(p));
  bus.emit('grievance:filed', { grievanceId: 'g1', employeeId: 'e1' });
  await vi.waitFor(() => expect(seen).toHaveLength(1)); // emit is async (microtask) — await it
});
```

> **`emit` is asynchronous.** A synchronous assertion right after `emit` runs *before* delivery.
> Always `await`/`waitFor`. For components: `render(...)`, then `await act(async () => bus.emit(...))`.

## Version notes
- Written against **React 18.3 / 19**, **Next.js 15+**, **TanStack Query v5**.
- `BroadcastChannel`, `EventTarget`, `CustomEvent`, `queueMicrotask`, `Symbol.for` are all
  baseline-supported in modern browsers; no polyfill needed for the kit's target matrix.
- If you swap the EventTarget core for another emitter, **preserve two guarantees**: per-handler
  error isolation and non-re-entrant (async) dispatch. `mitt` provides neither.
