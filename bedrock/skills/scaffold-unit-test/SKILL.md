---
name: scaffold-unit-test
description: Write or backfill a unit/integration test for an EXISTING component or hook, following this kit's testing rule (Testing Library + MSW, behavior-not-implementation, the 13 rules). Detects the repo's test runner (jest/vitest) and matches its API, renders via the repo's test-utils, queries by role/label, reuses .props.ts fixtures and existing mocks, and asserts data states (loading/success/empty/error) via MSW. Use when the user says "write/add tests for X", "backfill tests", "this component/hook has no test", "test this". For a brand-new component, scaffold-component already emits its test; this skill is for things that already exist. E2E flows go to scaffold-e2e instead.
---

# Scaffold Unit/Integration Test

Add a unit/integration test to something that **already exists**. This is the backfill path —
`scaffold-component` emits a test for new components, but nothing else covers "write a test for
this thing that's already here." Read **`.claude/rules/testing.md`** in full first; this skill
executes it, it does not restate it.

## Step 0 Recon (hard gate — read, don't assume)

Everything below is illustrative until confirmed against the repo:

1. **Test runner** — `package.json` (`vitest` vs `jest` dep + the `test` script) and config
   (`vitest.config.*` / `jest.config.*`). Map the API 1:1 (`jest.fn` ↔ `vi.fn`, etc. — table in
   `testing.md`). **Never mix runners in one file.**
2. **`test-utils`** — the shared `render` that wraps providers (QueryClient, i18n, Context). Find
   its real path/alias. Import `render`/`screen` from there, **not** `@testing-library/react`
   directly, whenever providers are needed.
3. **Test file convention** — `.test.tsx` vs `.spec.tsx`; co-located beside the unit (match the repo).
4. **Existing fixtures & mocks** — the target's `.props.ts`; any `*/*.mock.ts` and `*.msw.ts`
   handlers for services it calls. **Reuse before creating** (rules 5–7).
5. **a11y assertion** — `jest-axe` (both) or `vitest-axe` — match what's installed.

## Determine the subject

- **Component (atom/molecule)** → render per variant from `.props.ts`; assert roles/labels,
  `aria-invalid`/`role="alert"`, callbacks fire, disabled states, axe-clean.
- **Organism / feature component** → the data states **loading / success / empty / error** driven
  by **MSW handlers** (not by mocking the component or its providers).
- **Form** → validation errors surface; submit calls the mutation with the right payload;
  success and failure paths.
- **Hook** → `renderHook` from the repo's testing-library; assert returned state/transitions
  through its public API, never internal refs.

## Write the test

Co-locate as `<name>.test.tsx`/`.spec.tsx` next to the subject. Follow the **13 rules** verbatim —
the load-bearing ones for backfill:

- Render the **real** subject (rule 1); never mock providers `test-utils` already gives (rule 2).
- Test **behavior from the user's perspective** — accessible output and observable effects. **Never**
  assert on class names, token values, internal state, or private handlers.
- Query priority: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort).
- `userEvent.setup()` over `fireEvent`; `findBy*` over `waitFor`+`getBy*`; fake timers over real waits.
- Fixtures in `.props.ts`, API mocks in `*.mock.ts` — reuse, don't inline large data.
- Reset mocks in `beforeEach` (`jest.clearAllMocks()` / `vi.clearAllMocks()`).
- No `console.log`/`screen.debug()` left behind. No whole-tree snapshots as the primary assertion.

```tsx
// <name>.test.tsx  — runner-agnostic shape; use the repo's runner (jest OR vitest)
import { render, screen } from '@/test-utils';          // the repo's test-utils path
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';                          // or vitest-axe — match the repo
import { Subject } from './subject';
import { DefaultSubjectProps } from './subject.props';

describe('Subject', () => {
  beforeEach(() => jest.clearAllMocks());                // vi.clearAllMocks() on Vitest

  it('renders its default variant accessibly', async () => {
    const { container } = render(<Subject {...DefaultSubjectProps} />);
    expect(screen.getByRole('…', { name: '…' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('fires its callback on interaction', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();                           // vi.fn() on Vitest
    render(<Subject {...DefaultSubjectProps} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: '…' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
```

For an organism, drive the four data states through MSW handlers rather than props:
override the handler per test (`server.use(...)`) for the empty/error cases.

## Coverage

`testing.md` mandates **≥ 80%** overall, **90%+ on new code**. If this backfill is the unit's only
test, cover every meaningful branch (each variant, each data state, each validation path) — not just
the happy path.

## Done when

The test exists beside the subject, uses the repo's runner + `test-utils`, queries by role, reuses
existing fixtures/mocks, asserts behavior (never class names/tokens/internal state), and **passes
via the repo's real test script**. Run `/verify-build` to confirm it's green alongside lint/types.
If the subject completes a user-facing flow, that flow still needs an **E2E** spec — use
**`scaffold-e2e`**. Report the file written, what states it covers, and any fixture/mock reused.
