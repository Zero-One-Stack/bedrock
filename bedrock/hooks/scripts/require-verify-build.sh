#!/usr/bin/env bash
# Stop hook — the cadence's mechanical gate, made real.
#
# working-cadence.md calls /verify-build "non-optional" and CLAUDE.md says to close
# the loop with it, but nothing enforced that: the agent could edit source and
# declare "done" with no signal to the user. This reads the audit log the
# PostToolUse hook already writes (nothing else consumed it) and blocks the stop
# once if source files changed without a verification run.
#
# Advisory by design: it blocks at most ONCE per session, so it prompts the gate
# without trapping anyone in a loop.
set -euo pipefail

proj="${CLAUDE_PROJECT_DIR:-.}"
audit="$proj/.claude/audit/agent-actions.jsonl"
flag="$proj/.claude/audit/.verify-reminded"

emit_allow() { exit 0; }

# No jq → no reliable parse. Degrade to a no-op rather than block on a guess;
# session-context.sh warns about the missing dependency at startup.
command -v jq >/dev/null 2>&1 || emit_allow

input="$(cat 2>/dev/null || true)"
[ -n "$input" ] || emit_allow

# Never block a stop that is itself the result of a previous block.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  emit_allow
fi

# One reminder per session.
[ -f "$flag" ] && emit_allow
[ -f "$audit" ] || emit_allow

# Did this session touch source files? Route/config-only edits don't need the gate.
touched="$(jq -rs --arg s "$(printf '%s' "$input" | jq -r '.session_id // ""')" '
  [ .[]
    | select((.session_id // "") == $s or $s == "")
    | (.file_path // .tool_input.file_path // "")
    | select(test("(^|/)(src|app)/.*\\.(ts|tsx|js|jsx|css|scss)$"))
  ] | length' "$audit" 2>/dev/null || echo 0)"

[ "${touched:-0}" -gt 0 ] 2>/dev/null || emit_allow

# Did a verification actually run? The audit log records Bash commands too.
verified="$(jq -rs '
  [ .[]
    | ((.tool_input.command // "") + " " + (.command // ""))
    | select(test("verify-build|tsc|typecheck|steiger|depcruise|dependency-cruiser|vitest|jest|playwright|npm test|pnpm test|yarn test"))
  ] | length' "$audit" 2>/dev/null || echo 0)"

[ "${verified:-0}" -gt 0 ] 2>/dev/null && emit_allow

mkdir -p "$(dirname "$flag")" 2>/dev/null || true
touch "$flag" 2>/dev/null || true

# Block once, with a concrete next step.
cat <<'JSON'
{
  "decision": "block",
  "reason": "Source files under src/ or app/ changed but no verification ran. The kit's cadence treats this gate as non-optional (working-cadence.md Phase 4). Run /bedrock:verify-build now — it proves the change compiles, tokens resolve, no cycle was introduced, and lint/tests pass using the repo's real scripts. If a gate genuinely doesn't exist in this repo, say which and why rather than skipping silently. If the edits were docs/config only, say so and stop."
}
JSON
exit 0
