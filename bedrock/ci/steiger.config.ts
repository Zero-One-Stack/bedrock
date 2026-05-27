/**
 * Steiger — the OFFICIAL Feature-Sliced Design linter — as a build-breaking fitness function.
 * Steiger is the primary FSD enforcer: unlike ESLint/dependency-cruiser it understands slices,
 * segments, the public-API barrier, and the `@x` cross-import notation natively.
 *
 * Install (use latest; never pin — see CLAUDE.md):
 *   pnpm add -D steiger @feature-sliced/steiger-plugin
 * Run:
 *   pnpm steiger ./src          # or `pnpm steiger ./src --watch` in dev
 * Wire it into CI (github-actions-enterprise.yml) and /verify-build; a violation fails the gate.
 *
 * This encodes rules/feature-sliced-design.md. Tune `files` globs to the repo (Recon): FSD layers
 * live under src/ — the Next.js router (root app/) is OUTSIDE src/ and is not linted by Steiger.
 */
import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  // The recommended FSD ruleset: forbidden-imports (downward-only + no same-layer slice imports),
  // public-api, no-public-api-sidestep, no-segmentless-slices, no-segments-on-sliced-layers,
  // segments-by-purpose (bans components/hooks/utils as segment names), insignificant-slice,
  // excessive-slicing, inconsistent/repetitive-naming, no-processes, no-ui-in-app, etc.
  ...fsd.configs.recommended,

  // The Next.js router is at the repo root (app/, pages/ if present), NOT a Steiger target.
  // We only lint src/. (If your aliases differ, adjust here.)
  {
    ignores: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*', '**/*.composition.*'],
  },

  // shared has no slices (segments only) — its public API is per-segment, and intra-segment grouping
  // (e.g. the optional shared/ui atoms/molecules/organisms sub-convention) is allowed.
  {
    files: ['./src/shared/**'],
    rules: {
      // shared/ui may be grouped (atomic sub-convention); don't flag those as insignificant slices.
      'fsd/insignificant-slice': 'off',
    },
  },

  // The FSD app layer holds providers/global styles — it legitimately wires many layers together,
  // so the cross-import heuristics there are noise.
  {
    files: ['./src/app/**'],
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
]);
