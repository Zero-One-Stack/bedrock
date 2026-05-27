---
description: Scaffold a new React component following this kit's Feature-Sliced Design, file-per-concern, token-only conventions.
---

Scaffold a new component named **$ARGUMENTS** following this project's conventions.

Use the `scaffold-component` skill. Before generating:
- Read `.claude/rules/feature-sliced-design.md`, `.claude/rules/component-structure.md`, and `.claude/rules/styling-and-tokens.md`.
- Inspect the repo to match existing import aliases, the `test-utils` path, semantic token
  names, and the slice's `index.ts` (public API) location.

Then:
- Determine placement (`feature-sliced-design.md`): the `ui/` segment of the slice on the layer
  that matches what it is — generic + business-agnostic → `shared/ui` (atomic sub-convention
  optional); read-only domain view (no actions/fetch) → `entities/<model>/ui`; state-changing
  action UI (`'use client'` leaf) → `features/<action>/ui`; composed block → `widgets/<block>/ui`;
  route screen → `pages/<route>/ui`. Don't over-slice (keep single-use UI in the page). Ask only
  if genuinely ambiguous.
- Generate the full kebab-case file set (incl. `index.ts`), styles using semantic-token CSS vars
  only (no literals, no primitive tokens), and add the export to the slice's public API (`index.ts`, public surface only).
- Run typecheck/lint/test for the new files and report the result.

If the component needs real data/forms/complex state, hand off to the **component-builder** agent.
