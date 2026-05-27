---
name: sync-kit
description: Update a project's copy of this kit from the canonical master (the bedrock plugin — via /plugin update if plugin-installed, or your local checkout of the repo) — pulling in new/changed universal rules, agents, skills, and commands WITHOUT overwriting the project's own living memory (rules/project-specifics.md) or its approved overrides. Use when the kit's universal constitution has improved and you want an existing project to adopt the update, or to check whether a project's kit is behind the master. Two-tier model: the constitution is shared and synced; project-specifics.md is local and preserved.
---

# Sync Kit

Bring a project's `.claude/` up to date with the **canonical master** while preserving everything
that makes that project *that* project. This is the mechanism that lets one improvement (a new
rule, a fixed agent) reach every project, without flattening each project's local memory.

**Canonical master:** the `bedrock` plugin (plugin-root layout: `CLAUDE.md`, `rules/`, `agents/`,
`commands/`, `skills/` at the root). If the project was **plugin-installed**, prefer
`/plugin update bedrock@zos` for the auto-loaded parts and `/bedrock:kit-init` to refresh the copied
`CLAUDE.md`+`rules/`. Otherwise point at your local checkout of the repo's `bedrock/` directory;
confirm the path with the user if you can't find it.

## The two tiers (what syncs vs. what's preserved)

| Tier | Files | On sync |
| ---- | ----- | ------- |
| **Universal constitution** (shared) | `CLAUDE.md`, `rules/*.md` **except** `project-specifics.md`, `agents/*`, `skills/*`, `commands/*`, `README.md` | **Updated** from master (globbed — new rule files are picked up automatically). |
| **Doc templates** (scaffolded, not synced) | `docs/adr/0000-template.md`, `docs/radar/radar.md`, `docs/architecture/0000-template.md` | **Not** copied by this skill — they're scaffolded by `/enterprise-init`. If master added/changed a template, **flag it and tell the user to re-run `/bedrock:enterprise-init`** (idempotent; fills only what's absent). |
| **Project memory** (local) | `rules/project-specifics.md`, the project's real `docs/adr/*`, `docs/architecture/<system>.md` | **Never overwritten.** Preserved as-is. |

## Steps

1. **Locate both.** The project's `.claude/` (current repo) and the master. If the project has no
   `.claude/` yet, this is a first install — copy the whole folder, then leave `project-specifics.md`
   as the template for Recon to fill.
2. **Diff, don't clobber.** For each universal file, compare project vs. master. Show the user a
   summary of what would change (new files, changed files, files the project has that master
   doesn't). Don't apply blindly.
3. **Protect project memory.** **Never** copy master's `project-specifics.md` over the project's.
   If master added new *sections* to the template, surface them so the user can merge the new
   section headers in by hand — but keep all existing project content.
4. **Respect local edits to universal files.** If the project has intentionally diverged a
   universal file (rare — usually that belongs in `project-specifics.md` as an override), flag the
   conflict and ask before overwriting; don't silently discard a local change.
5. **Apply** the accepted updates. Then re-read `CLAUDE.md`'s version note / `README.md` so the
   project reflects the new constitution.
6. **Re-validate.** If rules changed in a way that affects existing code (e.g. a new hard ban),
   note it and suggest a `frontend-reviewer` pass so the project gets brought into line.
7. **Surface new doc templates / enforcement.** If a synced rule is **enterprise** (⛨) and the
   project is enterprise, check whether master has a doc template or CI fitness function the project
   lacks (e.g. master added `docs/architecture/0000-template.md` or the `governance-checks` CI job).
   This skill doesn't copy those — **tell the user to re-run `/bedrock:enterprise-init`** (idempotent;
   it scaffolds only what's absent). Example: a project that adopted the kit before the multi-team
   layer gets the new `rules/*.md` from this sync, but needs `enterprise-init` for the
   `docs/architecture/` template, the `CODEOWNERS`/Code-Owner gate, and the new CI job.

## Direction matters

- **master → project:** the normal flow (a project adopts kit improvements). This skill.
- **project → master:** if a *project* discovered a genuinely universal improvement, port it back
  to the vault master by editing the master directly (not via this skill), so every future project
  and every other synced project gets it. Keep project-specific facts out of the master.

## Done when

The project's universal files match the intended master version, `project-specifics.md` (and the
project's real ADRs / architecture doc) is untouched, and the user has seen the summary of what
changed. Report which files updated, which were preserved, any conflict that needs a human decision,
and — if master added enterprise templates/CI the project lacks — the prompt to re-run
`/bedrock:enterprise-init`.
