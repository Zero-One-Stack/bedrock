---
name: kit-init
description: Install the kit's constitution into the current project — copy CLAUDE.md and the rules/ folder into the project's .claude/ so the agent can read them. Required after installing the bedrock plugin, because Claude Code plugins auto-load skills/agents/commands/hooks but NOT CLAUDE.md or rules/ (those must live in the project). Idempotent: re-running refreshes the universal rules while preserving the project's own rules/project-specifics.md. Use right after /plugin install, or to repair a project whose constitution is missing.
---

# kit-init — install the constitution into this project

The plugin already gave you the skills, agents, and commands (namespaced `/bedrock:*`). But
**plugins cannot auto-load `CLAUDE.md` or `rules/`** — those are memory files that must physically
live in the project. This skill copies them in.

## What it does

1. Locate the plugin's payload at `${CLAUDE_PLUGIN_ROOT}` — it contains `CLAUDE.md` and `rules/`.
2. Copy into the project:
   - `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md` → `./CLAUDE.md` (or `./.claude/CLAUDE.md` — match the
     project's convention; default to `./.claude/CLAUDE.md`).
   - `${CLAUDE_PLUGIN_ROOT}/rules/` → `./.claude/rules/` (all universal rule files).
3. **Generate `AGENTS.md` at the project root** so non-Claude AI tools (Cursor, Copilot, Codex,
   Aider, Windsurf, Zed) read the same constitution. Delegate to the `/bedrock:agents-md-export`
   skill — it produces a one-page distillation that points at `.claude/rules/` for depth.
4. **Preserve project memory:** if `./.claude/rules/project-specifics.md` already exists, **do NOT
   overwrite it** — keep the project's living memory. Copy the template version only if it's absent.
5. Report which files were written vs. preserved.

## Steps

```bash
# Resolve paths (the agent runs these, adapting to the project's CLAUDE.md location convention)
SRC="${CLAUDE_PLUGIN_ROOT}"
mkdir -p ./.claude/rules
mkdir -p ./.claude/docs/external-references

# Universal rules — refresh all EXCEPT project-specifics.md
for f in "$SRC"/rules/*.md; do
  base="$(basename "$f")"
  if [ "$base" = "project-specifics.md" ] && [ -f "./.claude/rules/project-specifics.md" ]; then
    echo "preserve: rules/project-specifics.md (existing project memory)"
    continue
  fi
  cp "$f" "./.claude/rules/$base"
done

# Bundled reference snippets (the "node_modules/next/dist/docs/" pattern — local docs
# the agent cat's instead of web-fetching). Refresh all on every init.
cp -R "$SRC"/docs/external-references/* ./.claude/docs/external-references/

# The constitution
cp "$SRC/CLAUDE.md" "./.claude/CLAUDE.md"
```

Then run `/bedrock:agents-md-export` to produce `./AGENTS.md` at the project root for non-Claude
tool compatibility. Confirm the routing table in the copied `CLAUDE.md` resolves to the copied
`rules/*.md`, and tell the user the constitution is installed. If this is an **enterprise**
project, follow with `/bedrock:enterprise-init` to wire the governance/hooks/ADR/CI pieces.

## Done when

`./.claude/CLAUDE.md` + `./.claude/rules/*.md` + `./.claude/docs/external-references/*.md` +
`./AGENTS.md` all exist, `project-specifics.md` is preserved (or seeded from template if new),
and the agent can read the constitution and the bundled reference snippets locally without
WebFetch. Report files written vs. preserved. On the project's first real task, the Step 0
Recon gate fills `project-specifics.md`.
