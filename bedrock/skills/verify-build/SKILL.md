---
name: verify-build
description: Verify a change actually works — prove it compiles, the FSD layer boundaries hold (Steiger + dependency-cruiser), every referenced design token resolves, no circular dependency was introduced, and lint/format/tests pass, using the repo's real scripts (never invented ones). Use when the user says "verify", "does this build", "check it compiles", "prove it works", "run the checks", "is this done", after scaffolding a component or service, before declaring ANY change done, or when a review needs evidence. This is the enforcement end of the Step 0 Recon gate.
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
| **production build** | `build`, `next build` — **the only gate that catches client/server boundary leaks** |

Prefer the repo's task runner (Nx: `nx run <project>:<target>` / `nx affected`; pnpm/npm scripts).

## 1. Compiles

Run the repo's **typecheck**. Zero errors. (Catches bad imports, wrong library API for the
installed version, missing types from a renamed file.)

### 1b. …and actually builds

**Typecheck is not the build.** Run the repo's **production build** whenever the change touches a
barrel/`index.ts`, a provider, a `'use client'` file, an entity's public API, or anything under
`app/` — and always before declaring a structural change done.

It is the **only** check that catches a `server-only` module reaching a client bundle through a
barrel re-export. That failure has occurred on a tree where typecheck, ESLint, Steiger,
dependency-cruiser and a full green test suite all passed simultaneously:

```
You're importing a module that depends on "server-only".
```

The fix is the `index.ts` + `client.ts` split (`rules/services-and-data.md`), not a deep import.
If the build is genuinely too slow to run every time, say so and mark the verdict provisional —
don't silently skip it and imply it passed.

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

## 3. FSD architecture holds (Steiger + dependency-cruiser)

This is the check the kit is built around — the layer direction and the public-API barrier.
Run whichever the repo has configured; run **both** when both exist:

```bash
npx steiger ./src                 # the official FSD linter — layer order, slice isolation,
                                  # public-API sidestep, segments-by-purpose, insignificant slices
npx depcruise src --config .dependency-cruiser.cjs   # layer direction + cycles, as a second opinion
```

A violation here is a **failure**, not a warning: an upward import, a same-layer slice import
(except an `@x` cross-import on `entities`), or a deep import past a slice's `index.ts` all
break the constitution's import rule.

If neither tool is configured in this repo, **say so explicitly in the report** rather than
reporting a silent pass — an unconfigured architecture check is an unverified architecture,
and `enterprise-init` ships configs for both.

## 4. No circular dependency

Run the repo's cycle check (see `rules/component-structure.md`):

```bash
npx madge --circular --extensions ts,tsx src   # or the repo's configured tool
```

Or rely on `import/no-cycle` if it's in the ESLint config (it surfaces in step 5), or Nx's
boundary check in an Nx workspace. **A newly-introduced cycle — especially a barrel re-export
loop — is a failure.** Fix by importing the sibling via its leaf path, or by lifting the shared
piece to a lower layer.

## 5. Lint + format clean

Run **lint** and **format** (check mode). Fix at the source — don't blanket-disable rules. A
scoped, justified `// eslint-disable-next-line <rule> -- reason` is the only exception.

## 6. Tests green — both layers

**6a. Unit/integration:** run the affected tests with the repo's runner (jest/vitest). New/changed
code keeps coverage ≥ 80% (90%+ on new code). Loading/empty/error states covered for data
components; an axe assertion present for UI.

**6b. E2E:** run the repo's `e2e` script (Playwright). For a user-facing feature, confirm at least
one journey test exists and passes. If the change adds a feature/flow with **no** E2E spec, that's
a failure — flag it (and, in a build context, write the missing flow per `rules/testing.md`). If
E2E genuinely can't run here (no browser/sandbox), say so and mark that step unverified — don't
imply it passed.

## Report

State exactly which command you ran for each step and its result. If a check has no script,
say so and what you ran instead. **Do not report "done" unless 1–6 all pass** — if something
fails, report the failure and the fix, not a green summary.
