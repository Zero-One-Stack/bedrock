#!/usr/bin/env bash
# Token-coverage fitness function — fail if a component CSS Module contains a LITERAL design value
# instead of a token var(--…). Enforces styling-and-tokens.md ("no hex/rgb/raw px") as a CI gate,
# catching what the PreToolUse hook (single-edit) can't see across the whole tree.
# Usage:  ci/fitness/check-token-coverage.sh [src-dir]   (default: src)
set -euo pipefail
ROOT="${1:-src}"
fail=0

# Scan .module.css (and .css co-located with components). Skip the generated tokens stylesheet.
while IFS= read -r -d '' f; do
  case "$f" in *tokens.css|*node_modules/*) continue;; esac

  # Literal hex colors:
  if grep -nEi '#[0-9a-f]{3,8}\b' "$f" >/dev/null; then
    echo "✗ $f: literal hex color — use a token var(--…)"; grep -nEi '#[0-9a-f]{3,8}\b' "$f" | sed 's/^/    /'; fail=1
  fi
  # rgb()/hsl() literals:
  if grep -nEi '\b(rgb|rgba|hsl|hsla)\(' "$f" >/dev/null; then
    echo "✗ $f: literal rgb/hsl — use a token"; fail=1
  fi
  # Raw px/rem NUMERIC values outside var() — allow 0, 1px borders, and var(...) usages.
  # Conservative: flag px/rem on color/spacing-ish props only would need a parser; here we flag
  # any non-zero px/rem that isn't inside a var(). Tune as needed.
  if grep -nE ':[^;]*[^0a-z-]([2-9]|[1-9][0-9]+)(\.[0-9]+)?(px|rem)\b' "$f" | grep -v 'var(' >/dev/null; then
    echo "⚠ $f: raw px/rem literal — prefer a spacing/size token"; grep -nE ':[^;]*[^0a-z-]([2-9]|[1-9][0-9]+)(\.[0-9]+)?(px|rem)\b' "$f" | grep -v 'var(' | sed 's/^/    /'
    # Treat as warning by default (don't set fail); flip to fail=1 to make it blocking.
  fi
done < <(find "$ROOT" -type f \( -name '*.module.css' -o -name '*.css' \) -print0 2>/dev/null)

[ "$fail" -eq 0 ] && echo "✓ token coverage: no literal colors in component CSS" || { echo "FAIL: literal design values found — add tokens via /add-design-token"; exit 1; }
