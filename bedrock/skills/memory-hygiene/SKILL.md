---
name: memory-hygiene
description: Reconcile a project's living memory (rules/project-specifics.md) against the actual repo so it stays true — detect a stale Recon cache (script/alias/runner that changed), FSD slices listed that no longer exist (or exist but aren't listed), expired override/waiver entries, and ADR decisions not reflected. Use periodically, after a big refactor, or when the agent suspects the memory has drifted from reality. Memory that lies is worse than no memory.
---

# memory-hygiene — keep project memory honest

`project-specifics.md` is only useful if it's **true**. Code changes; the memory file silently goes
stale (a renamed script, a deleted feature, an expired waiver still listed as active). This skill
reconciles the memory against reality. **Read `rules/project-specifics.md` and `rules/governance.md`.**

## Checks (report drift; fix the safe ones, flag the rest)

1. **Recon cache vs. repo** — re-derive package manager, scripts (`package.json`), import aliases
   (`tsconfig.json`), test runner, token source/paths. Flag any line that no longer matches; update it.
2. **FSD slice inventory** — compare the listed slices (`src/entities/*`, `src/features/*`,
   `src/widgets/*`, `src/pages/*`) and their `@x` links against what's on disk. Add ones that exist
   but aren't listed; flag ones listed but deleted. (Run Steiger to surface drift.)
3. **Token sample** — confirm the "confirmed real tokens" still exist in the generated `tokens.css`.
4. **Approved overrides / waivers** — cross-check against `policy/waivers.yaml` and `docs/adr/`:
   - An override row with no backing ADR → flag (governance.md requires both).
   - An **expired** waiver still presented as active → flag for renew-or-remove.
   - A waiver whose stated migration ("Chakra gone by Q3") is actually done → propose removing it.
5. **Architecture decisions vs. ADRs** — every row in *Architecture decisions* should point to an
   ADR; every Accepted ADR's decision should be reflected. Flag mismatches (run `/adr-index` to help).
6. **Multi-team consistency (if the repo has `docs/architecture/` + `CODEOWNERS`)** —
   reconcile the three coupled artifacts from `team-ownership.md` + `system-architecture.md`:
   - The **team map** (`docs/architecture/<system>.md` §5) ↔ **`CODEOWNERS`** ↔ **`scope:team-*`**
     tags (`project.json`) — they must agree; the team map is canonical. Flag any disagreement.
   - **Containers in the doc vs. on disk** — apps/zones/packages the landscape lists that no longer
     exist (or exist but aren't in the doc); a stale landscape lies. Flag for update.
   - **Unowned paths** — any `features/*` / `shared/*` with no `CODEOWNERS` match. Flag.

## Output

A short reconciliation report: **updated** (safe, factual corrections made), **flag** (needs a human
call — deleted feature, expired waiver, missing ADR), and **clean** (verified true). Don't invent
history; if you can't confirm something, flag it rather than guess.

## Done when

`project-specifics.md` matches the repo for the cache + inventory (or the mismatches are flagged),
override/waiver freshness is checked against `policy/` + `docs/adr/`, and the report lists every
change made vs. flagged. Memory that can't be trusted gets fixed or flagged — never left to mislead.
