# Investigation: FSD "features" + event-modelling concerns — and the kit's answer

> **Why this doc exists.** Two of the most-cited concerns about Feature-Sliced Design are
> (1) the *features layer* is confusing/over-used, and (2) FSD has **no first-class story for
> cross-feature events** ("feature A must react to feature B"). This kit treats FSD as
> non-negotiable, so we owe a clear position on both. This is the investigation behind the new
> `rules/cross-slice-communication.md` rule. Date: 2026-05-29.

---

## Part 1 — What the community actually says (researched, sourced)

Evidence quality note up front: there is **no Hacker News debate** (every FSD submission has 0
comments), and Reddit threads weren't retrievable via search. The substantive primary sources are
the **official FSD docs**, two **GitHub Discussions (#716, #756)**, and a handful of **dev.to /
Medium practitioner write-ups**. Reddit-attributed sentiment in secondary articles is unverified
at source.

### Theme 1 — the "features" layer

| # | Concern | Real gap or misunderstanding? | Resolution status |
|---|---------|-------------------------------|-------------------|
| 1.1 | **"Feature" (FSD) ≠ "feature" (product).** The word collides with everyday business vocabulary. The official Naming page owns the general collision class (`process`/`page`/`model`) but conspicuously omits "feature" — the worst offender. | **Real**, partially. | Social convention only ("say *FSD feature*"). No structural fix. |
| 1.2 | **"Is it a feature, a widget, or a page?"** The single most common complaint. *"The hardest part of FSD is figuring out where one feature ends and another begins."* (Arjun Santhosh). Criteria hinge on "reuse" and "user value" — subjective. | **Real** structural friction. | Decision rule exists but is judgment-based. v2.1 is the maintainers conceding it. |
| 1.3 | **Over-slicing / insignificant slices.** *"I tried slicing everything… that quickly became unmanageable."* | **Real beginner failure mode**, now answered. | Official **v2.1 "Pages First"**: keep non-reused code in the page; promote only when reuse appears. |
| 1.4 | **Cross-cutting concerns** (auth, permissions, logging) *"don't fit neatly into any one feature."* | **Real gap** in the feature abstraction. | Ad hoc — push to `shared`/`entities`. No crisp rule. |
| 1.5 | **Is the features layer even necessary?** v2.1 repositioned *pages* as the primary unit; features become late-stage/optional. Flip side (Discussion #716): big page slices get messy, and the "slices-within-slices" proposal to fix that was **declined** by maintainers. | **Live / partially unresolved.** | v2.1 reduces *reliance* on features; the "big page slice" organization problem has no official answer. |

### Theme 2 — cross-slice communication & event modelling

**What FSD officially says:**
- Same-layer imports are banned and framed as *"a code smell."*
- Four sanctioned fixes (cross-imports guide): **merge**, **push down to entities**, **compose from
  above** (IoC: render props / slots / DI), **public API only**. **None of the four is events.**
- The `@x` cross-import is **Entities-only by explicit decree.** There is **no `@x` for features.**
- The official Redux 2025 blog frames **actions as events** and says features coordinate
  **indirectly through shared entity state + the central store** — *not* via direct messaging or a bus.

| # | Concern | Real gap or misunderstanding? | Resolution status |
|---|---------|-------------------------------|-------------------|
| 2.1 | **"Feature A must react to feature B's action."** FSD has no horizontal/event channel between features by design; it offloads reactivity to the page (compose-from-above) or the global store. | **Real structural gap, by design.** | Works for *state-shaped* coordination; awkward for genuine fire-and-forget *events*. |
| 2.2 | **No official pub/sub or event-bus pattern.** Checked the cross-imports guide, public-api/@x docs, FAQ, Redux blog — **none mention an event bus, pub/sub, mediator, or listener.** Events live in the *state library* (Redux actions-as-events, Effector events, Zustand) — but FSD gives **no guidance on where a cross-feature event unit physically lives** in the layer structure. | **Real and unresolved at the methodology level.** | Deliberate non-answer: "your state manager owns it." |
| 2.3 | **"Compose from above" has limits.** Works when one parent owns both children. Breaks down for **sibling features deep in the tree** that must react to each other, and for **app-wide events with many independent listeners** — pushing all of it up bloats the page or forces everything into the global store, collapsing the "shared state" vs. "events" distinction. | **Real limitation, lightly acknowledged.** | FSD's honest answer ("then it's shared state, put it in the store") *is* the criticism. |

**Bottom line:** the cross-feature-event gap is **substantively real**, not a misunderstanding. It's a
deliberate delegation to the state manager — which leaves a documented hole for anyone whose
cross-feature needs are *event-shaped* rather than *state-shaped*.

---

## Part 2 — Why the kit's version of the gap is *sharper* than FSD's

FSD says "delegate cross-feature events to your state manager." **This kit bans the usual state
managers for exactly that job:**

- `CLAUDE.md` hard ban: **❌ Effector or any external/global server-state store.** (Effector is the
  *event-first* model FSD examples often use — gone.)
- `services-and-data.md`: server state = React Query / RSC; client state = React primitives; **shared
  client state = React Context, used "sparingly."** No global mutable event store.

So the kit has **closed the doors FSD assumes you'll use, without opening a replacement.** Today the
kit offers only the *synchronous* answer:

- **Compose-from-above** + **headless feature hooks** (`useFileGrievance()` → `{ open, close }`), where
  a widget calls two features' hooks and wires them with props.

That is genuinely good — and it is the *right default*. But it covers only **synchronous, co-located,
one-parent-owns-both** wiring. It has **no answer** for:

1. **Fan-out** — one action, many independent reactors (a mutation → toast + analytics +
   unsaved-changes-guard + cache-warm), where listeners are *not* siblings under one widget.
2. **Distance** — a feature deep in subtree A must react to a feature deep in subtree B; the nearest
   common parent is the whole app, so "compose from above" means "drill props through 6 layers" or
   "put it in a global store" (banned).
3. **Cross-cutting observers** — analytics, audit logging, telemetry: capabilities that observe *many*
   features and belong to none (Concern 1.4 + 2.1 combined).

---

## Part 3 — The solution (what the new rule defines)

A **sanctioned, FSD-legal, typed event channel that lives on the `shared` floor** — so events flow
*through the floor*, and **no slice ever imports another slice.** Import direction is preserved: every
slice imports *down* into `shared/lib/events`; no slice imports *across*.

### The mechanism: a typed event bus in `shared/lib/events/`

- A tiny typed `EventBus` (a thin `EventTarget`/`mitt`-style wrapper) with a **single central event
  map** that is the contract. Publish and subscribe are both *downward* imports into `shared`.
- **Events are facts, not commands** (the FSD/Redux "actions are events" framing): `grievance:filed`,
  `session:expired` — past-tense, "what happened," never `openDialog` (that's a command → use a hook).
- Publishers don't know subscribers and vice-versa — that's the decoupling that makes fan-out and
  distance work without an upward or sideways import.

### The decision rule (when events vs. when compose-from-above)

This is the crux — events are a **scalpel, not the default**, or you get spaghetti worse than the
import you avoided:

| Situation | Use |
|-----------|-----|
| One parent owns both pieces; synchronous wiring | **Compose-from-above + headless hook** (existing rule — still the default) |
| Shared *state* two features read | **Push down to an `entity`** / React Query cache (existing rule) |
| One action, **many independent reactors**, listeners not co-located | **Event bus** (new) |
| **Cross-cutting observer** (analytics, audit, telemetry) reacting to many features | **Event bus** (new) |
| Server-state invalidation after a mutation | **React Query `invalidateQueries` / `revalidateTag`** (existing — NOT the event bus) |

### Hard guard-rails (so the bus can't become a global store or a back-channel)

- **The bus carries events, never state.** No reading "current value" off the bus. Server state stays
  in React Query; client state stays in React primitives. (Keeps the Effector ban meaningful.)
- **The event map is the contract** — typed, central, reviewed like a public API. No ad-hoc string
  events.
- **No request/response on the bus** — fire-and-forget only. If you need a return value, it's a hook
  call (compose-from-above), not an event.
- **`shared/lib/events` is business-agnostic infrastructure**; the *event-name vocabulary* is the
  domain contract and lives with the map. (Mirrors how `shared/api` is generic transport but endpoints
  are domain.)
- **Don't use the bus to dodge a legitimate compose-from-above.** If one parent already owns both
  features, wiring them through the bus is an anti-pattern — review rejects it.

### Enforcement (layered, matching the kit's existing matrix)

- The bus's public API barrier is enforced exactly like any `shared/lib` module (no deep import).
- A new `eslint-plugin-bedrock` rule + reviewer check: **publish/subscribe only via
  `@/shared/lib/events`** (no slice-to-slice event wiring), and **event names must exist in the central
  map** (no string literals off-contract).
- Reviewer agent gets a check: "an event used where compose-from-above would do" → flag.

---

## Sources

- FSD — Naming (terminology collisions): https://feature-sliced.design/docs/about/understanding/naming
- FSD — Layers reference: https://feature-sliced.design/docs/reference/layers
- FSD — Cross-imports guide (the four sanctioned fixes): https://feature-sliced.design/docs/guides/issues/cross-imports
- FSD — Public API / `@x` (entities-only): https://feature-sliced.design/docs/reference/public-api
- FSD — Redux architecture 2025 (actions-as-events, store-as-coordinator): https://feature-sliced.design/blog/redux-architecture-2025
- FSD — Migration from v2.0 (Pages First): https://feature-sliced.design/docs/guides/migration/from-v2-0
- GitHub Discussion #756 (Pages First / features-layer reliance): https://github.com/feature-sliced/documentation/discussions/756
- GitHub Discussion #716 (slices-within-slices, declined; big-page-slice pain): https://github.com/feature-sliced/documentation/discussions/716
- dev.to — Arjun Santhosh, lessons from real projects: https://dev.to/arjunsanthosh/mastering-feature-sliced-design-lessons-from-real-projects-2ida
- dev.to — petrtcoi, experience with FSD: https://dev.to/petrtcoi/my-experience-with-fsd-feature-sliced-design-architecture-5a6n
- Medium — The drawbacks of FSD: https://medium.com/@lightxdesign55/the-drawbacks-of-feature-sliced-design-b19206b96cb7
