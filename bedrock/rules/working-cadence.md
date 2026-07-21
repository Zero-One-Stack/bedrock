# Rule: Working cadence — how to ship a change with this kit

> ## Run it in one command
>
> This file describes the rhythm. **`/bedrock-ship <task>` executes it** — recon → plan →
> build each unit bottom-up → verify → review → auto-fix, looping until the gates pass,
> without you re-prompting at each phase. `/bedrock:kit-init` installs the runner at
> `.claude/workflows/bedrock-ship.js` (Claude Code loads dynamic workflows only from a
> project directory, so a plugin can't ship one directly).
>
> If dynamic workflows aren't available, `/bedrock:ship` runs the same phases inline and
> writes the plan to `.claude/plans/<slug>.md`. **Read on for what each phase must produce**
> — the runner follows this rule, it doesn't replace it.

> **Recommended (not mandated).** The kit's standards are enforced; this file is the
> **working rhythm** that strings them together. Compared to methodology kits like
> [superpowers](https://github.com/obra/superpowers) or
> [compound-engineering](https://github.com/EveryInc/compound-engineering-plugin), bedrock's
> cadence is **lighter** — it leans on agents the kit already ships (`/architect`,
> `component-builder`, `frontend-reviewer`) instead of introducing a parallel pipeline.
> Follow this when the work is non-trivial (touches more than one component); for a one-line
> fix, the rhythm is overkill — go straight to the change.

## The four-phase loop

```
                          ┌──── brainstorm ────┐
                          │  (1) understand    │
                          │  (2) reduce        │
                          └─────────┬──────────┘
                                    ▼
                          ┌────── plan ────────┐
                          │  /architect        │
                          │  (decompose)       │
                          └─────────┬──────────┘
                                    ▼
                          ┌──── execute ───────┐
                          │  scaffolders       │   ← /scaffold-component
                          │  + component-      │   ← /scaffold-service
                          │    builder         │   ← /add-design-token
                          └─────────┬──────────┘
                                    ▼
                          ┌──── review ────────┐
                          │  /verify-build     │
                          │  + frontend-       │
                          │    reviewer        │
                          └─────────┬──────────┘
                                    │
                              (pass) │ (fail)
                                    ▼ ▲
                              merge   └── back to execute
```

Each phase has a fixed output the next phase consumes. Skipping a phase is a debt; the work
either lands incomplete or accumulates rework. The phases are intentionally short — the
**point** is short loops, not long phases.

## Phase 1 — Brainstorm (understand + reduce)

**Goal:** turn the request into one or two crisp sentences naming what changes and what
doesn't.

The kit doesn't ship a separate "brainstorm" agent — Claude's general conversation IS the
brainstorm. The discipline is:

1. **Restate the request** in your own words. If you can't, ask one clarifying question.
2. **Name what's NOT in scope.** "This is a button variant, not a new design language."
   "This is a single feature, not a refactor of the entity model." Scope creep starts here.
3. **Recon** — read the relevant `.claude/rules/<topic>.md`, `.claude/rules/project-
   specifics.md`, and the closest sibling code. **No guesses about the project's
   conventions.** (See `CLAUDE.md` § Step 0.)
4. **List the constraints in scope:** which rules apply, which hard bans could be tripped,
   which existing code can be reused.
5. **Decide: small or large.**
   - **Small** (< 3 files, no architectural decision, no new slice): skip to execute. The
     rhythm is overkill.
   - **Large** (multi-component, new slice, architectural question, multi-team): proceed
     to plan.

**Phase 1 output:** one paragraph stating the scope, a short list of rules in scope, and a
go/no-go on planning.

## Phase 2 — Plan (`/architect`)

**Goal:** produce a decomposition the executor can follow without re-deciding placement.

The `frontend-architect` agent (`/architect`) is the planner. It exists precisely for this
phase. It reads `architecture.md`, `feature-sliced-design.md`, `component-structure.md`, and
`services-and-data.md`, and produces a six-section plan:

1. **Scope & decomposition** — FSD layer map: which routes → pages → widgets → features →
   entities → shared; new vs existing.
2. **Data & state plan** — server reads (entity `api/` — server-only `queries.ts` + client
   `hooks.ts`) vs server writes (feature `api/` Server Actions) vs client vs form state.
3. **Render & boundary plan** — Server Components by default; the `'use client'` leaf; where
   Suspense / `loading.tsx` / `error.tsx` sit.
4. **Component inventory** — every unit placed on its FSD layer/slice/`ui` segment,
   new-vs-reuse, tokens needed.
5. **Build order & routing** — bottom-up handoff: tokens → services → components leaves-first
   → route wiring → verify → review.
6. **Risks & open questions** — surface ambiguities; don't invent answers.

**Phase 2 output:** the six-section plan, ending with the **first concrete command** to run.
For multi-app questions, use `/monorepo` (monorepo-architect) instead.

> **Write the plan to a file — `.claude/plans/<slug>.md`.** This is the rule that makes the
> cadence hold together. A plan that lives only in chat scrollback decays: by the fourth
> unit the builder has drifted from the placement decisions the plan made, which is exactly
> the drift the kit exists to prevent. The build order goes in as checkboxes, ticked as each
> unit lands, and Phase 4's findings are appended to the same file. `frontend-architect` and
> `frontend-reviewer` are deliberately read-only agents, so **the orchestrator writes the
> file on their behalf** — `/bedrock-ship` does this automatically.

> **The planner plans; it does not write code.** Resist asking the architect to "just
> implement it" — that's the next phase, and the planning artifact is what makes the
> implementation correct.

## Phase 3 — Execute (scaffolders + `component-builder`)

**Goal:** produce code that satisfies the plan, one unit at a time, against the constitution.

The plan from Phase 2 names units in build order. Each unit is one of:

| Unit type | Skill / agent |
| --- | --- |
| New design token | `/add-design-token` |
| New service (entity read / feature write) | `/scaffold-service` |
| New component (any FSD layer) | `/scaffold-component` |
| New monorepo scaffold | `/scaffold-monorepo` |
| Component with non-trivial logic | `component-builder` agent (build to the full contract per `component-structure.md` + `component-composition.md`) |
| Unit/integration test | `/scaffold-unit-test` |
| E2E spec | `/scaffold-e2e` |

The execute phase is **the only phase that writes code**. Build leaves first (Phase 2's
build order). After each unit:

- The PreToolUse hook fires at write time (catches the most common architectural mistakes
  before the file lands; see `governance.md` § "Enforcement matrix" for what it catches and
  what it can't).
- `eslint-plugin-bedrock` runs as you type and on commit (`tools/eslint-plugin-bedrock/`).
- The unit's own test runs (Phase 3 is also when tests are scaffolded per the plan).

**Phase 3 output:** the implementation + tests, with no rule violations the hook or ESLint
flagged.

> **Stop and replan if the plan was wrong.** If executing reveals a missing service, a
> needed entity, or a layer-placement question the plan didn't answer, **don't improvise** —
> go back to Phase 2 and update the plan. This is one of the highest-value rhythm rules; the
> "we'll fix it in review" antipattern is what produces drift.

## Phase 4 — Review (`/verify-build` + `frontend-reviewer`)

**Goal:** verify that what was built matches the plan, satisfies the constitution, and
passes every mechanical gate.

Two artifacts:

1. **`/verify-build`** — proves the change compiles, tokens resolve, no new cycle, unit +
   E2E pass — via the repo's real scripts. This is the **mechanical** layer: Steiger +
   dependency-cruiser + lint + typecheck + tests + `audit-design-system` in `--ci` mode.
   `/verify-build` is mandatory before the next step.
2. **`frontend-reviewer`** (via `/fe-review`) — reads the diff against the constitution,
   runs `/verify-build` if you didn't, and returns severity-grouped findings
   (Blocker / Should fix / Nit) with a merge verdict.

**Phase 4 output:** a clean `/verify-build` + a reviewer verdict. Findings either:

- Are accepted → go back to Phase 3 (execute the fix; don't argue in review).
- Are waived → logged in `project-specifics.md` per `governance.md`'s waiver mechanism
  (rare; needs justification + expiry).

## Where the rhythm departs from superpowers / compound-engineering

| | bedrock | superpowers / compound-eng |
| --- | --- | --- |
| Phases | 4 (brainstorm/plan/execute/review) | 4–5 (brainstorm/plan/execute/review/compound) |
| Agents | Existing kit agents (`architect`, `builder`, `reviewer`) | Methodology-specific agents |
| Standards layer | The kit IS the standards | Methodology + bring-your-own standards |
| Drift catch | Layered enforcement (hook + ESLint + CI + reviewer) | Reviewer-only |
| Memory | ADRs + Tech Radar + `project-specifics.md` | Skill-based |
| Best fit | Teams shipping a React/Next.js app | Teams choosing the methodology first |

The two approaches are **complementary, not exclusive**. If a team uses superpowers for the
larger meta-rhythm and bedrock for the React/Next.js standards layer, the rhythms align —
bedrock's plan/execute/review IS superpowers' middle three phases for the React/Next part of
the work.

## Hard rules (for the rhythm itself)

- ❌ **Skipping the plan on a non-trivial change.** Drift starts when execute happens
  without a decomposition. The "I'll just sketch it" antipattern produces three placements
  of the same concept across the codebase.
- ❌ **Writing code in Phase 2** (`/architect` produces a plan, not files).
- ❌ **Improvising past the plan when execute reveals a gap.** Stop, replan; don't
  silently expand scope.
- ❌ **Argueing with `frontend-reviewer` findings in chat.** Either fix them or log a
  waiver in `project-specifics.md`.
- ❌ **Declaring "done" without `/verify-build` passing.** The mechanical gate is
  non-optional.
- ✅ Brainstorm is short — one paragraph, one go/no-go.
- ✅ Plan is the six-section template from `architecture.md`; nothing else.
- ✅ Execute proceeds bottom-up (the FSD import direction) so every dependency exists
  before its consumer.
- ✅ Review is layered: hook → ESLint → CI → reviewer agent → human review.

## When to skip the rhythm

| Change | Recommended rhythm |
| --- | --- |
| One-line bug fix | Skip Phases 1–2; execute + review only. |
| Typo / copy update | Execute only. |
| Single existing-component variant | Phases 3–4 only (re-use existing plan if any). |
| New atom / molecule | Full rhythm (Phase 1 is short — one paragraph). |
| New feature/widget/entity | Full rhythm. Don't shortcut. |
| New page or route | Full rhythm + ADR (per `adr.md`). |
| Architectural change (new layer convention, slice migration) | Full rhythm + ADR + Tech Radar entry. |

## Sources

- [superpowers — methodology kit](https://github.com/obra/superpowers)
- [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)
- This file ties together: `architecture.md` (planning) · `component-structure.md`
  (building) · the `scaffold-*` skills · `frontend-reviewer` (`/fe-review`) ·
  `verify-build` · `governance.md` (waivers when findings can't be fixed).
