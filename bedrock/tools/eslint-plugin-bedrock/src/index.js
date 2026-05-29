/**
 * eslint-plugin-bedrock — the rules the kit owns that aren't catchable by
 * eslint-plugin-boundaries / eslint-plugin-import / @nx/enforce-module-boundaries
 * / Steiger alone. Use alongside those; this plugin doesn't replace them.
 *
 * Loaded via the new flat config (eslint.config.js):
 *
 *   import bedrock from 'eslint-plugin-bedrock';
 *   export default [
 *     bedrock.configs.recommended,
 *     // …other configs
 *   ];
 */
import noDeepSliceImport from './rules/no-deep-slice-import.js';
import noPrimitiveTokenInComponent from './rules/no-primitive-token-in-component.js';
import noCrossFeatureXImport from './rules/no-cross-feature-x-import.js';
import requireServerOnlyOnQueries from './rules/require-server-only-on-queries.js';
import noUseClientAtPageTop from './rules/no-use-client-at-page-top.js';

import recommended from './configs/recommended.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-bedrock',
    version: '0.1.0',
  },
  rules: {
    'no-deep-slice-import': noDeepSliceImport,
    'no-primitive-token-in-component': noPrimitiveTokenInComponent,
    'no-cross-feature-x-import': noCrossFeatureXImport,
    'require-server-only-on-queries': requireServerOnlyOnQueries,
    'no-use-client-at-page-top': noUseClientAtPageTop,
  },
  configs: {
    recommended,
  },
};

export default plugin;
