# Rule: Testing

> **Non-negotiable — two layers, both required for every build.**
> **(1) Unit/integration:** Jest **or** Vitest + Testing Library + MSW. Coverage **≥ 80%**
> (statements/branches/functions/lines), 90%+ on new code. The 13 rules below are mandatory.
> **(2) End-to-end:** Playwright (default) — at least one real user-flow test per user-facing
> feature, against the running app. **Shipping a feature with only one layer is incomplete.**
> Unit tests prove the pieces; E2E proves the flow a user actually performs.

## Which layer tests what (don't duplicate)

| Layer | Tool | Scope | Don't |
| ----- | ---- | ----- | ----- |
| **Unit/integration** | Jest/Vitest + Testing Library + MSW | A component or hook in isolation; rendered output, a11y, callbacks, data states (mocked at the network with MSW). | Drive a real browser or hit a real backend. |
| **E2E** | Playwright | A whole user journey across pages in a real browser — the critical paths (sign in → do the thing → see the result). | Re-test every prop permutation (that's the unit layer's job). |

A feature is "tested" when its components have unit/integration coverage **and** its primary
journey has an E2E test. Map this in the architect's plan (`architecture.md`) so neither is skipped.

### Which FSD layer owes which test

Reviewers can't answer "what tests does an entity owe vs a feature?" without a rule. The kit's
mapping — read top to bottom; lower-layer tests are foundational, higher-layer tests build
on them without re-asserting the same things:

