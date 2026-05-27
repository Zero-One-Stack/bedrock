# Rule: Contracts & Versioning (evolving shared edges safely) ⛨

> **Non-negotiable (enterprise overlay).** The moment a system has **independently-deployed parts**
> (Multi-Zone zones, federated remotes, a separate BFF) or a **shared package consumed by multiple
> teams**, deploys stop being atomic. A shared edge that changes in a breaking way ships to
> producers and consumers at *different times* — and breaks production in the gap. So every
> cross-boundary edge is a **versioned contract**, and breaking changes go through **expand →
> migrate → contract**, never a hard swap.

## Why this exists (and why `monorepo-architecture.md` doesn't cover it)

`monorepo-architecture.md` decides *what* to share ("only true singletons: React, the data client,
i18n, the router") and *how to split*. It explicitly does **not** cover how a shared thing
**evolves** once two independently-deployed parts depend on it. That's the dangerous part: in a
modular monolith (Tier 1) one build catches a breaking change instantly. In Tier 2/3, the producer
deploys, the consumer is still on the old version for minutes-to-days, and a removed field or
renamed export is a runtime failure no compiler caught. This rule is the missing contract discipline
for non-atomic deploys.

## What counts as a contract (the versioned edges)

| Edge | The contract | Lives in |
| --- | --- | --- |
| Shell ↔ zone (Tier 2) | The **zone URL / rewrite** + the shape of any handed-off data | shell rewrites; `monorepo-architecture.md` |
| Host ↔ remote (Tier 3) | The federated **`./Module` export** signature | the remote's `exposes` |
| App ↔ BFF / API | The **OpenAPI spec or shared Zod schema** (`services-and-data.md`) | `packages/contracts/` or the service `*.types.ts` |
| Any consumer ↔ shared package | The package's **public API** (`index.ts` exports) + its **semver** | `shared/*` / `packages/*` |
| Shared singleton (React Query, i18n, router) | The **major version** all parts agree on | the workspace `package.json` |

A contract has an **owner** (the stewarding team, `team-ownership.md`) and a **version**. Consumers
depend on a *version range*, not on "whatever's on main."

## Versioning rules

- **Semver on shared packages.** Breaking change → **major**. Additive → minor. The owning team bumps
  it; CI fails a consumer that pins an incompatible range. Don't reuse a version for a changed API.
- **Zod schema = the data contract** (`services-and-data.md`). Validate at the boundary; a new
  **required** field is breaking, an **optional** one is additive. Version the schema when the shape
  changes incompatibly.
- **Singletons share a major** (`monorepo-architecture.md`): all parts run the same major of React /
  React Query / i18n / the router. A major bump is a coordinated, ADR-backed migration across teams,
  not a unilateral one.
- **Never reach past the contract.** No deep-importing a shared package's internals, no consuming a
  zone's private routes — the contract is the *only* coupling point (this is why the split exists).

## Breaking changes: expand → migrate → contract (the only safe path)

A removed/renamed/retyped contract member, shipped non-atomically, breaks the gap. Do it in three
deploys instead of one:

```
1. EXPAND   Add the new shape ALONGSIDE the old. Both work. Deploy the producer.
            (new field optional; new export added; new endpoint version /v2 alongside /v1)
2. MIGRATE  Move every consumer to the new shape, on their own cadence. Deploy each.
            (the owning team tracks consumers; CODEOWNERS tells you who they are)
3. CONTRACT Once no consumer uses the old shape, remove it. Deploy the producer.
            (a deprecation window with a removal date — a time-boxed waiver if it lingers)
```

- Each breaking contract change is an **ADR** (`adr.md`) — it's a cross-cutting decision with named
  consumers and a removal milestone.
- The deprecation window is **time-boxed** like any waiver (`governance.md`): the old shape carries a
  removal date, so debt stays visible and doesn't become permanent.
- For API edges, prefer **explicit versioning** (`/api/v2/…`, a `version` field, a new schema export)
  over silently changing `/v1`.

## Rollout across teams

- The owning team **announces** a contract change to consumers (the team map / CODEOWNERS is the
  distribution list) and owns the deprecation timeline.
- **CI catches range violations**: a consumer on an incompatible major fails the gate (the version
  check / type-check against the published contract).
- **Don't deploy a breaking producer ahead of its consumers** — that's the whole failure this rule
  prevents. Producer-first is only safe in the EXPAND step (where old still works).

## Hard rules

- ❌ A **breaking change to a shared contract** (removed/renamed/retyped export, schema field, or
  endpoint) shipped as a **single hard swap** across independently-deployed parts. Expand→migrate→contract.
- ❌ A consumer **reaching past the contract** into a package's internals or a zone's private routes.
- ❌ A shared-singleton **major bump done unilaterally** (not coordinated + ADR-backed across teams).
- ❌ Reusing a package version for a changed public API (silent breakage; consumers can't pin safely).
- ✅ Every cross-boundary edge is an owned, versioned contract; breaking changes are expand-migrate-contract
  with a dated deprecation window + an ADR; singletons share a coordinated major; CI fails range violations.

## Checklist

- [ ] Every shared package / API / zone edge has an identified owner + version (in the team map).
- [ ] Shared packages use semver; CI fails incompatible consumer ranges.
- [ ] Data contracts are Zod/OpenAPI; required-field additions treated as breaking.
- [ ] Any breaking change is staged expand→migrate→contract with a dated removal + an ADR.
- [ ] Singleton majors are coordinated across all parts, not bumped in one.

## Sources
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Next.js — Multi-Zones (independent deploys)](https://nextjs.org/docs/app/guides/multi-zones)
- [Module Federation — shared dependencies & versions](https://module-federation.io/configure/shared.html)
- [Parallel Change / expand-contract — Martin Fowler](https://martinfowler.com/bliki/ParallelChange.html)
- [Consumer-Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html)
