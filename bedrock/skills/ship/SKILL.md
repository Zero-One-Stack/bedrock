---
name: ship
description: Run the kit's whole four-phase cadence in ONE command — recon → plan → build every unit bottom-up → verify → review → auto-fix, looping until the gates pass, instead of you re-prompting at each phase. Use when the user says "ship X", "build the X feature/dashboard/page end to end", "do the whole cadence", "run plan through review", "keep going until it passes", or asks for any non-trivial frontend change spanning more than one component. For a typo or one-line fix, skip this and just make the change.
---

# ship — the working cadence, executed end to end

`rules/working-cadence.md` defines the kit's four-phase rhythm. This skill **runs** it, so a
feature costs one command instead of a dozen re-prompts with the plan decaying in scrollback
between them.

```
recon → plan → build (per unit, bottom-up) → verify → review → fix ⟲ → done
```

## Route: workflow first, inline fallback

**Step 1 — is the scripted runner installed?** Check for
`.claude/workflows/bedrock-ship.js` in the project.

- **Present** → run it: `/bedrock-ship <the user's task>`. It holds the loop in a script, so
  intermediate results live in script variables rather than a context window, and the run is
  resumable and watchable via `/workflows`. This is the good path.
- **Absent** → offer to install it (below), then fall back to **Inline mode** for this run.

**Step 2 — install the runner (once per project).** Copy the payload the plugin ships:

```bash
mkdir -p .claude/workflows
cp "${CLAUDE_PLUGIN_ROOT}/workflows/bedrock-ship.js" .claude/workflows/bedrock-ship.js
```

Claude Code loads dynamic workflows only from a project's `.claude/workflows/` or
`~/.claude/workflows/` — **a plugin cannot ship one directly**, which is why this copy step
exists. It requires Claude Code ≥ 2.1.154 with dynamic workflows enabled (a paid-plan
feature; check the Dynamic workflows row in `/config`). If workflows are unavailable, say so
plainly and use Inline mode — do not pretend the scripted run happened.

## Inline mode (fallback)

Same phases, driven by you in-conversation. The discipline that makes this work is **writing
the plan to a file** — the manual cadence's core failure was that the plan and the review
findings only ever existed as chat text, so by unit four the build had drifted from the plan.

1. **Recon** — complete the Step 0 gate from `CLAUDE.md`. Read
   `.claude/rules/project-specifics.md` first and reuse its cache. Never invent a script name,
   alias, or token.
2. **Plan** — decompose into ordered units (bottom-up: `shared → entities → features →
   widgets → pages → app`). **Write it to `.claude/plans/<slug>.md`** using the template
   below, with the build order as checkboxes.
3. **Build** — work the checkboxes in order, one unit at a time, ticking each as it lands.
   Re-read the plan file between units rather than trusting memory. If a unit turns out
   impossible as specified, **stop and update the plan** — do not improvise a different
   design (`working-cadence.md` calls this out as the highest-value rule in the rhythm).
4. **Verify** — run `/bedrock:verify-build`. Mandatory; a change is not done without it.
5. **Review** — run `/bedrock:fe-review`. Append findings to the plan file's Findings
   section so a second pass doesn't re-derive them.
6. **Fix ⟲** — fix blockers at the source (never suppress, never `any`-cast, never
   `eslint-disable` to silence a gate), then return to step 4. Cap at ~3 rounds; if it's
   still red, report honestly rather than declaring success.

### Plan file template — `.claude/plans/<slug>.md`

```markdown
# Plan — <feature>

**Scope:** <one or two sentences: what changes>
**Not in scope:** <the scope-creep guard — name what this is NOT>
**Rules in scope:** <the rules/*.md that govern this work>

## Recon
<the filled Step 0 Recon block — real scripts, aliases, tokens, styling engine>

## Data & boundaries
<entity reads vs feature writes; Server Components vs the 'use client' leaf>

## Build order
- [ ] 1. <layer> — <unit id> — <what + target path>
- [ ] 2. …

## Risks / open questions
- <ambiguities; do not invent answers>

## Findings (filled during review)
- [ ] <severity> — <file> — <finding> → <fix>
```

## Reporting

Close with what actually happened, not a summary that flatters the run:

- units built vs blocked (and why blocked),
- the verify result — name the gates that ran **and the ones the repo doesn't have**,
- the review verdict and any unfixed findings,
- whether an **ADR** is warranted (`/bedrock:adr`) — a new route, a new layer convention, or
  a decision that picks one architecture over alternatives needs one recorded,
- anything written back to `rules/project-specifics.md` (new slices, Recon cache, overrides).

If the run ended with gates still failing, say so in the first line. A red run reported as
green is worse than no run.

## Guardrails

- **Don't skip Recon** even when the task looks obvious — the gate exists because example
  names in the rules are illustrative, not facts about this repo.
- **Don't parallelize the build.** FSD units depend on the layers below them, and concurrent
  writers collide on a slice's `index.ts` public API.
- **Don't argue with review findings** — fix them, or log a dated waiver in
  `project-specifics.md` per `governance.md`.
- **Trivial changes don't need this.** A typo or one-line fix should just be made; the
  rhythm is overhead there (`working-cadence.md` § "When to skip the rhythm").

## Done when

Every planned unit is built or explicitly reported blocked, `/bedrock:verify-build` passes,
`/bedrock:fe-review` returns no blockers, and the plan file reflects what was actually built.
