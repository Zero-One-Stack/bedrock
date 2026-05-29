/**
 * Recommended flat-config block. Apply as:
 *
 *   import bedrock from 'eslint-plugin-bedrock';
 *   export default [bedrock.configs.recommended, /* ... * /];
 *
 * Defaults assume a `@` tsconfig path alias rooted at src/. Override per-rule
 * via `rules: { 'bedrock/...': ['error', { alias: '~' }] }` if your project
 * differs.
 */
const recommended = {
  name: 'bedrock/recommended',
  plugins: {
    // Plugins must be re-imported here at the consumer level; this object is
    // populated by eslint-plugin-bedrock's main entry — see src/index.js.
  },
  rules: {
    'bedrock/no-deep-slice-import': 'error',
    'bedrock/no-cross-feature-x-import': 'error',
    'bedrock/no-primitive-token-in-component': 'error',
    'bedrock/require-server-only-on-queries': 'error',
    'bedrock/no-use-client-at-page-top': 'error',
  },
};

export default recommended;
