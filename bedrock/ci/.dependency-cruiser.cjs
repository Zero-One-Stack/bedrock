/**
 * Dependency-cruiser config — the kit's Feature-Sliced Design (FSD) boundaries as a
 * build-breaking FITNESS FUNCTION. Encodes the constitution's import rules so they're enforced by
 * CI, not by hope (see rules/feature-sliced-design.md):
 *   - no circular dependencies (the hard ban)
 *   - downward-only layer direction (app → pages → widgets → features → entities → shared)
 *   - no same-layer slice imports (except @x on entities)
 *   - no deep imports past a slice's public API (index.ts)
 *   - no orphan modules
 * Steiger (ci/steiger.config.ts) is the PRIMARY FSD linter — it understands slices/segments/@x
 * natively. This config covers layer DIRECTION + the public-API barrier for repos that also run
 * dependency-cruiser. Run:  npx depcruise src --config .dependency-cruiser.cjs
 * Adjust the path globs to the repo's actual layout (Recon). This is a template — verify.
 *
 * FSD layers under src/ (Next.js routing lives in the repo-root app/, outside src/).
 */
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
// What each layer is allowed to import (itself + everything strictly below).
const ALLOWED_BELOW = {
  app: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
  pages: ['pages', 'widgets', 'features', 'entities', 'shared'],
  widgets: ['widgets', 'features', 'entities', 'shared'],
  features: ['features', 'entities', 'shared'],
  entities: ['entities', 'shared'],
  shared: ['shared'],
};

// One rule per layer: forbid importing any layer NOT in its allow-list (i.e. upward imports).
const layerDirectionRules = LAYERS.map((layer) => {
  const forbidden = LAYERS.filter((l) => !ALLOWED_BELOW[layer].includes(l));
  return {
    name: `fsd-${layer}-only-downward`,
    comment: `FSD: ${layer} may import only ${ALLOWED_BELOW[layer].join(', ')} (strictly-below rule).`,
    severity: 'error',
    from: { path: `^src/${layer}/` },
    to: { path: `^src/(${forbidden.join('|')})/` },
  };
});

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Hard ban: circular dependencies (incl. barrel re-export loops).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // --- FSD: downward-only layer direction (no upward imports) ---
    ...layerDirectionRules,

    // --- FSD: no SAME-LAYER slice imports on the sliced layers (pages/widgets/features/entities) ---
    // A slice may import its own files ($1 = the slice name); importing a SIBLING slice on the same
    // layer is forbidden. The @x exception (entities only) is whitelisted via pathNot below.
    {
      name: 'fsd-no-cross-slice-pages',
      comment: 'FSD: a pages slice must not import another pages slice (same-layer isolation).',
      severity: 'error',
      from: { path: '^src/pages/([^/]+)/' },
      to: { path: '^src/pages/([^/]+)/', pathNot: ['^src/pages/$1/'] },
    },
    {
      name: 'fsd-no-cross-slice-widgets',
      comment: 'FSD: a widgets slice must not import another widgets slice (same-layer isolation).',
      severity: 'error',
      from: { path: '^src/widgets/([^/]+)/' },
      to: { path: '^src/widgets/([^/]+)/', pathNot: ['^src/widgets/$1/'] },
    },
    {
      name: 'fsd-no-cross-slice-features',
      comment: 'FSD: a features slice must not import another features slice (compose from a page/widget instead).',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: ['^src/features/$1/'] },
    },
    {
      name: 'fsd-no-cross-slice-entities',
      comment: 'FSD: an entities slice must not import another entity except via its @x public API.',
      severity: 'error',
      from: { path: '^src/entities/([^/]+)/' },
      to: {
        path: '^src/entities/([^/]+)/',
        pathNot: [
          '^src/entities/$1/',          // same entity: fine
          '^src/entities/[^/]+/@x/',    // the sanctioned cross-import API (entities only)
        ],
      },
    },

    // --- FSD: no DEEP imports past a slice's public API (index.ts) ---
    // Code outside a slice must import the slice's root index.ts, not its internal segments.
    {
      name: 'fsd-no-public-api-sidestep',
      comment: 'FSD: import a slice via its index.ts, never a deep path into its segments (public-API barrier).',
      severity: 'error',
      from: { pathNot: '^src/(entities|features|widgets|pages)/([^/]+)/' },
      to: {
        path: '^src/(entities|features|widgets|pages)/[^/]+/[^/]+/.+',  // a path two+ levels deep into a slice
        pathNot: [
          '^src/(entities|features|widgets|pages)/[^/]+/@x/',           // @x files are an intended entry
          '\\.(test|spec|stories|composition|mock|msw)\\.',            // test/story tooling may reach in
        ],
      },
    },

    // --- shared is the floor: it must not import any business layer ---
    {
      name: 'fsd-shared-is-agnostic',
      comment: 'FSD: shared must not import from any business layer (it is business-agnostic and the bottom layer).',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(app|pages|widgets|features|entities)/' },
    },

    {
      name: 'no-orphans',
      comment: 'Orphan modules usually mean dead code or a missing public-API export.',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '\\.(test|spec|stories)\\.', '\\.config\\.', '/index\\.ts$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true, // count import type too where it forms a cycle
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require'] },
  },
};
