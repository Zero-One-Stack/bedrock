# Rule: System Architecture (the landscape view) ⛨

> **Non-negotiable (enterprise overlay).** Every project keeps **one living system-architecture
> doc** — the landscape view of the whole system: what runs, how the parts talk, and **which team
> owns what**. ADRs record *why* a single decision was made; the Tech Radar records the *org's
> stance* on a technology; this doc records the *current shape of this system* so a new engineer
> (or agent) can orient in one read. Without it, the architecture lives only in people's heads and
> drifts the moment they leave.

## Why this exists (and why ADRs / `project-specifics.md` don't cover it)

- `project-specifics.md` is a **fact cache** (scripts, aliases, the feature list) — it's flat,
  not a model of how the system fits together.
- ADRs are **point decisions** — one file per choice, immutable. Reading 40 ADRs doesn't give you
  the current big picture; it gives you the history.
- The Tech Radar is **cross-project** — it says "the org uses React Query," not "in *this* system,
  the checkout zone talks to the orders BFF over this contract."

The system-architecture doc is the **synthesis**: the current containers, their boundaries, the
data flow between them, and the team map. It's the thing the architect reads before planning a
feature that crosses boundaries, and the thing the reviewer reads before judging whether a change
respects them. It is **mutable and kept current** (like `project-specifics.md`) — but it models
*structure*, and when a structural decision changes it, that change is also an ADR.

## When you MUST have / update it (the trigger — or it decays)

Create it (from the template) when a project crosses **any** of:
- it has **more than one feature owned by more than one team**, or
- it graduates past Tier 1 (modular monolith) in `monorepo-architecture.md` — i.e. any
  **independently-deployed** part (a Multi-Zone zone, a remote, a separate BFF/service), or
- it integrates with a system the team doesn't own (an external API, an auth provider, a CMS).

Update it when a change:
- adds/removes/renames a **container** (an app, a zone, a remote, a shared package, a BFF);
- moves a **team or feature boundary** (also an ADR — `adr.md`);
- changes how containers **talk** (a new contract, a new shared singleton, a new external integration).

A single-app, single-team project below those triggers doesn't need it yet — a filled
`project-specifics.md` is enough. **Don't write a landscape doc for a system that has no
landscape.**

## What it contains (the C4-aligned levels — go only as deep as the system warrants)

Model the system top-down; stop at the level that's actually informative. Most Tier-1 projects
need only Context + a Component sketch; multi-zone/multi-team systems need Containers + the team
map.

1. **System context** — this system as one box; the **people** (roles) and **external systems**
   it talks to, and why. (C4 L1.) Answers: *what is this, who uses it, what does it depend on?*
2. **Containers** — the independently-runnable/deployable units: the shell, each zone/remote, each
   BFF or service, the design-system package. For each: its responsibility, its tech, **who
   deploys it**, and **which team owns it**. (C4 L2.) This is the level multi-team systems live at.
3. **Components (per container)** — the feature slices and shared libs inside a container, and the
   **enforced boundaries** between them (the Nx tags / `eslint-plugin-boundaries` from
   `monorepo-architecture.md`). Don't re-list every component — name the slices and the boundary
   rules. (C4 L3.)
4. **Data & contract flow** — how data moves between containers and to externals: the **contracts**
   at each edge (a zone URL, a federated `./Module` export, a shared Zod schema, an OpenAPI spec),
   and which are versioned. Ties to `contracts-and-versioning.md` and `services-and-data.md`.
5. **The team map** — the explicit *team → owned containers/features* table. This is the
   single source the `CODEOWNERS` file and `scope:team-*` tags (`team-ownership.md`) must agree
   with. If the map and `CODEOWNERS` disagree, that's a bug to reconcile.
6. **Cross-cutting** — where auth, observability, i18n, and the design system live in the picture
   (one line each, linking the owning rule).

Each structural decision shown here should trace to an **ADR** (link it); the doc is the *current
state*, the ADRs are the *why*.

## Diagrams: prefer text-first

Use a **Mermaid `flowchart` / `C4Context`** block (renders in GitHub, diffs in git, no binary
asset to drift). A box-and-arrow ASCII sketch is fine for L1–L2. **Don't** commit a screenshot of
a whiteboard as the source of truth — it can't be diffed, reviewed, or kept honest by CI.

## Where it lives & how agents use it

- `docs/architecture/<system>-system.md` — one per deployable system (a single monorepo usually =
  one doc). Built from `docs/architecture/0000-template.md`. Sits beside `docs/adr/` and
  `docs/radar/`.
- **Read first:** the architect (`/architect`, `frontend-architect`) reads it before planning
  anything that crosses a container/feature/team boundary; the reviewer reads it before judging a
  cross-boundary diff. An existing boundary in this doc is **binding context** — a plan that
  violates it must either be revised or justified by a new ADR that moves the boundary.
- **Write on structural change:** the agent making a container/boundary change updates this doc in
  the same PR (and writes the ADR). `memory-hygiene` flags it when containers in the repo no longer
  match the doc.

## Hard rules

- ❌ A multi-team or multi-deploy system with **no** `docs/architecture/` landscape doc (the
  boundaries exist only implicitly → they drift).
- ❌ A team map / ownership section that **disagrees** with `CODEOWNERS` or the `scope:team-*` tags
  (`team-ownership.md`) — reconcile, don't fork.
- ❌ A container or contract change merged **without** updating this doc (stale landscape is worse
  than none — it lies).
- ❌ A binary screenshot as the canonical diagram (use Mermaid/ASCII so it diffs and reviews).
- ✅ One living doc per system, C4-aligned only as deep as the system warrants, structural
  decisions traced to ADRs, the team map authoritative and consistent with `CODEOWNERS`.

## Checklist (before "the architecture is documented")

- [ ] System context: people + external systems named, with the *why* of each dependency.
- [ ] Containers: every independently-deployed unit listed with responsibility, tech, owning team.
- [ ] Boundaries: the enforced rules (Nx tags / boundaries lint) named, not just described.
- [ ] Contract flow: each cross-container/external edge has its contract + whether it's versioned.
- [ ] Team map present and consistent with `CODEOWNERS` + `scope:team-*` tags.
- [ ] Each structural decision links to its ADR; the doc reflects the **current** repo.

## Sources
- [The C4 model for visualising software architecture](https://c4model.com/)
- [Mermaid — C4 & flowchart diagrams (git-diffable, GitHub-rendered)](https://mermaid.js.org/syntax/c4.html)
- [Architecture as Code / living documentation — Simon Brown](https://simonbrown.je/)
- [Team Topologies — team-aligned boundaries](https://teamtopologies.com/)