| FSD layer | Owed unit/integration test | E2E? |
| --- | --- | --- |
| **`shared/ui`** | Render + variants + a11y (jest-axe). Hook test for `*.behavior.ts`. Visual regression via Storybook (`storybook.md`). | No (covered by features that consume it). |
| **`shared/lib`** | Pure unit tests for every exported helper (formatter, date util, `cx`, `Slot`, recipe, etc.). Branch coverage matters here. | No. |
| **`shared/api`** | Transport-layer test: success + error + Zod validation against a mocked endpoint (MSW). | No. |
| **`shared/config`** | Validate Zod schemas parse a valid input and reject an invalid one. | No. |
| **`entities/<x>/model`** | The Zod schema's contract (round-trip a known good payload; reject a malformed one). Selectors/derived computations get pure-function tests. | No. |
| **`entities/<x>/api`** | Query test: MSW returns mock data → query fn returns parsed types. Error path: HTTP 500 → throw. | No. |
| **`entities/<x>/ui`** | Component render test (read-only entity views) + axe. | No. |
| **`features/<x>/model`** | Form schema test: valid input parses, invalid input fails with the expected error path. Hook test for `use<X>` (RHF wiring, controlled props). | No. |
| **`features/<x>/api`** | Server-Action contract test: given a valid payload, calls the backend with the right body and revalidates. Given an invalid payload, throws Zod. | No. |
| **`features/<x>/ui`** | Integration test: render the form, fill it via Testing Library, submit, assert the action was called with the right input and the success/error UI rendered (action mocked). | One **happy-path E2E** per user-valuable feature (Playwright). |
| **`widgets/<x>`** | Composition integration test: render the widget with mocked features/entity data, assert the wiring (a feature's `onSubmit` updates the entity view). | Optional — usually covered by the feature's E2E. |
| **`pages/<route>`** | Smoke render only (the page composes widgets; the widgets are already covered). Don't repeat widget assertions. | E2E for the route's critical journey (`/login`, `/checkout/*`, the user-valuable path). |
| **`app/providers`** | A render-with-providers helper used by every component test (`@/test-utils`); the providers themselves don't usually own tests beyond the smoke that they mount without crashing. | No. |
| **`app/model` (sitemap/robots/manifest)** | The sitemap output validates against `MetadataRoute.Sitemap`; robots returns the expected disallow list. | No. |

**The DRY rule:** each layer's test asserts the layer's own contract — not the contracts
above or below it. The feature integration test doesn't re-assert "the input has
`aria-invalid` when `errorText` is set" — that's the atom's test. The page test doesn't
re-assert "the form submits with the right body" — that's the feature's test. The E2E
doesn't re-assert "validation catches an empty title" — that's the feature's model test.

## Detect the test runner first (Step 0 Recon)

The examples below are written in **Jest** because one syntax had to be picked. **Determine the
actual runner before writing a test** — check `package.json` (`vitest` vs `jest` dep + the
`test` script) and config (`vitest.config.*` / `jest.config.*`). Then map the API 1:1:

| Jest                    | Vitest equivalent              |
| ----------------------- | ------------------------------ |
| `jest.fn()`             | `vi.fn()`                      |
| `jest.mock(…)`          | `vi.mock(…)`                   |
| `jest.mocked(x)`        | `vi.mocked(x)`                 |
| `jest.clearAllMocks()`  | `vi.clearAllMocks()`           |
| `jest.useFakeTimers()`  | `vi.useFakeTimers()`           |
| globals auto-injected   | import from `vitest`, or set `globals: true` |

For the a11y assertion: `jest-axe` works under both; on Vitest `vitest-axe` is also common —
match what the repo already has. **Never mix runners in one file**, and use the repo's runner
consistently.

## Guiding principle

> "The more your tests resemble the way your software is used, the more confidence they can
> give you." — Test **behavior from the user's perspective, never implementation details.**
> Don't assert on internal state, private functions, class names, or token values — those
> change without changing behavior and make tests brittle. Assert on accessible output and
> user-observable effects.

## Setup

- Tests render via a shared `test-utils` `render` that wraps every required provider
  (QueryClientProvider, I18nextProvider, any app Context). Import `render`/`screen` from
  there — **not** from `@testing-library/react` directly when providers are needed.
- API is mocked with **MSW 2.x** handlers from each service's `*.msw.ts`.
- Co-locate the test as `component-name.test.tsx` (or `.spec.tsx` — match the repo) next to the component.

```tsx
// test-utils/index.tsx (per project)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import type { PropsWithChildren, ReactElement } from 'react';

const Providers = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## The 13 rules

**1. Never mock the component you're testing.** Render the real one. (Exception: external
third-party components needing browser APIs the test env lacks — mock those at the module edge.)

**2. Never mock providers already supplied by `test-utils`.** Use the `test-utils` `render`;
don't stub `QueryClientProvider`/`I18nextProvider`.

**3. Use semantic HTML + tokens for structure, not raw styled divs.** In tests this means
you can query by role because the markup is accessible.

**4. No console output in tests.** Remove `console.log`, `screen.debug()` before commit.

**5. Mock data lives in separate files.** Component fixtures in `component-name.props.ts`;
API/response mocks in `service-name.mock.ts`. Never inline large fixtures in a test.

**6. Reuse existing mocks** before creating new ones. Check `*/*.mock.ts` and shared
mock folders first.

**7. Default props in `.props.ts`,** imported by both stories and tests.

**8. Use fake timers for async/delayed logic** instead of real waits.
```tsx
jest.useFakeTimers();
render(<DataLoader />);
act(() => jest.runAllTimers());
expect(screen.getByText('Content')).toBeInTheDocument();
jest.useRealTimers();
```

**9. Keep async chains short.** Prefer testing small units over long multi-step click chains.

**10. Prefer `findBy*` over `waitFor` + `getBy*`.**
```tsx
expect(await screen.findByText('Loaded')).toBeInTheDocument();
```

**11. Prefer `userEvent` over `fireEvent`.**
```tsx
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: 'Submit' }));
await user.type(screen.getByRole('textbox'), 'hello');
```

**12. Query priority:** `getByRole` → `getByLabelText` → `getByText` → `getByTestId`
(last resort). Test ids are an escape hatch, not the default.

**13. Reset mocks in `beforeEach`:** `jest.clearAllMocks()` (`vi.clearAllMocks()` on Vitest).

## Mocking conventions

Use `jest.mocked()` — concise and type-safe. (On Vitest: `vi.mock` / `vi.mocked` — same shape.)

```tsx
import { getAppointments } from './appointments.api';
jest.mock('./appointments.api');
const mockGet = jest.mocked(getAppointments);

beforeEach(() => jest.clearAllMocks());

it('shows appointments', async () => {
  mockGet.mockResolvedValue(mockAppointments);
  render(<AppointmentList />);
  expect(await screen.findByText('…')).toBeInTheDocument();
});
```

## What to test

- **Atoms/molecules:** rendering per prop variant (from `.props.ts`), accessibility
  (roles/labels/`aria-invalid`/`role="alert"`), event callbacks fire, disabled states.
- **Organisms / feature components:** data states — loading, success, empty, error — using MSW handlers.
- **Form pages:** validation errors surface, submit calls the mutation with the right payload,
  success/failure paths.

## End-to-end (Playwright)

> Detect the E2E runner in Recon (Playwright is the default; some repos use Cypress — match the
> repo). E2E specs live in the repo's `e2e/` (or `tests/e2e/`) dir, **not** beside components.

What E2E must cover, per feature:
- **The critical happy path** end to end (e.g. sign in → reach dashboard → complete the core action).
- **At least one failure path** that matters to the user (invalid input rejected, error surfaced).
- Auth-gated flows: that protected routes redirect when unauthenticated and work when authenticated.

How to write them (same Testing-Library philosophy — user's perspective):
- **Query by role/label/text**, the accessible way a user finds things — not CSS selectors or test
  ids (a test id is the last-resort escape hatch, mirroring the unit-layer query priority).
- Use **web-first assertions** (`await expect(locator).toBeVisible()`) and auto-waiting locators;
  no fixed `sleep`s.
- Control the backend deterministically: either Playwright network **route mocking**, or a seeded
  test environment. Don't assert against shifting production data.
- Keep each spec to **one journey**; keep flows short and independent.

```ts
// e2e/<feature>.spec.ts  (Playwright)
import { test, expect } from '@playwright/test';

test('user completes the core flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

Wire `e2e` as a script in `package.json` (Recon records its name). `/verify-build` runs it; CI
runs it on the build. A user-facing feature merged with **no** E2E flow is a review finding.

## Scaffolding tests (the repeatable actions)

- **`/scaffold-unit-test`** — write or backfill a unit/integration test for an **existing**
  component or hook to this rule. (A brand-new component already gets its test from
  `/scaffold-component`.)
- **`/scaffold-e2e`** — stand up the Playwright harness (one-time) and a per-feature journey spec
  (happy path + a failure path + auth redirect).

Both close with `/verify-build` to prove the new tests are green via the repo's real scripts.

## Anti-patterns

- ❌ Asserting on class names or token values. Assert behavior and accessible output.
- ❌ Snapshotting whole trees as the primary test. Targeted assertions instead.
- ❌ Testing implementation details (internal state, private handlers).
- ❌ Shipping a feature with unit tests but **no E2E flow** (or vice-versa). Both layers, always.
- ❌ E2E that re-tests prop permutations, or unit tests that try to drive a real browser/backend.
- ❌ CSS-selector / fixed-`sleep` E2E. Use role/label locators + web-first auto-waiting assertions.

## Sources
- [Kent C. Dodds — Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Library — Guiding Principles & query priority](https://testing-library.com/docs/queries/about/#priority)
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright — Locators & web-first assertions](https://playwright.dev/docs/locators)
