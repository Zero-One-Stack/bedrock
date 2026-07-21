---
name: doctor
description: Diagnose whether the bedrock kit is actually installed AND actually enforcing in this project — checks the constitution, rules, workflow runner, hooks, jq, ESLint plugin + recommended config, Steiger/dependency-cruiser, project-specifics memory, and the ADR scaffold. Use when the user says "is bedrock working", "check the kit", "why isn't the hook firing", "doctor", "health check", "did kit-init work", after installing or updating the plugin, or when a rule that should have been blocked wasn't. Reports each layer as ENFORCED / DEGRADED / MISSING with the exact fix.
---

# doctor — is the kit actually enforcing?

The kit's worst failure mode is **silent non-enforcement**: everything looks installed, but
`jq` is missing so the hooks no-op, or the ESLint plugin was never added to the project's
config, so a dozen hard bans quietly fall back to a reviewer that may not run. This skill
turns that into a one-command diagnosis.

Run the checks below, then report a table. **Never report a layer as enforced without
evidence** — an unchecked layer is `UNKNOWN`, not a pass.

## Checks

```bash
echo "=== 1. Constitution ==="
test -f ./.claude/CLAUDE.md && echo "OK  .claude/CLAUDE.md" || echo "MISSING  → run /bedrock:kit-init"
ls ./.claude/rules/*.md 2>/dev/null | wc -l | xargs -I{} echo "{} rule file(s) in .claude/rules/"
test -f ./.claude/rules/project-specifics.md \
  && echo "OK  project-specifics.md" || echo "MISSING  → run /bedrock:kit-init"

echo "=== 2. Cadence runner ==="
test -f ./.claude/workflows/bedrock-ship.js \
  && echo "OK  /bedrock-ship available" \
  || echo "MISSING  → cp \"\${CLAUDE_PLUGIN_ROOT}/workflows/bedrock-ship.js\" .claude/workflows/"

echo "=== 3. jq (hooks depend on it) ==="
command -v jq >/dev/null 2>&1 \
  && echo "OK  jq $(jq --version)" \
  || echo "MISSING  → brew install jq. Without it ALL write-time enforcement silently no-ops."

echo "=== 4. Hooks wired ==="
grep -l "block-banned-patterns\|require-verify-build" \
  ./.claude/settings.json ./.claude/settings.local.json 2>/dev/null \
  || echo "NOT in project settings (fine if the plugin provides them — confirm with /hooks)"

echo "=== 5. ESLint — the deterministic layer ==="
test -f eslint.config.js -o -f eslint.config.mjs && echo "OK  flat config present" || echo "MISSING flat config"
grep -qr "eslint-plugin-bedrock\|bedrock.configs" eslint.config.* 2>/dev/null \
  && echo "OK  eslint-plugin-bedrock referenced" \
  || echo "NOT WIRED  → copy ci/eslint.config.recommended.js (see /bedrock:enterprise-init step 4b)"
grep -qr "jsx-a11y" eslint.config.* 2>/dev/null \
  && echo "OK  jsx-a11y wired" || echo "NOT WIRED  → a11y bans fall back to the reviewer"

echo "=== 6. FSD architecture linters ==="
# A config file is NOT a gate. Check the config, the installed binary, AND the CI step —
# the pilot found all three out of sync (config present, package absent, CI commented out).
test -f steiger.config.ts && echo "config  steiger.config.ts" || echo "MISSING steiger config"
test -f .dependency-cruiser.cjs && echo "config  .dependency-cruiser.cjs" || echo "MISSING dep-cruiser config"
ls node_modules/.bin/steiger >/dev/null 2>&1 \
  && echo "OK    steiger installed" \
  || echo "INERT steiger config present but package NOT installed → nothing runs"
ls node_modules/.bin/depcruise >/dev/null 2>&1 \
  && echo "OK    dependency-cruiser installed" \
  || echo "INERT dep-cruiser config present but package NOT installed → nothing runs"
# Match only ACTIVE run-steps: strip the "file:line:" prefix, drop commented lines, and
# require an actual invocation. A commented-out step and an incidental path-regex mention
# both look like a hit to a naive grep — that produces a false "enforced".
grep -rhn "steiger\|depcruise" .github/workflows/*.yml 2>/dev/null \
  | sed -E 's/^[0-9]+://' \
  | grep -vE "^\s*#" \
  | grep -qE "run:|pnpm|npx|yarn" \
  && echo "OK    actively invoked in CI" \
  || echo "NOT IN CI (absent or commented out) → no merge gate"

echo "=== 6b. Is this repo even FSD-shaped? ==="
found=0
for d in entities features widgets shared pages; do
  test -d "src/$d" && { echo "  has src/$d"; found=1; }
done
[ "$found" -eq 0 ] && echo "  NO FSD layers → repo is PRE-MIGRATION. Enabling the FSD gates now
  would fail on nearly every file. Route to /bedrock:migrate-to-kit and enable the gates per
  migrated slice instead."

echo "=== 7. Governance / ADR ==="
test -d docs/adr && echo "OK  docs/adr ($(find docs/adr -name '[0-9]*.md' 2>/dev/null | wc -l | tr -d ' ') records)" \
  || echo "MISSING  → /bedrock:enterprise-init"
```

Then **prove the ESLint layer actually runs** rather than trusting the grep — a config can
reference the plugin and still not resolve it:

```bash
npx eslint --print-config src/app/page.tsx 2>&1 | grep -c "bedrock/" || true
```

Zero means the rules are not active on that path. If ESLint errors with
`Could not find plugin "bedrock"`, the flat config is missing `plugins: { bedrock }` — the
plugin's `configs.recommended` supplies it.

## Report

One row per layer:

| Layer | Status | Fix |
| --- | --- | --- |
| Constitution (`CLAUDE.md` + rules) | ENFORCED / MISSING | `/bedrock:kit-init` |
| Cadence runner (`/bedrock-ship`) | … | copy the workflow payload |
| Write-time hooks (needs `jq`) | ENFORCED / **DEGRADED** / MISSING | `brew install jq` |
| ESLint (`bedrock` + ecosystem) | … | `ci/eslint.config.recommended.js` |
| FSD linters (Steiger / dep-cruiser) | … | `/bedrock:enterprise-init` |
| ADR / governance | … | `/bedrock:enterprise-init` |

Lead with the **most consequential** broken layer, not the first one checked. `jq` missing
and ESLint not wired are the two that silently void the most rules — call either out
explicitly rather than burying it in the table.

Close by naming which hard bans are currently enforced **by the reviewer agent alone**, so
the user knows where the kit is relying on judgment instead of a deterministic gate. Cross-
reference the enforcement matrix in `rules/governance.md`.
