---
name: adr-index
description: Generate or refresh docs/adr/README.md — a rollup index of all Architecture Decision Records (number, title, status, date, supersedes/superseded links). Use when the user says "list the ADRs", "what decisions have we made", "index the ADRs", "show me the decision records", "what did we decide about X", after creating or superseding an ADR, or periodically, so the agent and humans can see all decisions at a glance instead of opening each file. Keeps the durable memory navigable as it grows.
---

# adr-index — roll up the ADRs into a navigable index

As `docs/adr/` grows, the decision memory gets hard to scan. This generates a single index so the
"why" is one click away. **Read `rules/adr.md` first.**

## Steps

1. List `docs/adr/NNNN-*.md` (skip `0000-template.md`).
2. For each, parse the front block: number, title (the `# NNNN. Title` heading), **Status**, **Date**,
   and any `Supersedes ADR-MMMM` / `Superseded by ADR-NNNN` links.
3. Write `docs/adr/README.md`:

```md
# Architecture Decision Records

Durable, append-only decision memory (see ../../rules/adr.md). Newest first.
An Accepted ADR is binding context — supersede, never edit.

| # | Title | Status | Date | Links |
|---|-------|--------|------|-------|
| 0007 | Adopt TanStack Router | Accepted | 2026-05-20 | supersedes 0003 |
| 0003 | Routing approach | Superseded by 0007 | 2026-03-01 | |
...

## By status
- **Accepted:** 0001, 0002, 0007 …
- **Superseded:** 0003 …
- **Proposed:** 0009 …
```

4. Sort newest-first by number; group the "By status" lists. Flag any **dangling supersede link**
   (points at a non-existent ADR) or an ADR that contradicts an Accepted one without superseding it.

## Done when

`docs/adr/README.md` reflects every ADR with correct status + links, and any inconsistency is
reported. Re-run anytime; it's idempotent (regenerates from the files, which are the source of truth).
