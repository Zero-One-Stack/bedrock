/**
 * bedrock — recommended ESLint flat config.
 *
 * governance.md's position is: the kit writes only the rules nobody else has a
 * good match for, and composes the rest from the ecosystem. That sentence had no
 * artifact behind it — the ecosystem half was never actually wired, so a dozen
 * hard bans in CLAUDE.md were enforced by the reviewer agent alone (a
 * non-deterministic gate). This file is the composing half.
 *
 * Copy to the project root as `eslint.config.js` (or import and spread it), then:
 *
 *   npm i -D eslint @eslint/js typescript-eslint eslint-plugin-jsx-a11y \
 *            eslint-plugin-import eslint-plugin-react @next/eslint-plugin-next \
 *            eslint-plugin-bedrock
 *
 * Every block below is keyed to the hard ban it makes deterministic. Delete a
 * block only with a dated waiver in project-specifics.md per governance.md —
 * silently dropping one puts that ban back on the reviewer.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import next from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import bedrock from 'eslint-plugin-bedrock';

export default tseslint.config(
  { ignores: ['.next/**', 'dist/**', 'build/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // The kit's own FSD rules (deep slice imports, @x scope, primitive tokens,
  // server-only, 'use client' at a page top, event-bus origin).
  bedrock.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      '@next/next': next,
      react,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: true, node: true },
    },
    rules: {
      // ── Ban: `any`, and `as` casts without a runtime guard ──────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],

      // ── Ban: circular dependencies, and barrels that `export *` ─────────
      'import/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message:
            "Barrels must not `export *` — it defeats the slice public API and creates re-export loops. Name each export explicitly in the slice's index.ts.",
        },
      ],

      // ── Ban: inaccessible UI (WCAG 2.2 AA) ──────────────────────────────
      // jsx-a11y catches <div onClick> and friends trivially; it was named in
      // the rules for months but never shipped in a config.
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/anchor-is-valid': 'error',

      // ── Ban: raw <img>, third-party font <link> ─────────────────────────
      '@next/next/no-img-element': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-html-link-for-pages': 'error',

      // ── Ban: security holes ─────────────────────────────────────────────
      'react/jsx-no-target-blank': ['error', { allowReferrer: false }],
      'react/no-danger': 'warn', // sanitize-then-render is legitimate; review the call site.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'No auth tokens in localStorage (security.md). Use httpOnly cookies.' },
      ],

      // ── Ban: server/client leaks + env access outside shared/config ─────
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read env through shared/config (Zod-validated, server/client split) — not process.env directly.',
        },
      ],
    },
  },

  // shared/config is the one place env may be read.
  {
    files: ['**/shared/config/**/*.{ts,tsx}', '**/*.config.{ts,js,mjs}', '**/env*.{ts,js}'],
    rules: { 'no-restricted-properties': 'off' },
  },

  // ── Ban: hardcoded user-facing strings → i18next ───────────────────────
  // Scoped to ui/ segments: literals in config/tests/stories are fine, and a
  // repo-wide jsx-no-literals is unusably noisy. If the project ships
  // eslint-plugin-i18next, prefer its `no-literal-string` over this.
  {
    files: ['**/ui/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'warn',
        { noStrings: false, ignoreProps: true, allowedStrings: ['', ' ', '·', '—', '–', '/', ':'] },
      ],
    },
  },

  // Tests: type-aware strictness fights mocks, and literals are expected.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/e2e/**', '**/*.stories.tsx', '**/mocks/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-no-literals': 'off',
    },
  },
);
