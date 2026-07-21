---
name: audit-design-system
description: Audit the repo's shared/ui design system against the kit's contract. Reports bare component files that should be folders (design-system-structure.md), a test-runner glob that would skip colocated tests, then walks every shared/ui component folder for gaps: missing stories file, missing test with axe, missing props file, missing public-API export from the slice's index.ts, missing form-primitive from the 15-baseline (form-primitives.md), missing required semantic token group from styling-and-tokens.md, deviations from the atomic placement heuristics (component-structure.md). Use when the user says "audit the design system", "check design-system coverage", "what's missing from shared/ui", periodically as health check, or as a CI fitness function before merging design-system changes.
---

# Audit Design System

Walk the repo's `shared/ui` tree and report every gap against the kit's design-system
contract. Read first: `.claude/rules/component-structure.md`,
`.claude/rules/form-primitives.md`, `.claude/rules/storybook.md`,
`.claude/rules/styling-and-tokens.md`, `.claude/rules/accessibility.md`. The audit produces a
coverage table; gaps fail CI when the script runs as a fitness function.

## What to check

### 0. Structure first — bare files and the runner glob

Before auditing folder *contents*, audit the *shape*. A component that is a bare file has no
folder to audit, so a folder-only walk silently skips exactly the components most likely to be
non-conforming.

```bash
# Bare component files sitting directly in shared/ui or an atomic folder — each one is a
# violation of design-system-structure.md (should be <name>/<name>.tsx).
find src/shared/ui -maxdepth 2 -name '*.tsx' \
  ! -name '*.test.tsx' ! -name '*.spec.tsx' ! -name '*.stories.tsx' \
  ! -name '*.composition.tsx' ! -name 'index.tsx' 2>/dev/null
```

Report every hit under a **"Not yet a folder"** heading with the target path
(`atoms/button.tsx` → `atoms/button/button.tsx`). These are migration candidates, not
individually broken components — see `design-system-structure.md` §7 for the ratchet.

Then confirm the **test-runner glob covers the component tree** (`design-system-structure.md`
§3). If the repo's `test` script is bound to a separate suite directory, every colocated test
this audit demands is dead on arrival — **report that first**, because it invalidates the
"has a test" column below.

### 1. Per component folder

For every folder under `shared/ui/` that contains a `<name>.tsx`, verify:

1. **File set per `component-structure.md`:**
   - `<name>.tsx` (the component)
   - `<name>.props.ts` (named fixtures + ≥1 variant fixture)
   - `<name>.module.css` OR engine-equivalent (skip for engines that don't emit one — CSS
     Modules / vanilla-extract; allowed missing on Tailwind/Chakra/runtime-CSS-in-JS)
   - `<name>.composition.tsx` (wrapper supplying default props)
   - `<name>.stories.tsx` (per `storybook.md`)
   - `<name>.test.tsx` (or `.spec.tsx` — match repo convention)
   - `index.ts` (re-exports component + public types)

2. **Public API:** the component is re-exported from the slice's barrel
   (`shared/ui/index.ts` for a flat layout, or `shared/ui/atoms/index.ts` etc. for the atomic
   sub-convention). Grep the barrel; report any folder whose component name doesn't appear.

3. **Storybook contract (`storybook.md`):**
   - `<name>.stories.tsx` has `tags: ['autodocs']`.
   - `title` matches the FSD-mirrored convention (`Shared/Atoms/<Name>`, etc.).
   - Interactive atoms (Button/Input/Combobox/Switch/Slider/Tabs/Dialog/Menu) have at least
     one `play` function.

4. **a11y test:** `<name>.test.tsx` either calls `axe()` directly (e.g.
   `await axe(container)`) or imports from `@/test-utils` a wrapper that does. Report any
   component whose test file lacks an axe assertion.

5. **Form-primitive baseline (`form-primitives.md`):** check the 15 required primitives are
   present in `shared/ui/atoms/` (or flat layout). Report each missing one:
   `Field, Label, HelpText, ErrorText, Input, Textarea, NumberInput, Select, Combobox,
   Checkbox, Radio, Switch, Slider, DateField, FileInput`.

6. **Required semantic-token groups (`styling-and-tokens.md`):** when the project uses
   tokens, every required group is present in `tokens/semantic/` (or the equivalent emitted
   output). Report missing groups: state siblings (`*-hover`/`*-pressed`/`*-disabled`),
   motion duration+easing, elevation scale, z-index scale, opacity. (Skip if
   `project-specifics.md` records "no tokens, engine: <X>".)

7. **Atomic placement smells (`component-structure.md`'s heuristics):**
   - Atom that imports another `shared/ui` atom by name → should be a molecule.
   - Atom/molecule/organism that imports from `entities/`/`features/` → not in `shared/ui` at
     all; flag to move.

## Output (Markdown coverage table)

```
## Design system coverage — N components scanned

| Component             | Files | Public API | Story+autodocs | play | axe | Result |
| --------------------- | ----- | ---------- | -------------- | ---- | --- | ------ |
| Shared/Atoms/Button   | ✓     | ✓          | ✓              | ✓    | ✓   | PASS   |
| Shared/Atoms/Switch   | ✗     | ✗          | ✗              | ✗    | ✗   | MISSING (not implemented) |
| Shared/Atoms/Combobox | ✓     | ✓          | ✓              | ✗    | ✓   | FAIL (no play) |
| Shared/Molecules/Field| ✓     | ✓          | ✓              | n/a  | ✓   | PASS   |

## Form-primitive baseline (15 required)
- Missing: Switch, NumberInput, Slider, DateField, FileInput
- Present: Field, Label, HelpText, ErrorText, Input, Textarea, Select, Combobox, Checkbox, Radio

## Required token groups
- Missing: motion-duration, motion-easing, elevation, z-index
- Present: color base, color state siblings, color feedback, spacing, sizing, radius, opacity

## Atomic-placement smells
- shared/ui/atoms/search-bar imports shared/ui/atoms/icon and shared/ui/atoms/input — should be a molecule.

## Exit status
- 3 FAIL findings → exit 1 (fail CI)
```

## As a CI fitness function

The audit is intended to be wired into CI alongside Steiger / dependency-cruiser. A common
shape (illustrative — adapt to the repo's CI):

```yaml
# In github-actions-enterprise.yml under the fitness step:
- name: Audit design system
  run: claude /bedrock:audit-design-system --ci
```

`--ci` flag (or equivalent): exit code 1 on any FAIL or MISSING; the report goes to stdout for
the PR comment. The skill prints the same table interactively without `--ci` and exits 0
either way (so the developer can see the gaps without breaking their local loop).

## When to skip

- The repo recorded "no design system — feature-level UI only" in `project-specifics.md`
  (rare, but possible for small projects).
- The atomic sub-convention isn't in use AND the flat layout has fewer than 5 components
  (audit overhead exceeds value).
- Token checks skipped when the repo opted out of tokens per `styling-engine.md`.

## Rules

- ❌ Reporting a "FAIL" without naming the specific gap (which file is missing, which token
  group is absent, etc.). Each failure is actionable or it's noise.
- ❌ Flagging a known waiver (entry in `project-specifics.md` under "Approved overrides")
  as a failure. Reconcile against the waiver list first.
- ✅ One table per concern (components / form primitives / token groups / placement smells).
- ✅ Exit code 1 in `--ci` mode if any FAIL/MISSING; 0 otherwise.
- ✅ The skill prints what would unblock each gap (e.g. "run `/scaffold-component` for the
  missing `Switch`", "run `/add-design-token` for the missing motion group").
