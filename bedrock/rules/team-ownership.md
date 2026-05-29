# Rule: Team Ownership (who owns what, and who must review) ⛨

> **Non-negotiable (enterprise overlay).** At multi-team scale, **module boundaries are not team
> boundaries.** The monorepo rule stops feature A from *importing* feature B; this rule decides who
> *owns* feature A and who must *review* a change to it. Every owned area maps to exactly one
> accountable team via **`CODEOWNERS`** (the merge-gate teeth) and **`scope:team-*` Nx tags** (the
> structural marker). Editing another team's owned area without that team's review is a **hard ban**
> (`CLAUDE.md`) — the agent is an untrusted contributor and gets no exemption.

## Why this exists (and why `monorepo-architecture.md` doesn't cover it)

`monorepo-architecture.md` enforces *dependency direction* — `scope:checkout ↛ scope:profile`. That
keeps the code decoupled, but says nothing about **accountability**: who's on the hook when
checkout breaks, and who has to approve a change to it. In a single-team repo those are the same
person, so it's invisible. Across teams, an unowned area is where consistency dies — anyone edits it,
no one reviews it against *its* conventions, and it drifts into a no-man's-land. Ownership makes the
"multiple teams" claim **real and enforced**, not narrative.

## The two ownership roles (mapped onto FSD layers)

FSD's layers give ownership a natural seam. **Module boundaries are not team boundaries**, but the
layer a slice lives on tells you *which kind* of team owns it:

### 1. The Platform Team — "The Gatekeepers" (own `shared/` and `app/`)

`shared/` is the design system + infrastructure every domain consumes, and `app/` is the global
shell. A change there ripples to everyone — so **any PR that adds/modifies/deletes a file under
`src/shared/` (or `src/app/`) is a hard block requiring Platform Team review** (enforced by
`CODEOWNERS` + branch protection).

> **The Litmus Test (the rule Platform applies when reviewing a `shared/` change):** *"If we
> copy-pasted this folder into a completely different company's app tomorrow, would it still make
> sense?"* If the code needs **any** knowledge of our specific domain (a business term like
> `Grievance`, an `Employee` type, a domain endpoint), it does **not** belong in `shared` — it's
> bounced back to the owning domain team to live in an `entity`/`feature`. This is the human form of
> the "no business terminology in `shared`" hard ban (`feature-sliced-design.md`).

### 2. Domain Teams — "The Feature Factories" (own assigned slices in `entities/` and `features/`)

A domain team owns whole slices (`features/file-grievance`, `entities/employee`, and the widgets that
compose them). **Inside their assigned slice directories they have full merge autonomy** — they don't
need another *domain* team's approval to ship within their boundary (they still pass the universal
constitution + CI gates).

> **The Multi-Tenant Rule:** if Team A needs a change to a slice Team B owns, A **cannot** edit B's
> files. A must either (a) **request a public-API change from Team B** (a new export on B's
> `index.ts`, or an `@x` entry on a B-owned entity), or (b) **handle the variation up in A's own
> `features/` layer** by composing B's *existing* public API differently. This is the FSD public-API
> barrier doubling as a team contract: B can rewrite its internals freely because no one reaches past
> its `index.ts`.

The sections below make these two roles legible to git (`CODEOWNERS`), the build (Nx tags), and the
agent (which reads both before touching code).

The owning team is the source of truth for *their* `project-specifics.md` rows, *their* ADRs, and
*their* slice of the `docs/architecture/` team map. This rule makes that ownership legible to git
(CODEOWNERS), to the build (Nx tags), and to the agent (which reads both before touching code).

## The three coupled artifacts (they must agree)

| Artifact | Form | Enforces | Lives in |
| --- | --- | --- | --- |
| **Team map** | A table | The human-readable source of truth | `docs/architecture/<system>.md` §5 (`system-architecture.md`) |
| **`CODEOWNERS`** | Path → team globs | **Required review** at merge (the teeth) | repo root or `.github/CODEOWNERS` |
| **`scope:team-*` Nx tags** | Project tags | Structural marker; lets lint/affected reason about ownership | each project's `project.json` `tags` |

If any two disagree, that's a bug to reconcile — **the team map is canonical**; `CODEOWNERS` and the
tags are projections of it. `memory-hygiene` and the architect flag drift between them.

## `CODEOWNERS` (the merge gate)

Map every owned area to a team. Last-match-wins in `CODEOWNERS`, so order **general → specific**.

```
# .github/CODEOWNERS — illustrative; use the repo's real teams + paths (Recon)
# Default owner — nothing is unowned.
*                               @org/platform

# Platform "Gatekeepers": shared/ + app/ are a hard block (changes ripple to everyone).
/src/shared/                    @org/platform
/src/app/                       @org/platform
/packages/contracts/            @org/platform        # see contracts-and-versioning.md

# Domain "Feature Factories": whole FSD slices → the one owning team.
/src/features/file-grievance/   @org/labour-relations
/src/entities/employee/         @org/labour-relations
/src/features/resolve-dispute/  @org/disputes
/src/widgets/grievance-dashboard/ @org/labour-relations

# The constitution + governance floor → only the standards owners may change.
/.claude/CLAUDE.md              @org/platform
/.claude/rules/                 @org/platform
```

