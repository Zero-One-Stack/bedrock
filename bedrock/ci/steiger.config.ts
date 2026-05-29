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
 *
 * -----------------------------------------------------------------------------
 * RULE LEDGER (verify each release of @feature-sliced/steiger-plugin)
 * -----------------------------------------------------------------------------
 * `configs.recommended` enables the 17 rules below. The ledger exists so a future plugin upgrade
 * cannot silently add/remove rules without showing up in code review. When a `pnpm up` changes
 * this list, decide explicitly: keep the new rule, override it, or pin to the prior version.
 *
 * Verified against @feature-sliced/steiger-plugin@0.5.8 (npm package name unchanged; only the
 * monorepo folder was renamed to `steiger-plugin-fsd`). Source-of-truth:
 *   github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd/src
 *
 * Recommended (ON by default, 17 rules):
 *   fsd/ambiguous-slice-names          — Slice name collides with a shared/ segment (theme, i18n).
 *   fsd/excessive-slicing              — Layer has >20 ungrouped slices.
 *   fsd/forbidden-imports              — Lower layers may not import from higher layers.
 *   fsd/inconsistent-naming            — Mixed singular/plural slice naming on a layer.
 *   fsd/insignificant-slice            — Slice referenced 0–1 times (inline candidate).
 *   fsd/no-layer-public-api            — `index.*` at the layer root is forbidden (except app).
 *   fsd/no-processes                   — The deprecated `processes` layer is banned.
 *   fsd/no-public-api-sidestep         — Deep import past a slice's `index.*`.
 *   fsd/no-reserved-folder-names       — Sub-folders named like segments (`shared/lib/ui`).
 *   fsd/no-segmentless-slices          — Sliced layers need segments inside slices.
 *   fsd/no-segments-on-sliced-layers   — Bare segments (`ui/`, `model/`, …) under a sliced layer.
 *   fsd/no-ui-in-app                   — `ui/` segment inside the app layer is forbidden.
 *   fsd/public-api                     — Every slice/segment must expose an `index.*`.
 *   fsd/repetitive-naming              — Slice name redundantly repeats the layer (`pages/home-page`).
 *   fsd/segments-by-purpose            — Essence-named segments banned (components/hooks/utils/…).
 *   fsd/shared-lib-grouping            — `shared/lib/` has >15 direct children; sub-group.
 *   fsd/typo-in-layer-name             — Layer-folder typo (e.g. `shraed` → `shared`).
 *
 * Opt-in (OFF by default, 3 rules — enable per-repo if it fits the codebase):
 *   fsd/no-cross-imports               — Stricter than `forbidden-imports`: forbids any slice-to-slice
 *                                        import on the same layer unless a cross-import public API
 *                                        is declared. Recommended ON for greenfield repos.
 *   fsd/no-higher-level-imports        — Forbids importing from a higher layer regardless of
 *                                        direction. Recommended for library/shared-package repos
 *                                        where lower layers must never leak upward.
 *   fsd/import-locality                — Forces relative imports for same-slice files (banning
 *                                        absolute/aliased self-imports). Mirrors the kit's
 *                                        "import siblings by leaf path, not via the barrel" rule
 *                                        (component-structure.md → no barrel cycles).
 *
 * Caveat (v0.5.8): `src/no-file-segments/` exists as code but is NOT registered with the plugin
 * — it is neither in `enabledRules` nor `disabledRules`. Treat it as not shipped.
 * -----------------------------------------------------------------------------
 */
import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  // 17 recommended rules listed in the ledger above. Audit on every Steiger upgrade.
  ...fsd.configs.recommended,

  // Opt-in: import-locality enforces the kit's no-barrel-cycles rule mechanically. Turn ON
  // for greenfield repos; turn OFF (or warn) on legacy migrations until cycles are cleaned up.
  // Uncomment to enable:
  // { rules: { 'fsd/import-locality': 'error' } },

  // Opt-in: no-cross-imports is a stricter same-layer ban than `forbidden-imports`. Greenfield-
  // friendly; consider on existing repos with a migration plan.
  // { rules: { 'fsd/no-cross-imports': 'error' } },

  // Opt-in: no-higher-level-imports — useful for shared/library packages where the lower-layer
  // contract must not leak upward. Off by default in app repos.
  // { rules: { 'fsd/no-higher-level-imports': 'error' } },

  // Lint-scope tuning: skip test, story, and composition files; lint only src/.
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
