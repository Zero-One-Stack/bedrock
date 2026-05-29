import { makeTester } from './_helpers.js';
import rule from '../src/rules/no-primitive-token-in-component.js';

const tester = makeTester();

tester.run('bedrock/no-primitive-token-in-component', rule, {
  valid: [
    // Semantic tokens are the kit's required tier
    "const style = { color: 'var(--color-text-default)' };",
    "const style = { background: 'var(--color-bg-emphasis)' };",
    "const style = { padding: 'var(--space-inset-md)' };",
    "const style = { borderRadius: 'var(--radius-control)' };",
    "const t = `color: var(--color-feedback-danger);`;",
    // No var() refs
    "const x = 1;",
    "const greeting = 'hello';",
  ],
  invalid: [
    {
      code: "const style = { color: 'var(--color-blue-500)' };",
      errors: [{ messageId: 'primitiveTokenInComponent', data: { token: '--color-blue-500' } }],
    },
    {
      code: "const style = { padding: 'var(--space-4)' };",
      errors: [{ messageId: 'primitiveTokenInComponent', data: { token: '--space-4' } }],
    },
    {
      code: "const css = `background: var(--color-red-100);`;",
      errors: [{ messageId: 'primitiveTokenInComponent', data: { token: '--color-red-100' } }],
    },
    {
      code: "const style = { fontSize: 'var(--font-size-3)' };",
      errors: [{ messageId: 'primitiveTokenInComponent', data: { token: '--font-size-3' } }],
    },
    {
      // Multiple primitives in one string each report
      code: "const css = `color: var(--color-blue-500); padding: var(--space-4);`;",
      errors: [
        { messageId: 'primitiveTokenInComponent' },
        { messageId: 'primitiveTokenInComponent' },
      ],
    },
  ],
});

console.log('no-primitive-token-in-component: PASS');
