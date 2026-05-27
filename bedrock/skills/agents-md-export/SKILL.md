---
name: agents-md-export
description: Generate an AGENTS.md at the project root from the kit's constitution, so the same standards apply in non-Claude AI tools (Cursor, Copilot, Codex, etc.) that read the open AGENTS.md format. It distills CLAUDE.md's hard bans + the rules routing into a concise, tool-agnostic instruction file, and keeps it in sync. Use when a project is worked on with multiple AI tools, or to publish the standard in the cross-tool standard.
---

# agents-md-export — mirror the constitution into AGENTS.md

`CLAUDE.md` is Claude-specific. **`AGENTS.md`** is the open "one file, every tool" standard that
Cursor, Copilot, Codex, and others read. This exports the constitution so the *same* standard holds
regardless of which AI tool touches the repo — without duplicating maintenance (AGENTS.md is
generated from, and points back to, the kit).

## Principle

Keep `AGENTS.md` **short and behavioral** — every line should change what an agent does. It is a
*distillation + pointer*, not a copy of all 16+ rules. The kit's `rules/` remain the source of truth.

## Steps

1. Read the project's `.claude/CLAUDE.md` (hard bans, routing table, stack, quality bar) and the
   `rules/README.md` index.
2. Write `./AGENTS.md` at the project root:

```md
# AGENTS.md

Engineering standard for this repo (source of truth: `.claude/CLAUDE.md` + `.claude/rules/`).
Any AI tool working here MUST follow this.

## Before writing code
Do Step 0 Recon: read package.json scripts, tsconfig aliases, the real token names, the test
runner, and `.claude/rules/project-specifics.md`. Don't guess; names in docs are illustrative.

## Hard bans (a reviewer fails the change on any)
<distilled bullet list from CLAUDE.md — Effector, Chakra/CSS-in-JS, any/unchecked-as, hardcoded
design values, unconfirmed tokens, FSD violations (upward/same-layer-slice/deep imports, business
logic in shared, mutation in an entity), circular deps, shipping without unit+E2E, inaccessible UI,
security holes, …>

## How to build
Place by FSD layer (feature-sliced-design.md) → plan (architecture.md) → build to the
file-per-concern contract (component-structure.md) → tokens only (styling-and-tokens.md) → entity
reads / feature writes (services-and-data.md) → unit + E2E
(testing.md) → verify (compiles, tokens resolve, no cycles, lint) → review.

## Where the detail lives
See `.claude/rules/<topic>.md` (routing table in `.claude/CLAUDE.md`). Per-project facts and
approved overrides: `.claude/rules/project-specifics.md`.
```

3. Keep it **under ~1 page**. Add a top comment: "Generated from the kit — edit the rules, not this."
4. If `AGENTS.md` already exists and was hand-edited, reconcile rather than clobber; flag conflicts.

## Done when

`./AGENTS.md` exists, distills the hard bans + build flow, points to `.claude/` for depth, and stays
under a page. Report what it covers and that the kit remains the source of truth.

## Source
- [AGENTS.md — the open cross-tool agent-instructions standard](https://agents.md/)
