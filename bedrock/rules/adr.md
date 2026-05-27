# Rule: Architecture Decision Records (durable "why" memory)

> **Non-negotiable (enterprise overlay).** Material architecture decisions are recorded as
> **immutable, append-only ADRs** in `docs/adr/`. `project-specifics.md` holds the *current state*
> (what the repo is); ADRs hold the *why and the rejected alternatives* — the memory that survives,
> propagates, and doesn't get silently rewritten. An accepted ADR is never edited; a reversal is a
> **new** ADR that supersedes it.

## Why ADRs (and why `project-specifics.md` isn't enough)

The research finding that drives this: **knowledge persists only when it's append-only and
enforced; mutable docs drift.** `project-specifics.md` is the living state file — agents rewrite it
as the repo changes, so it can't be the record of *why* a past decision was made. ADRs are that
record: one decision per file, written once, never edited, linked when superseded. They become the
agent's authoritative long-term memory — read them before re-deciding anything architectural.

## When an ADR is REQUIRED (the trigger — define it or ADRs decay)

Write an ADR when a change:
- picks one **architecture/tech option over named alternatives** (state lib, routing model, data
  layer shape, monorepo tier, auth model, a major dependency);
- establishes or moves a **feature/module boundary** or a shared-vs-feature call;
- **deviates from the constitution** (a hard-ban override — the ADR is the justification record);
- sets a **cross-cutting convention** future code must follow.

Routine work (a normal component, a bugfix, a copy change) does **not** need an ADR. If unsure: would
a future engineer ask "why was this done this way?" → yes means write one.

## Format (MADR) & lifecycle

- One file per decision: `docs/adr/NNNN-kebab-title.md`, zero-padded sequential number, from
  `docs/adr/0000-template.md`. Sections: Context · Considered options · Decision (incl. **why not the
  others**) · Consequences · Compliance link.
- **Status lifecycle:** `Proposed → Accepted → Deprecated → Superseded by ADR-XXXX`.
- **Immutable after Accepted.** Don't edit the decision — supersede it with a new ADR and cross-link
  both (old gets `Superseded by NNNN`, new gets `Supersedes MMMM`).

## How agents use ADRs (memory loop)

- **Read first:** the SessionStart hook surfaces the ADR count; the architect and reviewer consult
  `docs/adr/` before deciding/judging. An existing Accepted ADR is binding context — don't contradict
  it silently.
- **Write on decision:** when the architect (or any agent) makes a trigger-level decision, it creates
  the ADR via `/adr` (or the `adr-author` agent) and references it from the relevant
  `project-specifics.md` row.
- **Supersede, don't mutate:** reversing a past call → new ADR superseding the old.

## Enforcement (CI fitness function)

A PR that touches architecture-tagged paths (e.g. `**/features/**/index.ts`, monorepo config,
`services/**`) **must reference an ADR** (a `docs/adr/NNNN` mention in the PR body or a new ADR file
in the diff), else CI fails. See `ci/` — this is what stops ADRs from being skipped.

## Hard rules

- ❌ Editing an Accepted ADR's decision (mutating durable memory). Supersede instead.
- ❌ A trigger-level decision with **no** ADR; a constitution override with no ADR + no
  `project-specifics.md` row.
- ❌ A new ADR that contradicts an Accepted one without superseding it (link them).
- ✅ One decision per file, alternatives named, immutable, status tracked, cross-linked on supersede.
- ✅ Agents read `docs/adr/` before re-deciding; record new decisions there.

## Sources
- [Documenting Architecture Decisions — Michael Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [MADR templates — adr.github.io](https://adr.github.io/adr-templates/)
- [architecture-decision-record — joelparkerhenderson](https://github.com/joelparkerhenderson/architecture-decision-record)
