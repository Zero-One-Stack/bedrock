# eslint-plugin-bedrock

> ESLint rules that catch the patterns the bedrock kit's PreToolUse hooks can't see —
> existing code, refactors, Edits-not-Writes. The hook is the **first** line of defense at
> write time; this plugin is the second line that backstops it across the whole tree
> regardless of how the code got there. See the kit's enforcement matrix
> (`bedrock/rules/governance.md`) for the layered model.

## What's in the plugin

Six rules. Each is one bedrock concern that doesn't have a great match in
`eslint-plugin-boundaries`, `eslint-plugin-import`, or existing ecosystem plugins:

| Rule | Catches |
| --- | --- |
| `bedrock/no-deep-slice-import` | `import { X } from '@/entities/employee/ui/employee-card'` — the FSD public-API sidestep. Allows the `pages/<x>/routing` barrel introduced by `nextjs-app-router-fsd.md`. |
| `bedrock/no-cross-feature-x-import` | `import { X } from '@/features/x/@x/y'` and the same for `widgets/`/`pages/`. `@x` is the entities-only cross-import notation. |
| `bedrock/no-primitive-token-in-component` | `var(--color-blue-500)` in component code. Forces semantic-tier tokens (`var(--color-bg-emphasis)`). |
| `bedrock/require-server-only-on-queries` | Any `entities/<x>/api/<x>.queries.ts` missing the top-of-file `import 'server-only';`. Autofixable. |
| `bedrock/no-use-client-at-page-top` | `'use client'` at the top of `app/**/page.{ts,tsx,js,jsx}` or `src/pages/<route>/ui/<X>Page.{tsx,jsx}`. |
| `bedrock/events-only-from-shared` | An event-emitter library (`mitt`/`eventemitter3`/`nanoevents`/…) or a hand-rolled `new EventTarget()` bus **outside** `shared/lib/events/`. The kit has one cross-slice bus; slices use it via `@/shared/lib/events` (`cross-slice-communication.md`). |

The kit's other architectural rules (layer direction, same-layer slice imports, cycles)
are already well-covered by **Steiger**, **dependency-cruiser**, **eslint-plugin-boundaries**,
and **eslint-plugin-import** — this plugin doesn't duplicate them. See
`bedrock/ci/eslint-fsd-boundaries.cjs` for the recommended composition.

## Installation

The plugin lives in this repo under `bedrock/tools/eslint-plugin-bedrock` — it is **not yet
published to npm**. To use it today, install from a local path or a git URL:

```bash
# from a local clone of bedrock:
pnpm add -D file:./path/to/bedrock/tools/eslint-plugin-bedrock

# or directly from git (replace <ref> with a commit SHA or tag):
pnpm add -D 'github:Zero-One-Stack/bedrock#main' --filter eslint-plugin-bedrock
```

Once published to npm:

```bash
pnpm add -D eslint-plugin-bedrock
```

## Setup (flat config — ESLint 9+)

```js
// eslint.config.js
import bedrock from 'eslint-plugin-bedrock';

export default [
  {
    plugins: { bedrock },
    rules: bedrock.configs.recommended.rules,
  },
  // …your other configs
];
```

Or à la carte:

```js
import bedrock from 'eslint-plugin-bedrock';

export default [
  {
    plugins: { bedrock },
    rules: {
      'bedrock/no-deep-slice-import': ['error', { alias: '~' }],
      'bedrock/require-server-only-on-queries': 'error',
      // …
    },
  },
];
```

## Setup (legacy `.eslintrc` — ESLint 8)

```jsonc
{
  "plugins": ["bedrock"],
  "extends": ["plugin:bedrock/recommended"]
}
```

The legacy `extends` path is not yet wired — for ESLint 8, list the rules manually under
`rules` instead of `extends`.

## Configuration options

Every rule accepts an options object as `[severity, options]`. Most projects don't need to
override defaults; the most common knob is the tsconfig path alias.

### `bedrock/no-deep-slice-import`

```js
'bedrock/no-deep-slice-import': ['error', {
  alias: '@',                  // tsconfig path alias root (default: '@')
  slicedLayers: ['entities', 'features', 'widgets', 'pages'],
  allowRoutingBarrel: true,    // allow `pages/<x>/routing` (default: true)
}]
```

### `bedrock/no-cross-feature-x-import`

```js
'bedrock/no-cross-feature-x-import': ['error', {
  alias: '@',
  forbiddenLayers: ['features', 'widgets', 'pages'],
}]
```

### `bedrock/no-primitive-token-in-component`

```js
'bedrock/no-primitive-token-in-component': ['error', {
  // Each pattern is matched against the token NAME (--name part of var(--name)).
  primitivePatterns: [
    '^--color-(blue|red|green|yellow|grey|gray|black|white)-\\d+$',
    '^--space-\\d+$',
    '^--font-size-\\d+$',
    '^--radius-\\d+$',
    '^--z-\\d+$',
  ],
}]
```

