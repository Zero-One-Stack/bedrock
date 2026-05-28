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

tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')"
content="$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')"

# Only police app source; skip config, tests-of-the-rules, generated, node_modules, the kit itself.
case "$path" in
  *node_modules/*|*/dist/*|*/.next/*|*/coverage/*|*tokens.css|*/.claude/*) exit 0 ;;
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
esac
[[ "$path" =~ \.(ts|tsx|js|jsx|css)$ ]] || exit 0

# Strip a leading UTF-8 BOM so anchors that expect line-1 content aren't fooled.
content="${content#$'\xEF\xBB\xBF'}"

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

# FSD: @x cross-imports are entities-only. A path like features/<slice>/@x/, widgets/<slice>/@x/,
# pages/<slice>/@x/ is a misuse — resolve via compose-from-above or push-down (feature-sliced-design.md).
# Patterns match repos with or without a `src/` wrapper (Next.js, Nx, Turborepo).
case "$path" in
  */features/*/@x/*|*/widgets/*/@x/*|*/pages/*/@x/*)
    block "FSD: @x cross-imports are allowed only on the entities layer" "rules/feature-sliced-design.md" ;;
esac
printf '%s' "$content" \
  | grep -Eq "from ['\"][^'\"]*/(features|widgets|pages)/[^/'\"]+/@x/" \
  && block "FSD: @x cross-import on non-entities layer (features/widgets/pages)" "rules/feature-sliced-design.md"

# Next.js: 'use client' must NEVER appear at the top of a page/route — push it to a feature/widget leaf.
# Targets (covers `src/`-wrapped + flat repos and JS/TS):
#   • the Next.js App Router page file:   <root>/app/**/page.{ts,tsx,js,jsx}
#   • the FSD page slice's screen file:   src/pages/<route>/ui/<PascalCase>Page.{tsx,jsx}
# We only check Writes (whole-file content). An Edit's `new_string` is a snippet and would yield
# false-negatives if we tried; the directive lives at file start so a Write covers the real case.
# Screen file is restricted to the direct child of ui/ ending in `Page.{tsx,jsx}` so nested client
# leaves (e.g. ui/sections/Header.tsx with 'use client') are not falsely blocked.
if [[ "$tool" == "Write" ]]; then
  is_route_page=0
  if [[ "$path" =~ /app(/.*)?/page\.(tsx|ts|jsx|js)$ ]]; then is_route_page=1; fi
  if [[ "$path" =~ /src/pages/[^/]+/ui/[^/]+Page\.(tsx|jsx)$ ]]; then is_route_page=1; fi
  if (( is_route_page )); then
    # Look for a top-of-file `'use client'` (or "use client") directive among the first ~5 non-blank,
    # non-comment lines. Tolerates a leading license comment but doesn't blindly scan the whole file.
    head_lines="$(printf '%s' "$content" | awk 'NR<=20' )"
    if printf '%s' "$head_lines" | grep -Eq "^[[:space:]]*['\"]use client['\"][[:space:]]*;?[[:space:]]*$"; then
      block "'use client' at the top of a page/route — push it to a feature/widget leaf" "rules/feature-sliced-design.md"
    fi
  fi
fi

# Server-only: entity reads and feature Server Actions must declare their runtime so they cannot
# be accidentally bundled into the client. queries.ts → `import 'server-only';`; *.action.ts → `'use server';`.
# Only enforced on Write (whole-file content); Edit/MultiEdit send only the changed snippet, so we
# can't tell whether the directive is already present elsewhere in the file. Writes — i.e. creating
# or overwriting the file — are the moment when the directive must land.
if [[ "$tool" == "Write" ]]; then
  case "$path" in
    */entities/*/api/*.queries.ts|*/entities/*/api/*.queries.js)
      # Anchor: a real `import 'server-only';` (or "server-only") statement, not a quoted token in a comment.
      printf '%s' "$content" | grep -Eq "^[[:space:]]*import[[:space:]]+['\"]server-only['\"]" \
        || block "entity queries.ts must declare \`import 'server-only';\` (prevents client-bundle leak)" "rules/services-and-data.md" ;;
    */features/*/api/*.action.ts|*/features/*/api/*.action.tsx|*/features/*/api/*.action.js|*/features/*/api/*.action.jsx)
      # Directive must be the FIRST non-blank, non-comment statement.
      first_stmt="$(printf '%s' "$content" \
        | awk 'BEGIN{in_block=0} /^[[:space:]]*$/{next} /^[[:space:]]*\/\//{next} /^[[:space:]]*\/\*/{in_block=1} in_block{if(/\*\//){in_block=0; next} else next} {print; exit}')"
      if ! printf '%s' "$first_stmt" | grep -Eq "^[[:space:]]*['\"]use server['\"][[:space:]]*;?[[:space:]]*$"; then
        block "feature *.action.ts must declare \`'use server';\` as the first statement of the file" "rules/services-and-data.md"
      fi ;;
  esac
fi

# Secrets-shaped literals in client code (very conservative: long hex/JWT-like assigned to a const).
printf '%s' "$content" | grep -Eq "(api[_-]?key|secret|password|token)[\"' ]*[:=][\"' ]*[A-Za-z0-9_\-]{20,}" && block "hardcoded secret-shaped literal" "rules/security.md"

exit 0
