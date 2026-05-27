#!/usr/bin/env bash
# SessionStart hook — inject the project's living memory + the Recon gate reminder
# into context at the start of every session, deterministically (not reliant on the
# model choosing to read it). Output on stdout becomes additional context.
set -euo pipefail

proj="${CLAUDE_PROJECT_DIR:-.}"
ps="$proj/.claude/rules/project-specifics.md"
adr_dir="$proj/docs/adr"

echo "## Enterprise kit — session preamble (injected by hook)"
echo
echo "Before generating code you MUST complete the Step 0 Recon gate (see CLAUDE.md) and read"
echo "rules/project-specifics.md. Honor its Approved overrides; do not silently deviate."
echo

if [[ -f "$ps" ]]; then
  echo "### project-specifics.md is present — read it first for this project's memory."
else
  echo "### project-specifics.md NOT found — this project hasn't been initialized. Run /enterprise-init."
fi

if [[ -d "$adr_dir" ]]; then
  count="$(find "$adr_dir" -name '[0-9]*.md' 2>/dev/null | wc -l | tr -d ' ')"
  echo "### $count Architecture Decision Record(s) in docs/adr/ — these are the authoritative 'why'."
  echo "Consult them before re-deciding anything architectural; supersede, don't silently contradict."
fi

exit 0
