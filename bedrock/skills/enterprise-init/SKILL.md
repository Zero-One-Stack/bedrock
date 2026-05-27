---
name: enterprise-init
description: Apply the enterprise overlay onto a project that already has (or is getting) the base bedrock kit. Wires the enforcement hooks into the project's settings, drops the ADR scaffolding (docs/adr/ + template), installs the CI fitness-function configs (dependency-cruiser, GitHub Actions, SBOM), adds the governance/compliance/adr rules, and seeds project-specifics.md. Use once per project when adopting the enterprise edition, or to check an existing project is fully wired. Idempotent — re-running reconciles, never duplicates.
---

# Enterprise Init — apply the overlay to a project

Bring a project up to the **enterprise** tier on top of the base kit. **Read `rules/governance.md`,
`rules/adr.md`, and `rules/compliance.md` first**, and do Step 0 Recon (the project's package
manager, scripts, CI provider). This is idempotent: re-running detects what's present and only fills
gaps.

## Preconditions

- The base constitution is in the project (`./.claude/CLAUDE.md` + `./.claude/rules/`). If not, run
  **`/bedrock:kit-init`** first (or copy the base kit) — the overlay layers on top, it doesn't
  replace. (Plugin install gives you the skills/agents/hooks; `kit-init` installs the rules payload.)
- Source paths below resolve from **`${CLAUDE_PLUGIN_ROOT}`** when installed as a plugin, or the
  overlay's vault dir when copying manually.

## Steps

1. **Rules:** copy `${CLAUDE_PLUGIN_ROOT}/rules/{governance,adr,compliance,tech-radar,system-architecture,team-ownership,contracts-and-versioning,release-and-deploy}.md`
   into the project's `./.claude/rules/`. Add their rows to `./.claude/CLAUDE.md`'s routing table and
   `rules/README.md` index if missing — including the `team-ownership` **hard ban** in `CLAUDE.md`
   (editing another team's area without review).
2. **ADR memory:** create `docs/adr/` and copy `${CLAUDE_PLUGIN_ROOT}/docs/adr/0000-template.md` if
   absent. (Never touch existing ADRs.) Run `/adr-index` to seed `docs/adr/README.md`.
2b. **Tech Radar:** if this is the org's first enterprise project (or no shared radar is referenced),
    copy `${CLAUDE_PLUGIN_ROOT}/docs/radar/radar.md` to `docs/radar/`. Otherwise point at the shared one.
2c. **Policy-as-code:** copy `${CLAUDE_PLUGIN_ROOT}/policy/` (rego + `waivers.yaml`) to the repo;
    the CI workflow's Conftest step references it. Keep `waivers.yaml` empty until a real exception arises.
2d. **System architecture:** if the project is multi-team or multi-deploy (the triggers in
    `system-architecture.md`), create `docs/architecture/` and copy
    `${CLAUDE_PLUGIN_ROOT}/docs/architecture/0000-template.md` as the seed; have the architect fill the
    landscape (containers + team map). Below those triggers, skip it — a filled `project-specifics.md`
    is enough until the system grows one.
2e. **Team ownership (multi-team repos only):** if the system has >1 team, ensure a `CODEOWNERS`
    (repo root or `.github/`) maps every feature slice + shared area to a team with a default `*`
    owner, add `scope:team-*` tags to each `project.json`, and turn on branch protection's **"require
    review from Code Owners"** — without it the `team-ownership.md` hard ban has no teeth. Keep
    `CODEOWNERS`, the tags, and the `docs/architecture/` team map consistent. Single-team repo: skip.
3. **Hooks:** the plugin's `hooks/hooks.json` loads automatically when the enterprise plugin is
   installed (scripts resolve via `${CLAUDE_PLUGIN_ROOT}`). For a **copy** install, merge
   `hooks/hooks.json` into the project's `.claude/settings.json` `hooks` key and point the commands
   at the copied scripts. Confirm the three hooks (SessionStart context, PreToolUse ban-block,
   PostToolUse audit). Add `.claude/audit/` to `.gitignore` unless the org wants the log committed.
3b. **Verify enforcement is live:** hooks run only when enabled; if the org uses
    `managed-settings.json`, confirm it's deployed (see `managed-settings/README.md`) — the locked
    tier a project can't weaken.
4. **CI fitness functions:** copy `${CLAUDE_PLUGIN_ROOT}/ci/.dependency-cruiser.cjs` to repo root
   (adapt path globs to the real layout) and `${CLAUDE_PLUGIN_ROOT}/ci/github-actions-enterprise.yml`
   to `.github/workflows/ci.yml` (adapt script names). Ensure `size-limit`, an a11y check, and
   `@cyclonedx/cyclonedx-npm` are wired.
5. **Seed memory:** if `rules/project-specifics.md` is the bare template, run the Recon gate and fill
   its cache; add a *This project* note that the enterprise overlay is applied + which compliance
   regime applies (record client-specific HIPAA/PCI/PIPEDA as a Tier-0 project constraint).
6. **Record the adoption** as an ADR (`/adr "adopt enterprise overlay"`) so the decision + date are durable.

## Done when

The enterprise rules are present + routed (governance, adr, compliance, tech-radar, and — for
multi-team/multi-deploy systems — system-architecture, team-ownership, contracts-and-versioning,
release-and-deploy, incl. the team-ownership hard ban in `CLAUDE.md`), `docs/adr/` exists with the
template, hooks are wired (and the managed tier's status is known), the CI gate + SBOM + ADR-check
(+ the `governance-checks` job for multi-team repos) are in the workflow, and `project-specifics.md`
reflects the overlay. For multi-team systems: `docs/architecture/` is seeded and `CODEOWNERS` +
branch-protection Code-Owner review are in place. Report what was added vs. already present, and
anything that needs an org-level action (deploying `managed-settings.json`, enabling branch protection).
