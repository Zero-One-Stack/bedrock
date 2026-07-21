# Rule: Governance (locked tiers, waivers, audit)

> **Non-negotiable (enterprise overlay).** Standards hold at org scale only when there's a **locked
> top tier** projects can't weaken, a **delegated tier** they can tune, and **deviations captured as
> explicit, expiring, logged waivers** — never silent forks. The agent is an *untrusted contributor*:
> its output runs the same gates as a human's.

## The tiers (what's locked vs. delegated)

| Tier | Where | Who controls | Can a project weaken it? |
| --- | --- | --- | --- |
| **0 — Locked org floor** | `managed-settings.json` (OS-deployed) + hard bans in `CLAUDE.md` enforced by hooks + CI fitness functions | Org / platform owner | **No.** Inherited, not overridable. |
| **1 — Delegated standard** | `rules/*.md` constitution | Org default, project may extend | Only via a **logged waiver** (below). |
| **2 — Project memory** | `rules/project-specifics.md`, `docs/adr/` | The project team | Freely, within tiers 0–1. |

Tier 0 is the small set of genuinely non-negotiable controls (dangerous-command/secret denies,
no-bypass, approved MCP list, the hard-ban fitness functions). Everything else is Tier 1/2 — teams
adapt through memory and waivers, which is how new golden paths get discovered.

## Waivers (the only way to deviate)

A deviation from a Tier-1 rule is allowed **only** as an explicit waiver. Two coupled records:

1. **Decision + rationale →** an **ADR** (`docs/adr/`, `rules/adr.md`) — the durable "why".
2. **The override flag →** a row in `rules/project-specifics.md` → *Approved overrides*: rule,
   reason, approver, **date**, and an **expiry / review date**. No row = the rule still holds.

Waivers are **time-boxed**: a migration exception ("Chakra in `features/legacy/*` until Q3") has a
removal milestone, so debt stays visible and doesn't become permanent by default. The kit ships this
as real policy-as-code in **`policy/`** (Conftest/OPA over `package.json`): banned/pinned deps fail
CI, and the **only** way through is a dated, approved, **expiring** entry in `policy/waivers.yaml` —
which the gate honors until it expires, then fails (forcing renew-or-remove). OPA/Conftest decision
output is the audit trail. The same approach extends to settings, `tsconfig`, or IaC.

Tier 0 is **not** waivable by a project. Changing it is an org-level decision to the managed settings.

## Audit & observability (SOC 2 evidence falls out of the workflow)

- **Agent actions** are logged by the PostToolUse audit hook to `.claude/audit/agent-actions.jsonl`
  (what changed, when, which session) — treat agent sessions as auditable events, not ephemeral chats.
- **Decisions** are in immutable ADRs; **change control** is PRs + the CI gate; **access** is the
  managed permission rules. Together these are the change-management evidence a SOC 2 auditor wants —
  produced by normal work, not a separate compliance effort.
- **Config tampering:** the `ConfigChange` hook can flag unauthorized edits to settings/skills.

## The enforcement matrix (what catches what, where)

Bedrock's enforcement is **layered**: PreToolUse hooks at write time, ESLint/Stylelint as you
type and on commit, Steiger/dependency-cruiser/OPA in CI, and the `frontend-reviewer` agent
on every diff. The layers are designed to backstop each other — **no single layer is a
guarantee**, and writing prose as if it were is overclaiming.

The kit ships `eslint-plugin-bedrock` at `tools/eslint-plugin-bedrock/` covering the six
rules the ecosystem doesn't have a great match for. Everything else composes from the
ecosystem — and the kit now ships that composition as a working flat config at
**`ci/eslint.config.recommended.js`** (`eslint-plugin-bedrock` + `jsx-a11y` +
`typescript-eslint` + `import/no-cycle` + `@next/next` + `no-restricted-syntax`). Copy it to
the project root as `eslint.config.js`. Without it, every row below whose only ✓ is in the
ESLint column falls back to the reviewer agent — a non-deterministic gate.

Legend: **✓** enforced · **◐** partial or requires project configuration · **—** not enforced
at this layer.