Order **general → specific** (last-match-wins): the `*` default and the broad `/src/shared/` block
come before the per-slice rows.

- **Nothing is unowned** — a default `*` owner catches the gaps; an unowned path is a review hole.
- **Branch protection must "require review from Code Owners"** or `CODEOWNERS` is decorative.
- **Shared areas** (`shared/ui`, the contracts package, the constitution) are owned by the
  *stewarding* team because a change there hits every consumer — see `contracts-and-versioning.md`.

## `scope:team-*` tags (the structural marker)

Layer team scope onto the existing `type:*` / `scope:*` tags from `monorepo-architecture.md` — add,
don't replace:

```jsonc
// features/file-grievance/project.json — tags (illustrative)
{ "tags": ["type:feature", "scope:file-grievance", "scope:team-labour-relations"] }
```

This lets you run **`nx affected … --exclude` / ownership-scoped CI**, generate the CODEOWNERS-vs-tags
consistency check, and let the agent answer "whose code is this?" structurally. It does **not**
relax the dependency rules — `type:`/`scope:` boundaries from `monorepo-architecture.md` still hold.

## Cross-team changes (the rule with teeth)

A change that touches an area owned by a team you're not on:

1. **Needs that team's review** — that's what `CODEOWNERS` + branch protection enforce. No
   self-approval around it.
2. **Usually needs an ADR** if it moves a boundary or changes a shared contract
   (`adr.md` trigger) — the owning team co-authors or signs off.
3. **Updates the team map** if ownership itself shifts (`system-architecture.md`).

For the agent (Step 0 Recon): **before editing, determine the owning team** from `CODEOWNERS` /
tags. If it's not the team this work belongs to, say so and route the change through the owner's
review — don't quietly edit across the boundary. This is the hard ban, applied to AI-written code
exactly as to a human's (`governance.md`).

## Per-slice ownership marker (optional but recommended)

`CODEOWNERS` covers paths; it doesn't make ownership readable from inside a slice. The
recommended companion is a one-line `OWNERS` file in each slice root that names the team
tag — so a developer opening `src/entities/grievance/` sees the owner before they read
anything else.

```
# src/entities/grievance/OWNERS
scope:team-labor-relations
```

Optional `README.md` per slice — keep it short (purpose + public API surface + open
questions). Don't duplicate `docs/architecture/`; this is per-slice context, not
system-wide:

```md
# entities/grievance

**Owner:** scope:team-labor-relations

The grievance entity — Zod schema, read queries, read-only UI. **Mutations live in
features/file-grievance and features/resolve-dispute, never here.**

## Public API

- `Grievance`, `GrievanceSchema` — the typed model
- `getGrievanceById`, `listGrievances`, `listGrievanceSlugs` — server-only reads
- `useGrievances` — client React Query hook
- `<GrievanceCard>`, `<GrievanceRow>` — read-only views

## Open questions

- The `severity` field is currently `'low' | 'medium' | 'high'` — labor-relations team
  is considering adding `'critical'` Q3.
```

Rules:

- ❌ An `OWNERS` file disagreeing with `CODEOWNERS` — they must match.
- ❌ A `README.md` per slice that duplicates what `index.ts` already documents (the export
  list) without adding context (purpose, mutations-live-elsewhere notes, open questions).
- ✅ One-line `OWNERS` files on every owned slice (or none — pick a stance per repo and
  apply it everywhere).
- ✅ Optional `README.md` for slices with non-obvious history, multi-team context, or
  pending domain decisions.
- ✅ The `scaffold-component` / `scaffold-service` skills can be extended per repo to seed
  `OWNERS` when scaffolding into a new slice (record the per-repo automation in
  `project-specifics.md`).

## Hard rules

- ❌ **Editing another team's owned area without that team's review** (the `CLAUDE.md` hard ban).
  The agent flags ownership in Recon and routes cross-team edits through the owner.
- ❌ An **unowned** path (no `CODEOWNERS` match, even the default `*`) — every line of code has a team.
- ❌ `CODEOWNERS`, `scope:team-*` tags, and the `docs/architecture/` team map **disagreeing** —
  reconcile to the team map (canonical).
- ❌ Branch protection that doesn't **require Code Owner review** (CODEOWNERS becomes decorative).
- ✅ One accountable team per area; ownership legible in `CODEOWNERS` + tags + the team map, all
  consistent; cross-team changes reviewed by the owner (+ ADR when a boundary/contract moves).

## Checklist

- [ ] `CODEOWNERS` exists, has a default `*` owner, and maps every feature slice + shared area.
- [ ] Branch protection requires Code Owner review on the protected branch(es).
- [ ] Each project carries a `scope:team-*` tag consistent with `CODEOWNERS`.
- [ ] The `docs/architecture/` team map matches both.
- [ ] Recon identifies the owning team before any cross-boundary edit.

## Sources
- [GitHub — About code owners (`CODEOWNERS`)](https://docs.github.com/en/repositories/managing-your-repositories-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub — Require review from Code Owners (branch protection)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-pull-request-reviews-before-merging)
- [Nx — Tags & enforce-module-boundaries](https://nx.dev/features/enforce-module-boundaries)
- [Team Topologies — ownership & cognitive load](https://teamtopologies.com/key-concepts)
