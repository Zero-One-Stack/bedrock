# Rule: CI / CD & Local Gates

> **Non-negotiable.** The constitution is only real if a machine enforces it. Every project runs
> the same checks **locally before commit** and **in CI before merge** — the same checks
> `/verify-build` runs. A green local run that CI can't reproduce isn't done.

## Why

Rules a human (or Claude) has to remember get skipped under pressure. Wiring the gates into
pre-commit hooks and CI makes consistency the **default path**, not a discipline.

## The gate (identical local and CI — this is `/verify-build`)

1. **typecheck** — `tsc --noEmit` (or the repo's script). Zero errors.
2. **lint + format** — ESLint (incl. `import/no-cycle` and boundary rules) + Prettier check.
3. **cycles** — `import/no-cycle` via lint, or `madge --circular`, or Nx boundaries (`component-structure.md`).
4. **unit/integration** — jest/vitest, coverage ≥ 80% (90%+ new) (`testing.md`).
5. **e2e** — Playwright on the built app (`testing.md`).
6. **build** — the production build succeeds (catches what dev mode hides).

Use the repo's **real script names** (Recon) and its task runner (Nx `affected` to scope to
changed projects; pnpm/npm scripts otherwise).

## Local gates (fast feedback)

- **pre-commit** (Husky + lint-staged, or the repo's tool): format + lint + typecheck the staged
  files. Fast — don't run E2E here.
- **pre-push** (optional): the affected unit tests.
- Hooks **mirror** CI; they never check *more* leniently than CI, or they give false confidence.

## CI (the merge gate)

- Runs the full gate on every PR; **a red gate blocks merge.** No "fix it after merge."
- Cache deps and Nx/build artifacts; run `affected` where possible to keep it fast.
- E2E runs against the built app (Playwright's webServer or a preview deploy).
- Don't bypass with `--no-verify` / skipped jobs to land a PR. A genuinely-needed skip is a
  dated, reasoned note in `project-specifics.md`.
- **Multi-team repos:** branch protection **requires review from Code Owners** so a cross-team
  change can't merge without the owning team (`team-ownership.md`). Enterprise systems also run the
  ADR-reference gate (`adr.md`) and the contract/version check (`contracts-and-versioning.md`) — see
  `ci/github-actions-enterprise.yml`.

### Sample GitHub Actions (adapt scripts/runner to the repo — Recon)

```yaml
# .github/workflows/ci.yml — illustrative; use the repo's real script names + package manager
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint           # includes import/no-cycle + boundary rules
      - run: pnpm format:check
      - run: pnpm test           # unit/integration, coverage gate
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps
      - run: pnpm e2e            # Playwright against the built app
```

(Nx repos: prefer `pnpm exec nx affected -t lint test build e2e`.)

## Hard rules

- ❌ A project with **no CI gate**, or CI that skips any of typecheck/lint/cycles/unit/e2e/build.
- ❌ Local hooks more lenient than CI (false green).
- ❌ Merging past a red gate, or `--no-verify` to dodge hooks, without a logged exception.
- ✅ Local hooks + CI run the same `/verify-build` checks with the repo's real scripts.
- ✅ Record the CI provider + the gate scripts in `project-specifics.md`.

## Sources
- [GitHub Actions — Building & testing Node.js](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Playwright — CI](https://playwright.dev/docs/ci)
- [Nx — Affected & CI](https://nx.dev/ci/features/affected)
