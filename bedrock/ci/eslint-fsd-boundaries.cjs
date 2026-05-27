/**
 * eslint-plugin-boundaries — FSD layer DIRECTION + public-API barrier, enforced in ESLint so a
 * violating import is a red squiggle in the editor (not just a CI failure). Complements Steiger
 * (the primary FSD linter, which uniquely understands same-layer slice isolation and `@x`).
 *
 * Install (latest; never pin):
 *   pnpm add -D eslint-plugin-boundaries
 * Merge this into the repo's flat eslint config (eslint.config.js):
 *   const fsd = require('./ci/eslint-fsd-boundaries.cjs');
 *   module.exports = [ ...fsd, /* the rest of your config *\/ ];
 *
 * Encodes rules/feature-sliced-design.md. FSD layers live under src/; tune the patterns to the
 * repo's alias (Recon). The Next.js router (root app/) is outside src/ and not matched here.
 */
const boundaries = require('eslint-plugin-boundaries');

// Layer → the layers it may depend on (itself + everything strictly below). app & shared are the
// two segment-only exceptions; their intra-layer segment imports are allowed.
const ALLOW = {
  app: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
  pages: ['pages', 'widgets', 'features', 'entities', 'shared'],
  widgets: ['widgets', 'features', 'entities', 'shared'],
  features: ['features', 'entities', 'shared'],
  entities: ['entities', 'shared'],
  shared: ['shared'],
};

module.exports = [
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*', mode: 'folder' },
        { type: 'pages', pattern: 'src/pages/*', mode: 'folder' },
        { type: 'widgets', pattern: 'src/widgets/*', mode: 'folder' },
        { type: 'features', pattern: 'src/features/*', mode: 'folder' },
        { type: 'entities', pattern: 'src/entities/*', mode: 'folder' },
        { type: 'shared', pattern: 'src/shared/*', mode: 'folder' },
      ],
    },
    rules: {
      // Downward-only layer direction: each layer may import only itself + strictly-below layers.
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: Object.entries(ALLOW).map(([from, allow]) => ({ from, allow })),
        },
      ],
      // Public-API barrier: a slice may only be entered through its index.ts (no deep segment imports).
      // eslint-plugin-boundaries' entry-point rule treats index.* as the sole allowed entry; @x is an
      // additional sanctioned entry for entities.
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['pages', 'widgets', 'features', 'entities'], allow: ['index.ts', 'index.tsx'] },
            { target: ['entities'], allow: ['@x/*.ts'] },
            // app & shared are segment-addressable (no slices); allow their segment entry points.
            { target: ['app', 'shared'], allow: ['*', '**'] },
          ],
        },
      ],
    },
  },
];
