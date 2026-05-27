#!/usr/bin/env bash
# PreToolUse hook — deterministic enforcement of the kit's hard bans.
# Reads the tool-call JSON on stdin; exits 2 to BLOCK the write, 0 to allow.
# This is the "enforcement, not documentation" layer: the model cannot skip it.
#
# Scope: only inspects Edit/Write/MultiEdit content destined for source files.
# It is intentionally conservative — it blocks the unambiguous hard bans and
# warns on the rest, so it never fights a legitimate edit. Tune per project via
# the project's .claude/settings.local.json (a logged override) if needed.
set -euo pipefail

input="$(cat)"

# Extract path + content from the tool input (jq required; degrade gracefully).
if ! command -v jq >/dev/null 2>&1; then
  exit 0   # no jq → don't block; the CI fitness functions still catch it.
fi

path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')"
content="$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')"

# Only police app source; skip config, tests-of-the-rules, generated, node_modules, the kit itself.
case "$path" in
  *node_modules/*|*/dist/*|*/.next/*|*/coverage/*|*tokens.css|*/.claude/*) exit 0 ;;
esac
[[ "$path" =~ \.(ts|tsx|js|jsx|css)$ ]] || exit 0

block() { echo "BLOCKED (kit hard ban): $1 — see $2. Override only via a logged entry in rules/project-specifics.md." >&2; exit 2; }

# Hard bans that are unambiguous from content alone:
printf '%s' "$content" | grep -Eq "from ['\"]@chakra-ui" && block "Chakra UI import (styling-owning lib)" "rules/styling-and-tokens.md"
printf '%s' "$content" | grep -Eq "from ['\"]effector" && block "Effector import (banned server-state store)" "rules/services-and-data.md"
printf '%s' "$content" | grep -Eq "from ['\"](styled-components|@emotion/styled)" && block "runtime CSS-in-JS import" "rules/styling-and-tokens.md"

# FSD: deep import past a slice's public API (index.ts). Importing into a slice's segment
# (entities|features|widgets|pages)/<slice>/<segment>/... bypasses the public-API barrier.
# The slice root (…/<slice>) and the @x cross-import API (…/<slice>/@x/…) are allowed entries.
printf '%s' "$content" \
  | grep -Eq "from ['\"][^'\"]*/(entities|features|widgets|pages)/[^/'\"]+/(ui|model|api|lib|config)/" \
  && block "FSD deep import past a slice's public API (import the slice's index.ts instead)" "rules/feature-sliced-design.md"
# Secrets-shaped literals in client code (very conservative: long hex/JWT-like assigned to a const).
printf '%s' "$content" | grep -Eq "(api[_-]?key|secret|password|token)[\"' ]*[:=][\"' ]*[A-Za-z0-9_\-]{20,}" && block "hardcoded secret-shaped literal" "rules/security.md"

exit 0
