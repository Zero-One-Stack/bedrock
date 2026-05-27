#!/usr/bin/env bash
# PostToolUse hook — append an audit record for every file mutation.
# Produces the SOC 2 / governance change-management evidence the research calls for:
# an immutable, append-only log of what the agent changed, when, in which session.
# Writes JSONL to .claude/audit/agent-actions.jsonl (gitignored or shipped per policy).
set -euo pipefail

input="$(cat)"
command -v jq >/dev/null 2>&1 || exit 0

dir="${CLAUDE_PROJECT_DIR:-.}/.claude/audit"
mkdir -p "$dir"

tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')"

# Only log mutating tools.
case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit) ;;
  *) exit 0 ;;
esac

jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg session "${CLAUDE_SESSION_ID:-unknown}" \
  --arg tool "$tool" \
  --arg path "$path" \
  '{ts:$ts, session:$session, tool:$tool, path:$path}' >> "$dir/agent-actions.jsonl"

exit 0
