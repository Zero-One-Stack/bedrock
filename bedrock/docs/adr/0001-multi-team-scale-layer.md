# 0001. Add the multi-team scale layer (system-architecture, ownership, contracts, release)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Deciders:** Kit maintainers (Zero One Stack — platform/standards)
- **Tags:** architecture, governance, monorepo, enterprise

## Context and problem statement

Bedrock's thesis is "enforced engineering standards for a **growing, multi-team Next.js org**." A
review against that thesis confirmed the framing is coherent — tiered governance, size-triggered
monorepo graduation, compliance-as-evidence — but found that the **"multiple teams at scale" claim
was narrative, not enforced**, and that several scale concerns had no home:

1. **No team-ownership layer.** `monorepo-architecture.md` enforces *module* boundaries (feature A ↛
   feature B internals) but nothing maps an area to an accountable team or requires the owning team
   to review a change. Module boundaries ≠ team boundaries.
2. **No system-architecture home.** `docs/` held only `adr/` (point decisions) and `radar/` (tech
   stances); there was no living landscape view of containers, data flow, and who-owns-what.
3. **No contract/versioning discipline** for shared packages/APIs/zones once deploys become
   non-atomic (Multi-Zones / federation / a BFF).
4. **No release/deploy governance** (environments, rollback, flags, canary) and **no ownership of the
   Next.js server surface** (Route Handlers / Server Actions / BFF).

How should the kit close these gaps without breaking its own shape (a thin `CLAUDE.md` router +
one-concern-per-file `rules/`, enforcement over docs, two-tier memory)?

## Considered options

1. **Add four enterprise rules + a `docs/architecture/` home, wired into the existing machinery** —
   grow the kit in its own pattern.
2. **One combined "scale.md" rule** covering all four concerns in a single file.
3. **Defer to a future sibling kit / Phase 5** — treat these as out of scope for the frontend kit.

## Decision

**We chose Option 1.**

Four new enterprise (⛨) rules — `system-architecture.md`, `team-ownership.md`,
`contracts-and-versioning.md`, `release-and-deploy.md` — each following the authoring convention, plus
a new `docs/architecture/` home (`0000-template.md`) with the kit dogfooding it in
`bedrock-system.md`. Cross-team editing without owner review is promoted to a **`CLAUDE.md` hard
ban** (the enforcement teeth), backed by `CODEOWNERS` + `scope:team-*` tags + a Code-Owner-review CI
gate. All four are wired into `enterprise-init`, the `CLAUDE.md` router, `rules/README.md`, and
`ci.md`.

This keeps the kit's invariants: depth lives in `rules/` (the router didn't grow except for one
genuinely non-negotiable hard ban), each rule is self-contained, and the concerns become *enforced*
(hard ban + CI gate) rather than advisory.

### Pros / cons of the chosen option

- 👍 Closes all four gaps in the kit's existing shape — no new structural concept to learn.
- 👍 The "multiple teams" claim becomes enforced (hard ban + Code-Owner gate), not narrative.
- 👍 The four rules interlock: the architecture team map is canonical, ownership projects it,
  contracts evolve along owned edges, releases ship them safely.
- 👎 Four more rule files to maintain and keep consistent (the team map ↔ CODEOWNERS ↔ tags triple).
- 👎 A first *conditional* hard ban in `CLAUDE.md` (multi-team-only) — a small precedent.

### Why not the others

- **Option 2 (one `scale.md`)** — rejected: violates one-concern-per-file; a 4-in-1 rule is the kind
  of file that stops being read. Routing also gets coarse.
- **Option 3 (defer)** — rejected: these are *frontend, multi-team Next.js* concerns (the server
  surface, zone contracts, ownership of `features/*`), squarely in this kit's scope — not a separate
  stack. Deferring would leave the core thesis unenforced.

## Consequences

- **Easier:** a new engineer/agent can orient via the landscape doc; cross-team changes route through
  the owner automatically; breaking shared-contract changes have a prescribed safe path.
- **Harder / to maintain:** the team-map ↔ `CODEOWNERS` ↔ `scope:team-*` consistency must be kept
  (`memory-hygiene` + the architect flag drift); branch protection must require Code-Owner review or
  the hard ban has no teeth.
- **Follow-up / fitness functions:** a CODEOWNERS-vs-tags consistency check and a contract/version
  range check are candidate CI additions (noted in `ci.md`); validate during the Phase-2 pilot.

## Compliance / constitution link

This **extends** the constitution: a new `CLAUDE.md` hard ban (cross-team edits) and four new Tier-1
enterprise rules applied via `enterprise-init`. It is **not** a deviation from any existing rule — it
builds on `monorepo-architecture.md` (boundaries → ownership), `services-and-data.md` (data → server
surface), `adr.md`/`tech-radar.md`/`system-architecture.md` (point/org/landscape memory layers), and
`ci.md` (the merge gate). Recorded on the Tech Radar (2026-05-25 update) and ROADMAP Phase 4.5.
