---
name: adr
description: Create a new Architecture Decision Record (or supersede an existing one) in docs/adr/ using the MADR template. Use when a decision is made that picks one architecture/tech option over alternatives, sets or moves a module boundary, establishes a cross-cutting convention, or deviates from the constitution (a logged override). Records the why and the rejected alternatives as durable, append-only memory. Reverse a past decision by superseding its ADR, never by editing it.
arguments:
  - name: title
    description: Short decision title (e.g. "adopt TanStack Router over Next routing")
argument-hint: "<short decision title>"
---

# ADR — record an architecture decision

Create durable, append-only decision memory. **Read `rules/adr.md` first.** Decision: **$title**

## Steps

1. **Confirm it's trigger-level** (`rules/adr.md`): option-over-alternatives, a boundary, a
   cross-cutting convention, or a constitution override. If it's routine, don't write an ADR.
2. **Next number:** find the highest `docs/adr/NNNN-*.md` and increment (zero-padded). Create
   `docs/adr/NNNN-<kebab-title>.md` from `docs/adr/0000-template.md`.
3. **Fill every section** — especially **Considered options** and **why not the others** (the
   rejected paths are the part that pays off later). Set Status: `Proposed` (or `Accepted` if the
   user has the authority and has decided), Date (today), Deciders, Tags.
4. **Link the constitution:** if this confirms/extends a `rules/*.md`, say which. **If it's a
   deviation from a hard ban,** this ADR is the justification — also add the row to
   `rules/project-specifics.md` → *Approved overrides* pointing to `docs/adr/NNNN`.
5. **Superseding?** If this reverses an Accepted ADR: set the old one's status to
   `Superseded by ADR-NNNN`, set this one's to `Supersedes ADR-MMMM`, and cross-link both. **Never
   edit the old decision's body.**
6. Record the new ADR in `rules/project-specifics.md` → *Architecture decisions* (date, decision,
   link).

## Done when

The ADR file exists with all sections filled (alternatives named), status + cross-links correct,
and `project-specifics.md` references it. Report the ADR number, title, and status. If it overrides
the constitution, restate the override and where it's logged.
