# Rule: TypeScript & Code Quality

> Strict TypeScript, no `any`, accessible by default, i18n everything user-facing.

## TypeScript — absolute rules

- **`strict: true`.** No loosening per-file.
- **No `any`.** Use `unknown` and narrow with a type guard. No `as` assertions without a
  runtime check behind them.
- **Explicit return types** on exported/public functions.
- **`interface` for object shapes** (extendable); **`type` for unions/intersections/utilities**.
- **Constrain generics** (`<K extends keyof T>`), don't fall back to `any`.
- **Validate external data with Zod** at the boundary (see `services-and-data.md`), then
  trust the inferred type inward.

```ts
// ❌ const result = response as MyType;
// ✅
function isMyType(d: unknown): d is MyType {
  return typeof d === 'object' && d !== null && 'field' in d;
}
```

## Accessibility, responsive, performance

These are first-class concerns with their own rules — read them, don't improvise:
- **`accessibility.md`** — WCAG 2.2 AA (semantic HTML, keyboard, focus, contrast, targets, motion).
- **`responsive-design.md`** — mobile-first, breakpoint tokens, container queries, touch targets.
- **`performance.md`** — Core Web Vitals, `next/image`/`next/font`, RSC-first, bundle budgets.

The baseline they all assume: real semantic elements, tests query by role/label (which forces
accessible markup — see `testing.md` rule 12), and design values come from tokens.

## Internationalization

**No hardcoded user-facing strings** — use `react-i18next` (or accept text as a prop for pure
presentational atoms). Full rules — semantic namespaced keys, interpolation/plurals/`Intl`,
RTL/logical CSS, `lang`/`dir` — live in **`i18n.md`**. Read it before touching copy or locales.

## Next.js specifics

- **App Router.** Server Components by default; add `'use client'` only when the component
  needs interactivity/state/effects/browser APIs.
- Data fetching for server components can use the api-layer functions directly; client
  components use React Query hooks.
- Use `next/image`, `next/link`, `next/font`. No raw `<img>` for app imagery.
- Keep client bundles lean — push logic to server components / hooks where possible.

## Logging

- **Frontend:** no `console.log` in committed code. Dev-only logging behind
  `process.env.NODE_ENV === 'development'`. Use the project's error-tracking (e.g. Sentry)
  for exceptions.
- **No PII in logs.**

## Documentation tone

READMEs and docs are factual, not promotional. State what it does, how to use it, its
dependencies, and known limitations. No "blazing fast", "world-class", "revolutionary".

## Tooling discipline

- Run the project's `lint` / `format` / `typecheck` / `test` scripts before declaring done.
- Prefer the repo's task runner (Nx/pnpm scripts) over invoking raw `jest`/`eslint`.
- Fix lint at the source; don't blanket-disable rules. A justified, scoped
  `// eslint-disable-next-line <rule>` with a reason is the exception.
