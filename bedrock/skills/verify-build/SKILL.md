---
name: verify-build
description: Close the loop after generating or editing code — prove it actually compiles, that every referenced design token resolves, that no circular dependency was introduced, and that lint/format/tests pass, using the repo's real scripts (never invented ones). Use after scaffolding a component or service, before declaring any change "done", or when a review needs evidence the change is sound. This is the enforcement end of the Step 0 Recon gate.
---

# Verify Build

Scaffolding and edits are not "done" until verified. This skill turns "looks right" into
"compiles, resolves, lints, and has no new cycle." **Use the repo's actual scripts** (from the
Step 0 Recon block / `package.json`) — never guess a script name like `pnpm tokens:build`.

## 0. Resolve the real commands first

Read `package.json` `scripts` and the lockfile/`packageManager` field. Map each check to the
repo's real script; if a check has no script, note it and run the underlying tool directly via
the repo's package manager. Record what you ran.

| Check         | Typical script names (verify — don't assume)                    |
| ------------- | --------------------------------------------------------------- |
| typecheck     | `typecheck`, `type-check`, `tsc -p tsconfig.json --noEmit`      |
| lint          | `lint`, `eslint`                                                |
| format        | `format`, `format:check`, `prettier --check`                    |
| unit/integration | `test`, `test:unit` (jest **or** vitest — see `rules/testing.md`)|
| e2e           | `e2e`, `test:e2e`, `playwright test`                            |
| token build   | `tokens:build`, `build:tokens`, `tokens`, Style Dictionary cfg  |
| cycles        | `import/no-cycle` (in lint), `madge --circular`, Nx boundaries   |

Prefer the repo's task runner (Nx: `nx run <project>:<target>` / `nx affected`; pnpm/npm scripts).

## 1. Compiles

Run the repo's **typecheck**. Zero errors. (Catches bad imports, wrong library API for the
installed version, missing types from a renamed file.)

## 2. Tokens resolve (the silent failure)

If design tokens have a build step, **run it** (the real script) so `tokens.css` is current.
Then confirm every `var(--…)` referenced in changed CSS/TSX actually exists:

```bash
# every token referenced in the changed files…
grep -rhoE 'var\(--[a-z0-9-]+\)' <changed CSS/TSX> | sed -E 's/var\((--[a-z0-9-]+)\)/\1/' | sort -u
# …must appear as a definition in the generated stylesheet:
grep -oE '^\s*--[a-z0-9-]+' src/styles/tokens.css | sort -u   # adjust path per Recon
```

Any referenced var missing from the generated output is a **failure** — the style silently
resolves to nothing. Fix by using the correct existing token or adding one via
`/add-design-token`. Never hand-edit the generated CSS.

## 3. No circular dependency

Run the repo's cycle check (see `rules/component-structure.md`):

```bash
npx madge --circular --extensions ts,tsx src   # or the repo's configured tool
```

Or rely on `import/no-cycle` if it's in the ESLint config (it surfaces in step 4), or Nx's
boundary check in an Nx workspace. **A newly-introduced cycle — especially a barrel re-export
loop — is a failure.** Fix by importing the sibling via its leaf path, or by lifting the shared
piece to a lower layer.

## 4. Lint + format clean

Run **lint** and **format** (check mode). Fix at the source — don't blanket-disable rules. A
scoped, justified `// eslint-disable-next-line <rule> -- reason` is the only exception.

## 5. Tests green — both layers

**5a. Unit/integration:** run the affected tests with the repo's runner (jest/vitest). New/changed
code keeps coverage ≥ 80% (90%+ on new code). Loading/empty/error states covered for data
components; an axe assertion present for UI.

**5b. E2E:** run the repo's `e2e` script (Playwright). For a user-facing feature, confirm at least
one journey test exists and passes. If the change adds a feature/flow with **no** E2E spec, that's
a failure — flag it (and, in a build context, write the missing flow per `rules/testing.md`). If
E2E genuinely can't run here (no browser/sandbox), say so and mark that step unverified — don't
imply it passed.

## Report

State exactly which command you ran for each step and its result. If a check has no script,
say so and what you ran instead. **Do not report "done" unless 1–5 all pass** — if something
fails, report the failure and the fix, not a green summary.