| Rule | Hook (write-time) | ESLint/Stylelint | Steiger/dep-cruiser/OPA (CI) | Reviewer agent |
| --- | --- | --- | --- | --- |
| Deep slice import past `index.ts` | ✓ (Edit/Write/MultiEdit) | ✓ `bedrock/no-deep-slice-import` | ✓ (Steiger `fsd/no-public-api-sidestep`) | ✓ |
| `@x` on `features/widgets/pages` | ✓ | ✓ `bedrock/no-cross-feature-x-import` | ✓ (Steiger `fsd/forbidden-imports`) | ✓ |
| Event emitter built outside `shared/lib/events` (a slice's own bus) | — | ✓ `bedrock/events-only-from-shared` | — (no CI check — ESLint is the only mechanical gate) | ✓ |
| Off-contract / wrong-payload bus event | — | ✓ (typecheck — `emit`/`on` generic over `AppEventName`) | — | ✓ |
| Bus misuse (state/command/request-response on the bus; event where the cache would do) | — | — | — | ✓ (judgment — `cross-slice-communication.md`) |
| `'use client'` at root `app/**/page.tsx` or page slice screen | ✓ (Write only — file shape needed) | ✓ `bedrock/no-use-client-at-page-top` | — | ✓ |
| Entity `*.queries.ts` missing `import 'server-only';` | ✓ (Write only) | ✓ `bedrock/require-server-only-on-queries` (autofixable) | — (Next build fails if it ever leaks into a client) | ✓ |
| Feature `*.action.ts` missing `'use server';` as first statement | ✓ (Write only) | — (Next refuses to expose it) | — | ✓ |
| Same-layer slice imports | — | ✓ (`eslint-plugin-boundaries`) | ✓ (Steiger `fsd/forbidden-imports`) | ✓ |
| Circular dependencies / barrel cycles | — | ✓ (`import/no-cycle`) | ✓ (`madge --circular`, dep-cruiser) | ✓ |
| Primitive token use in components | — | ✓ `bedrock/no-primitive-token-in-component` | — (`check-token-coverage.sh` greps literal hex/px only — it cannot tell a primitive token from a semantic one) | ✓ |
| Banned dependencies (Effector/Redux for server state) | ✓ (import string match) | ✓ (`no-restricted-imports`) | ✓ (OPA/Conftest on `package.json`) | ✓ |
| Missing `@deprecated` JSDoc on retired exports | — | ✓ (`eslint-plugin-deprecation`) | — | ✓ |
| `process.env` outside `shared/config` | — | ✓ (`no-restricted-properties`, in `ci/eslint.config.recommended.js`) | — (no CI grep step) | ✓ |
| Banned styling engine (the kit's old ban — now removed) | — | — | — | — (engine choice is now project-level, `styling-engine.md`) |
| Missing test for changed component | — | — | ◐ (CI runs the test script; the coverage threshold must be set in the repo's jest/vitest config — the kit ships no threshold) | ✓ |
| Storybook story + a11y for new component | — | — | ◐ (`/bedrock:audit-design-system --ci` exists but is NOT wired into the shipped workflow — run it manually or add a step) | ✓ |
| `any` / unchecked `as` cast | — | ✓ (`@typescript-eslint/no-explicit-any` + `no-unsafe-*`, in `ci/eslint.config.recommended.js`) | — | ✓ |
| Inaccessible UI (`<div onClick>`, no focus ring, color-only) | — | ✓ (`jsx-a11y`, in `ci/eslint.config.recommended.js`) | ◐ (Lighthouse a11y budget catches some) | ✓ |
| Raw `<img>` / third-party font `<link>` | — | ✓ (`@next/next/no-img-element`, `no-page-custom-font`) | — | ✓ |
| `_blank` without `rel="noopener"` | — | ✓ (`react/jsx-no-target-blank`) | — | ✓ |
| Barrels that `export *` | — | ✓ (`no-restricted-syntax: ExportAllDeclaration`) | — | ✓ |
| Auth tokens in `localStorage` | — | ✓ (`no-restricted-globals`) | — | ✓ |
| Hardcoded user-facing strings (i18n) | — | ◐ (`react/jsx-no-literals`, warn-only on `ui/**`; prefer `eslint-plugin-i18next` if installed) | — | ✓ |
| Business terminology in `shared`; mutation/action button in an entity; testing implementation details; desktop-first breakpoints | — | — | — | ✓ (judgment — irreducible to a linter) |

### Honest limits — what hooks CANNOT enforce

The PreToolUse hook is a **first line of defense, not the only line.** Documented limits:

1. **Pipe mode.** `cat foo.ts | claude` and similar stdin pipelines don't fire the Edit/Write
   matchers — there's no `tool_input.file_path` to inspect. Files written this way bypass
   every Edit-shaped check.
2. **MCP subagents.** File mutations via MCP servers (e.g. a filesystem MCP) don't go through
   Claude Code's tool layer; PreToolUse never sees them.
3. **Shell-issued writes.** `printf … > file`, `perl -e 'open …; print …'`, Bash heredocs,
   `sed -i`, `cat <<EOF > file` — these are Bash tool calls, not Edit/Write. The Bash hook can
   pattern-match commands, but it's a different (and more permissive) matcher.
4. **Model rerouting.** The agent can choose Bash over Edit specifically to dodge a hook.
   Adversarial behavior, but possible.
5. **Partial Edits.** Hooks see `new_string`, not the post-edit file. A small Edit that
   doesn't itself contain `'server-only'` is allowed even if the file *already* satisfies the
   rule — but also if it *doesn't*. The kit's hook restricts directive checks to **Write**
   only for this reason; ESLint + CI catch the Edit case.
6. **Missing `jq` / headless runners.** The hook gracefully `exit 0`s when `jq` isn't
   available — deliberate so it never breaks a CI runner, but it means any environment
   without `jq` ships without write-time enforcement. CI still catches violations.

**The kit's posture, made explicit:**

- Hooks catch the agent-writes-in-this-session case (fast feedback, blocks the obvious
  mistakes).
- ESLint catches *existing* code and refactors that touch but don't satisfy the rule.
- Steiger / dependency-cruiser / OPA catch tree-wide violations regardless of how the code
  got there.
- The `frontend-reviewer` agent reads the diff against the constitution and runs
  `/verify-build` (which includes the CI checks).
- The reviewer-of-the-PR (human) is the final gate.

**No "hook-blocked" claim in this kit means "guaranteed."** It means "this layer fires
synchronously at write time; the other layers backstop." If the matrix above has no row for
a rule, that rule is documented + reviewer-enforced, not mechanically caught.

> **Source (read for the adversarial view):** the DEV Community post *"What Claude Code Hooks
> Can and Cannot Enforce"* catalogs hook bypasses in more depth. Anyone shipping rules that
> claim "enforced" should read it.

## Model & data policy (agent as untrusted contributor)

- Only **approved models** and **approved MCP servers** (managed `allowedMcpServers`). 
- **Default-deny context exfiltration:** the agent doesn't read secret files (managed `deny`), and
  no sensitive data is pasted into prompts/logs (`security.md`).
- AI-generated code is **not exempt** from any gate — SAST/dep-scan/review apply identically.

## Hard rules

- ❌ Weakening a Tier-0 control from a project (`.claude/settings.local.json` can't undo a managed deny).
- ❌ Deviating from a Tier-1 rule without **both** an ADR and a dated, expiring *Approved overrides* row.
- ❌ A permanent, unreviewed waiver (every waiver has an expiry/review date).
- ❌ Treating AI-written code as exempt from the security/quality gates.
- ✅ Small locked floor + delegated standard + logged, expiring waivers; agent actions audited;
  decisions in ADRs.

## Sources
- [GitHub Copilot enterprise policies (locked vs delegated)](https://docs.github.com/en/copilot/concepts/policies)
- [OPA in CI/CD — decision logs & waivers](https://www.openpolicyagent.org/docs/cicd)
- [Golden paths: optional, transparent, extensible — Red Hat](https://www.redhat.com/en/topics/platform-engineering/golden-paths)
- [Enterprise AI governance program](https://sprinto.com/blog/enterprise-ai-governance/)
