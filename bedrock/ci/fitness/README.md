# Fitness Functions — continuous architectural + quality gates

Beyond the boundary checks in `../.dependency-cruiser.cjs`, these make more of the constitution
*measurable and build-breaking* (the "drift resistance = enforcement" principle). Each is a test,
run in CI; a regression fails the build.

| Fitness function | File | Enforces | Tool |
| --- | --- | --- | --- |
| **Web Vitals + a11y budget** | `lighthouserc.json` | LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms; a11y ≥ 0.95 (WCAG floor) | Lighthouse CI |
| **Token coverage** | `check-token-coverage.sh` | No literal hex/rgb/hsl (and no raw px/rem, warn) in component CSS — everything is a token | grep-based, zero-dep |
| **Visual regression** | (see below) | Components/pages don't change appearance unintentionally | Playwright snapshots / Chromatic |
| **Bundle budget** | `size-limit` (in `package.json`) | Bundle size stays under budget (`performance.md`) | size-limit |
| **FSD architecture** | `../steiger.config.ts` | Slices/segments, public API, same-layer isolation, `@x`, no over-slicing | Steiger (official) |
| **Layer boundaries + cycles** | `../.dependency-cruiser.cjs` | FSD downward-only direction, no same-layer slice import, no public-API sidestep, no cycles | dependency-cruiser |

## Run

```bash
# Web Vitals + a11y (against the built app):
npx @lhci/cli autorun --config=ci/fitness/lighthouserc.json
# Token coverage:
ci/fitness/check-token-coverage.sh src
```

Both are wired into `../github-actions-enterprise.yml`. Adapt URLs/paths to the repo (Recon).

## Visual regression (choose one, then wire it)

- **Playwright snapshots** (zero extra service): `await expect(page).toHaveScreenshot()` in the E2E
  suite; commit baseline images; CI fails on a diff. Cheapest if you already run Playwright.
- **Storybook + Chromatic** (hosted, richer review UI): snapshots every story per viewport; good for
  a design-system kit since stories already exist (`component-structure.md`). Paid service.

Record the choice in `rules/project-specifics.md`. Visual regression is **recommended, not a hard
gate** by default — turn it blocking once baselines are stable, or it produces noise early on.

## Philosophy

A fitness function "measures how well a system preserves the properties its designers care about as
the code changes" (*Building Evolutionary Architectures*). Add one whenever a rule keeps getting
violated despite being documented — that's the signal it needs to be a test, not a paragraph.

## Sources
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Building Evolutionary Architectures — fitness functions](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781492097532/)
