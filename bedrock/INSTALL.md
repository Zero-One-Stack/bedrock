# Install Guide — apply this Claude kit across all your projects

**One kit, `bedrock`** — the engineering constitution *and* the enterprise governance
(managed-settings, hooks, ADRs, tech-radar, CI fitness functions, policy-as-code), all in one.
This covers every way to install it, from a single repo to your whole org.

> **Paths:** examples below use `$KIT` for the path to your local checkout of this plugin's
> `bedrock/` directory (e.g. `/path/to/bedrock/bedrock`), and `<kits-repo>` for the git URL or local
> path you pass to `/plugin marketplace add`. Substitute your own.

---

## Decide your install method

| Method | Best for | Updates |
| --- | --- | --- |
| **A. Plugin + marketplace** | Teams / many repos / org rollout | `/plugin update` |
| **B. Copy into the repo** | One project, full control, version it in git | `/sync-kit` |
| **C. Managed settings (org floor)** | Locking Tier-0 controls on every machine | MDM-pushed |

All three work. Most orgs use **A** or **B** for the kit per repo, plus **C** for the locked floor.
Apply to **existing** and **new** projects the same way.

---

## A. Plugin install (recommended for scale)

The kit is packaged at the plugin root; the catalog is `Claude-Kits/.claude-plugin/marketplace.json`.
One-time, per machine:

```text
# In any Claude Code session:
/plugin marketplace add <kits-repo>     # repo holding .claude-plugin/marketplace.json
/plugin install bedrock@zos        # the one kit
```

The plugin auto-loads **skills, agents, commands, and hooks** (namespaced `/bedrock:*`).
Then, **per project**:

```text
/bedrock:kit-init          # copies CLAUDE.md + rules/ into ./.claude/  (run first)
/bedrock:enterprise-init   # wires hooks, CI configs, ADR + radar scaffolding, policy
```

> **Why `kit-init` is required:** plugins auto-load skills/agents/commands/hooks, but **cannot
> auto-load `CLAUDE.md` or `rules/`** — those must physically live in the project. `kit-init` copies
> them in (preserving any existing `project-specifics.md`). This is the documented plugin pattern.

Plugins pin by `version`/`ref` → reproducible installs; bump on release. `/reload-plugins` while
iterating; `/plugin update` to adopt a new version.

---

## B. Copy into a repo (per-project, version-controlled)

### B1 — a single project

> **Layout note:** the kit is stored at the **plugin root** (`skills/ agents/ commands/ rules/
> hooks/ CLAUDE.md` directly under `bedrock/`). When copying, assemble the project's classic
> `.claude/` from those parts; the enterprise root dirs (`ci/ policy/ docs/`) go to the repo root.

```bash
KIT=/path/to/bedrock/bedrock     # your local checkout of this plugin's bedrock/ dir
cd /path/to/your/project
mkdir -p .claude/rules

# Constitution + components into .claude/ (preserves your project memory)
cp "$KIT/CLAUDE.md" .claude/CLAUDE.md
cp -R "$KIT/agents" "$KIT/commands" "$KIT/skills" "$KIT/hooks" .claude/
for f in "$KIT"/rules/*.md; do
  [ "$(basename "$f")" = project-specifics.md ] && [ -f .claude/rules/project-specifics.md ] && continue
  cp "$f" .claude/rules/
done

# Enterprise pieces to the repo root
mkdir -p docs/adr docs/radar .github/workflows
cp -n "$KIT"/docs/adr/0000-template.md docs/adr/
cp -n "$KIT"/docs/radar/radar.md docs/radar/
cp "$KIT"/ci/.dependency-cruiser.cjs .
cp -R "$KIT"/ci/fitness .
cp -R "$KIT"/policy .
cp "$KIT"/ci/github-actions-enterprise.yml .github/workflows/ci.yml
```

Then in Claude Code: **`/bedrock:enterprise-init`** (wires hooks into `.claude/settings.json`,
routes the rules, seeds memory) and commit. Step 0 Recon fills `project-specifics.md` on first task.

> ⚠️ The loop above skips an existing `project-specifics.md` (your living memory) and uses `cp -n`
> for ADRs/radar so it never clobbers them. `/sync-kit` enforces the same protection.

### B2 — wire the hooks (so enforcement is live)

Merge `hooks/hooks.json`'s `hooks` key into the project's `.claude/settings.json`. If you installed
via the **plugin (A)**, the hooks come bundled — skip this. Add `.claude/audit/` to `.gitignore`
(unless the org wants the audit log committed as evidence).

### B3 — apply to ALL your existing projects at once

