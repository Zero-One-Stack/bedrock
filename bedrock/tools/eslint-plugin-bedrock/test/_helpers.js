import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

export function makeTester() {
  return new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  });
}
