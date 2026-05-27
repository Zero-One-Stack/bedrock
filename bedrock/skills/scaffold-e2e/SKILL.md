---
name: scaffold-e2e
description: Stand up the end-to-end test harness (Playwright by default — Cypress if the repo already uses it) and write a per-feature user-journey spec, following this kit's testing rule. Handles both the one-time setup (install + config + webServer + e2e script + CI install step) and the recurring per-feature spec (critical happy path + one failure path + auth-gated redirect), using role/label locators and web-first auto-waiting assertions against the running app. Use when the user says "add E2E", "write a Playwright test", "test this flow end to end", "set up e2e", or ships a user-facing feature that has no E2E coverage. Unit/integration tests go to scaffold-unit-test instead.
---

# Scaffold E2E

End-to-end is **mandatory and the kit's biggest blind spot at write-time**: `testing.md` requires a
journey spec per user-facing feature and `/verify-build` fails a feature shipped without one — but
nothing else helps you *create* it. This skill does. Read **`.claude/rules/testing.md` (End-to-end
section) + `.claude/rules/ci.md`** first; this skill executes them.

E2E proves the flow a user actually performs; unit tests prove the pieces. A feature is "tested"
only when **both** exist. This skill is the E2E half — never let it substitute for unit coverage
(`scaffold-unit-test`).

## Step 0 Recon (hard gate)

1. **E2E runner present?** Look for `@playwright/test` (default) or `cypress` in `package.json`,
   plus a config (`playwright.config.*` / `cypress.config.*`) and an `e2e/` or `tests/e2e/` dir.
   **Match the repo if one exists**; only scaffold the harness if there is none.
2. **Package manager + scripts** — the real `dev`/`build`/`start` scripts (the `webServer` needs
   them) and any existing `e2e`/`test:e2e` script. Don't invent script names.
3. **App entry + auth shape** — base URL/port the app serves on; how a user authenticates (the real
   route, the real field labels) so the journey is accurate, not guessed.
4. **Backend control** — is there a seeded test env, or should specs mock the network at the route
   layer? `testing.md` requires deterministic control — never assert against shifting prod data.

## A. Harness setup (one-time — skip if the repo already has E2E)

Default to **Playwright**. Install and init, then make the config match the kit:

```bash
# only if no E2E runner exists yet — use the repo's package manager
pnpm create playwright@latest      # or: pnpm add -D @playwright/test && pnpm exec playwright install
```

`playwright.config.ts` — the load-bearing settings:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',                                  // specs live here, NOT beside components
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: {                                       // boots the real app for the run
    command: 'pnpm build && pnpm start',             // ← the repo's real scripts (Recon)
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

Then:
- Add the **`e2e` script** to `package.json` (`"e2e": "playwright test"`) — `/verify-build` and CI
  call it by that name.
- Add the CI install step (`pnpm exec playwright install --with-deps`) to the workflow if missing
  (`ci.md` shows where). E2E runs against the **built** app in CI.
- Record the runner, the `e2e` script, and the base URL in `rules/project-specifics.md`.

## B. Per-feature journey spec (the recurring action)

One spec per feature, in `e2e/<feature>.spec.ts`. Per `testing.md`, each feature's E2E must cover:

- **The critical happy path** end to end (e.g. sign in → reach the feature → complete its core action).
- **At least one failure path** that matters to the user (invalid input rejected, error surfaced).
- **Auth-gated routes:** protected route redirects when unauthenticated, works when authenticated.

Write them the **Testing-Library way** — from the user's perspective:

- **Locators by role/label/text**, the accessible way a user finds things — not CSS selectors. A
  `getByTestId` is the last-resort escape hatch, mirroring the unit-layer query priority.
- **Web-first assertions** (`await expect(locator).toBeVisible()`) and auto-waiting locators — **no
  fixed `sleep`/`waitForTimeout`**.
- **Deterministic backend** — Playwright `page.route(...)` mocking or a seeded env; never assert
  against live prod data.
- **One journey per spec**, short and independent. Don't re-test prop permutations (that's the unit
  layer).

```ts
// e2e/<feature>.spec.ts
import { test, expect } from '@playwright/test';

test('user completes the core flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('invalid credentials surface an error', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('bad@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert')).toContainText(/invalid/i);
});

test('protected route redirects when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
});
```

(If the repo uses **Cypress**, keep the same principles — `cy.findByRole`/`@testing-library/cypress`,
auto-retrying assertions, no fixed waits, route stubbing — in `cypress/e2e/`.)

## Anti-patterns (review findings)

- ❌ CSS-selector locators or `getByTestId` as the default. Use role/label/text.
- ❌ Fixed `sleep`/`waitForTimeout`. Use auto-waiting locators + web-first assertions.
- ❌ Asserting against live/shifting backend data. Mock the route or seed a test env.
- ❌ One mega-spec chaining many journeys. One journey per spec.
- ❌ E2E re-testing every prop permutation — that's the unit layer's job.
- ❌ Specs beside components. They live in `e2e/`.

## Done when

The `e2e` script exists, the config boots the real app via `webServer`, and the feature has its
journey spec (happy path + a failure path + any auth redirect) using role/label locators and
web-first assertions. Run it via the repo's `e2e` script and confirm green; `/verify-build` and CI
run the same script. Report the spec(s) written, the flows covered, how the backend was controlled,
and — if E2E can't run in this sandbox (no browser) — say so plainly rather than implying it passed.