```bash
KIT=/path/to/bedrock/bedrock     # your local checkout of this plugin's bedrock/ dir
cat > /tmp/repos.txt <<'EOF'
/path/to/project-a
/path/to/project-b
/path/to/project-c
EOF

while read -r repo; do
  [ -d "$repo/.git" ] || { echo "skip (not a git repo): $repo"; continue; }
  echo "→ $repo"
  mkdir -p "$repo/.claude/rules" "$repo/docs/adr" "$repo/docs/radar" "$repo/.github/workflows"
  cp "$KIT/CLAUDE.md" "$repo/.claude/CLAUDE.md"
  cp -R "$KIT/agents" "$KIT/commands" "$KIT/skills" "$KIT/hooks" "$repo/.claude/"
  for f in "$KIT"/rules/*.md; do
    [ "$(basename "$f")" = project-specifics.md ] && [ -f "$repo/.claude/rules/project-specifics.md" ] && continue
    cp "$f" "$repo/.claude/rules/"
  done
  cp -n "$KIT"/docs/adr/0000-template.md "$repo/docs/adr/" 2>/dev/null
  cp -n "$KIT"/docs/radar/radar.md "$repo/docs/radar/" 2>/dev/null
  cp "$KIT"/ci/.dependency-cruiser.cjs "$repo/"; cp -R "$KIT"/ci/fitness "$repo/"; cp -R "$KIT"/policy "$repo/"
  cp "$KIT"/ci/github-actions-enterprise.yml "$repo/.github/workflows/ci.yml"
done < /tmp/repos.txt
```

`cp -n` protects existing ADRs/radar. Open each repo, run **`/bedrock:enterprise-init`**, then
commit on a branch (`chore/adopt-claude-kit`) and PR — don't push straight to a shared default branch.

### B4 — bringing a NON-greenfield repo onto the standard

If the repo already uses Chakra/Effector/loose conventions, after copying the kit run
**`/migrate-to-kit`** instead of expecting instant compliance. It produces a phased plan and logs
time-boxed waivers in `project-specifics.md` so the repo converges without a big-bang rewrite.

---

## C. Managed settings — the locked org floor (every machine)

This is the Tier-0 layer projects **cannot weaken**. Deploy `managed-settings/managed-settings.json`
(after tuning it for your org) to the OS path via MDM/Ansible:

| OS | Path |
| --- | --- |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux/WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\ProgramData\ClaudeCode\managed-settings.json` |

For **Claude for Teams/Enterprise**, push server-managed settings from the admin console instead of
MDM — same effect. See `managed-settings/README.md` for what it locks and how precedence works.

> Optionally also deploy an org-wide **managed CLAUDE.md** (same dirs, or `claudeMd` in managed
> settings) so the constitution's headline bans load on every machine regardless of repo.

---

## Keeping projects up to date

- **Plugin installs (A):** `/plugin update bedrock@zos`.
- **Copied installs (B):** run **`/sync-kit`** in the project — it pulls changed universal files from
  the vault master and **never touches `project-specifics.md`** or your `docs/adr/`.
- **Improving the standard:** edit the **vault master** (not a project copy), then sync/update
  projects. Project-specific facts stay in `project-specifics.md`; never fork the constitution.

---

## Verify the install worked

In a target project, start Claude Code and check:

1. The **SessionStart** preamble appears (hook injecting memory + Recon reminder). → hooks are live.
2. `/architect`, `/component`, `/fe-review`, `/adr`, `/enterprise-init` are available. → skills/commands loaded.
3. Ask Claude to "read the constitution" — it should cite `CLAUDE.md` + the routing table including
   `governance.md`, `adr.md`, `compliance.md`, `tech-radar.md`. → all rules routed.
4. `.github/workflows/ci.yml` + `.dependency-cruiser.cjs` + `policy/` exist. → CI fitness functions in place.
5. (If org-deployed) try a denied action — it's blocked by managed settings. → Tier-0 floor live.

---

## Troubleshooting

- **Hooks not firing:** they only run when enabled; check `.claude/settings.json` has the `hooks`
  key (B2) or the plugin is installed (A). `disableAllHooks` in managed settings turns them all off.
- **`jq` missing:** the block/audit hooks degrade gracefully (no block) without `jq` — install it so
  enforcement is active; CI fitness functions still catch violations regardless.
- **CI scripts fail:** the workflow uses illustrative script names — set them to the repo's real
  `package.json` scripts (Step 0 Recon). dependency-cruiser globs assume `src/{components,features,…}`.
- **Sync overwrote something:** `/sync-kit` preserves `project-specifics.md` + `docs/adr/`; if you
  used the manual `cp -R` of the base `.claude`, that overwrites universal files only — re-apply your
  overlay additions (B1).
