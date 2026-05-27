---
name: scaffold-component
description: Scaffold a new React component following this kit's Feature-Sliced Design layers/slices/segments, file-per-concern contract. Decides placement (which FSD layer's slice, always in its ui/ segment), generates the full kebab-case file set (component + props + styles + CSS module + composition + test + stories + index), uses semantic design-token CSS variables (never literals, never primitive tokens), and updates the slice's public-API index.ts. Use when the user says "scaffold/create/add a component", "new shared/ui, entity, feature, or widget component". Pairs with the component-builder agent for non-trivial logic.
---

# Scaffold Component

Generate a new component matching the kit. **Do Step 0 Recon first** (`.claude/CLAUDE.md`) and
**read `.claude/rules/feature-sliced-design.md` + `.claude/rules/component-structure.md` +
`.claude/rules/styling-and-tokens.md`**. Every name in those docs is illustrative — confirm
against the repo: import **aliases** (tsconfig paths), `test-utils` path, the shared **`cx`** util,
the **test runner** (jest/vitest), the **actual semantic token names**, the slice `index.ts`
location, and the package scripts. Don't copy a token/alias/script from an example without
verifying it exists.

## Determine

1. **Name** — kebab-case folder/files; PascalCase export.
2. **Placement** — pick the FSD layer by what the component *is*, then put it in that slice's
   **`ui/` segment** (`feature-sliced-design.md`): generic+reusable+business-agnostic →
   `shared/ui/<component>/` (atomic sub-convention `shared/ui/atoms|molecules|organisms/` optional);
   read-only view of one domain model (no actions/fetch) → `entities/<model>/ui/<component>/`;
   the UI of one state-changing action (`'use client'`) → `features/<action>/ui/<component>/`;
   a composed self-contained block → `widgets/<block>/ui/<component>/`; a route's whole screen →
   `pages/<route>/ui/`. Don't over-slice — single-use UI stays in the page. Ask only if genuinely ambiguous.
3. Whether it wraps an interactive element (→ forward a ref).

## Generate `component-name/`

- `index.ts` — export the component + its public types only.
- `component-name.tsx` — function component; exported props type; ref-forwarded if interactive;
  `dataTestId` prop applied; **imports the shared `cx` from the repo's `shared/lib/`** (not a local
  copy) + the CSS module; no inline styles; no hardcoded user-facing strings.
- `component-name.props.ts` — `Default<Name>Props` + ≥1 variant fixture (error/disabled), typed.
- `component-name.styles.ts` — token-derived dynamic CSS-var helpers only; **omit if none**.
  Do not re-declare `cx` here.
- `component-name.module.css` — classes using only **semantic/component** `var(--…)` tokens
  **confirmed to exist in the repo**; include hover/focus/invalid where relevant. No literals,
  no primitive tokens, no unconfirmed token names.
- `component-name.composition.tsx` — thin wrapper defaulting to `Default<Name>Props`.
- `component-name.test.tsx` (or `.spec.tsx` — match the repo) — `render` from the repo's
  `test-utils`; query by role; reuse `.props.ts`; reset mocks in `beforeEach`
  (`jest.clearAllMocks()` / `vi.clearAllMocks()` per the repo's runner); follow
  `.claude/rules/testing.md`.
- `component-name.stories.tsx` — `title` per the convention in `component-structure.md`
  (`Shared/Atoms/<Name>` · `Shared/Molecules/<Name>` · `Shared/Organisms/<Name>` ·
  `Entities/<Model>/<Name>` · `Features/<Action>/<Name>` · `Widgets/<Block>/<Name>` ·
  `Pages/<Route>/<Name>`); one story per fixture.

Then add the export to the **slice's root `index.ts`** — its public API (public API only — never
`export *` of internals, which is also how barrel import-cycles form). Outsiders import the slice
via that `index.ts`, never a deep `ui/` path. If a needed value has no token, stop and use
`/add-design-token` first.

## Done when

All files exist (kebab-case) in the correct FSD layer/slice's `ui/` segment, styles use only
confirmed semantic-token vars, the slice's `index.ts` exports the public API, the component is
exported from that slice `index.ts`, the **unit/integration test** passes, and **`/verify-build`
passes** (compiles, tokens resolve, **Steiger** + dependency-cruiser clean, no new cycle, unit +
E2E green, lint/format clean) using the repo's real scripts. If this component completes a
user-facing flow, ensure that flow has an **E2E** spec (`rules/testing.md`). Report files,
placement, and tokens used.

For real logic (data, forms, complex state), delegate to the **component-builder** agent instead.