Tune `primitivePatterns` to the **actual primitive scale your project ships**. Every kit's
token names differ — these defaults match the bedrock illustrative examples; your project
likely needs project-specific patterns. (`styling-and-tokens.md`)

### `bedrock/require-server-only-on-queries`

```js
'bedrock/require-server-only-on-queries': ['error', {
  // Path regex (default matches src/-wrapped + flat layouts, .ts and .js)
  filePattern: '[/\\\\]entities[/\\\\][^/\\\\]+[/\\\\]api[/\\\\][^/\\\\]+\\.queries\\.(ts|js)$',
}]
```

This rule is **autofixable** — `eslint --fix` inserts the missing
`import 'server-only';` at the top.

### `bedrock/no-use-client-at-page-top`

```js
'bedrock/no-use-client-at-page-top': ['error', {
  routePagePattern: '[/\\\\]app[/\\\\](.*[/\\\\])?page\\.(tsx|ts|jsx|js)$',
  fsdPageScreenPattern: '[/\\\\]src[/\\\\]pages[/\\\\][^/\\\\]+[/\\\\]ui[/\\\\][^/\\\\]+Page\\.(tsx|jsx)$',
}]
```

The FSD page-screen pattern intentionally restricts to direct children of `ui/` whose name
ends in `Page` — so nested client leaves (`pages/<route>/ui/sections/Header.tsx`) are not
caught. (`nextjs-app-router-fsd.md`)

### `bedrock/events-only-from-shared`

```js
'bedrock/events-only-from-shared': ['error', {
  eventLibraries: ['mitt', 'eventemitter3', 'nanoevents', 'eventemitter2', 'tiny-emitter'],
  eventsDir: 'shared/lib/events',  // the ONE place an emitter may be built
  flagRawEventTarget: true,        // also flag `new EventTarget()` outside eventsDir
}]
```

Files under `eventsDir` are exempt (that's where the bus is constructed). Set
`flagRawEventTarget: false` if your repo legitimately uses bare `EventTarget` for DOM-ish
utilities outside the events folder. (`cross-slice-communication.md`)

## Companion ESLint rules (use alongside this plugin)

These existing plugins cover the rest of the kit's architectural rules. The bedrock kit's
recommended composition:

```js
import bedrock from 'eslint-plugin-bedrock';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: { bedrock, boundaries, import: importPlugin, 'jsx-a11y': jsxA11y },
    rules: {
      // The bedrock-specific rules
      ...bedrock.configs.recommended.rules,

      // Layer direction + same-layer slice import bans (FSD direction)
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'pages',    allow: ['widgets', 'features', 'entities', 'shared'] },
          { from: 'widgets',  allow: ['features', 'entities', 'shared'] },
          { from: 'features', allow: ['entities', 'shared'] },
          { from: 'entities', allow: ['shared'] },
          { from: 'shared',   allow: ['shared'] },
        ],
      }],

      // Cycles (the kit bans them — feature-sliced-design.md)
      'import/no-cycle': ['error', { maxDepth: '∞', ignoreExternal: true }],

      // A11y on JSX (accessibility.md)
      ...jsxA11y.flatConfigs.recommended.rules,

      // No restricted imports (banned deps — services-and-data.md)
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'effector', message: 'Effector is banned — use React Query (services-and-data.md).' },
          { name: 'redux',    message: 'Redux is banned for server state — use React Query.' },
        ],
      }],
    },
  },
];
```

The kit's `bedrock/ci/eslint-fsd-boundaries.cjs` is the same composition in legacy format.

## Testing the plugin (contributors)

```bash
cd bedrock/tools/eslint-plugin-bedrock
npm install eslint @typescript-eslint/parser --no-save
npm test
```

All six rules ship with `node --test`-style tests using ESLint's `RuleTester`. Tests cover
valid and invalid cases for `src/`-wrapped + flat repo layouts, `.ts`/`.js`/`.tsx`/`.jsx`,
TypeScript-only syntax (`import type`), and JSX-bearing files.

## Why a plugin AND a hook?

Different layers, different jobs:

- **PreToolUse hook** fires synchronously on Edit/Write — the agent's first feedback. Catches
  what the agent is about to write before it lands.
- **eslint-plugin-bedrock** catches **existing** code and refactors that touch but don't
  satisfy the rule. The hook only sees the snippet being written; ESLint sees the resulting
  file.
- **Steiger / dependency-cruiser / OPA / CI fitness functions** catch tree-wide violations
  regardless of how the code got there (shell, MCP subagent, manual edit). These are the
  final mechanical layer.
- **`frontend-reviewer` agent + human review** is the contextual layer.

See `bedrock/rules/governance.md` § "The enforcement matrix" for the layered model and the
documented hook limits.
