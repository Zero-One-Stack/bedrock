/**
 * Recommended flat-config factory.
 *
 * A flat config block that names `bedrock/*` rules must also carry the plugin
 * object under `plugins` — ESLint resolves the rule prefix through that map, not
 * through the package name. Without it every rule here fails to resolve:
 *   Key "rules": Key "bedrock/no-deep-slice-import": Could not find plugin "bedrock".
 *
 * Exporting a ready-made object can't reference the plugin without importing
 * index.js, which imports this file — a cycle. So this module exports a factory
 * that index.js calls once the plugin object exists.
 *
 * Consumers never see the factory; they use the built config:
 *
 *   import bedrock from 'eslint-plugin-bedrock';
 *   export default [bedrock.configs.recommended];
 *
 * Defaults assume a `@` tsconfig path alias rooted at src/. Override per-rule
 * via `rules: { 'bedrock/...': ['error', { alias: '~' }] }` if your project
 * differs.
 */
export default function makeRecommended(plugin) {
  return {
    name: 'bedrock/recommended',
    plugins: { bedrock: plugin },
    rules: {
      'bedrock/no-deep-slice-import': 'error',
      'bedrock/no-cross-feature-x-import': 'error',
      'bedrock/no-primitive-token-in-component': 'error',
      'bedrock/require-server-only-on-queries': 'error',
      'bedrock/no-use-client-at-page-top': 'error',
      'bedrock/events-only-from-shared': 'error',
    },
  };
}
