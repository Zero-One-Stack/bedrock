# CI — Fitness Functions, Supply Chain & ADR Gate

These configs turn the constitution from advice into **build-breaking tests**. The core research
finding: *drift resistance is a function of the enforcement mechanism, not documentation quality.*
A rule that isn't a CI gate will eventually be ignored.

## What's here

| File | Enforces | Tooling |
| --- | --- | --- |
| `steiger.config.ts` | **FSD architecture** — slices/segments, public API, same-layer isolation, `@x`, no over-slicing. | **Steiger** (official FSD linter) |
| `.dependency-cruiser.cjs` | No circular deps; FSD downward-only layer direction; no same-layer slice imports; no public-API sidestep; no orphans. | `dependency-cruiser` |
| `eslint-fsd-boundaries.cjs` | FSD layer direction + public-API barrier, in-editor. | `eslint-plugin-boundaries` |
| `fitness/lighthouserc.json` | Web Vitals budget (LCP/CLS/TBT) + a11y ≥ 0.95 (WCAG floor). | Lighthouse CI |
| `fitness/check-token-coverage.sh` | No literal hex/rgb/px in component CSS — tokens only. | grep, zero-dep |
| `../policy/` | Dependency governance: banned/pinned deps, expiring waivers. | Conftest / OPA |
| `github-actions-enterprise.yml` | The full gate: typecheck · lint · **FSD (Steiger)** · layer boundaries (dep-cruiser) · **token coverage** · unit · build · bundle budget · E2E · **Lighthouse (Web Vitals + a11y WCAG 2.1 AA)** · **dep audit + CycloneDX SBOM + dep policy** · **ADR-reference check**. | GitHub Actions |

See `fitness/README.md` (more fitness functions + visual-regression options) and `../policy/README.md`
(policy-as-code waivers).

## The fitness functions (each is a build-breaker)

- **FSD architecture** — **Steiger** (the official FSD linter) is the primary enforcer: it checks
  slices/segments, the per-slice public API, same-layer isolation, the `@x` cross-import API, and
  over-slicing — things ESLint/dep-cruiser can't see. `dependency-cruiser` +
  `eslint-plugin-boundaries` add layer-direction + public-API-barrier enforcement. Together they are
  the automated form of the FSD import rule and the no-circular-dependency hard bans
  (`feature-sliced-design.md`).
- **Bundle budget** — `size-limit` (configure budgets in `package.json`); a PR that blows the
  budget fails (ties to `performance.md`).
- **Accessibility floor** — axe (via `@axe-core/playwright`) or Lighthouse CI pegged at **WCAG 2.1
  AA**, the common legal denominator across EAA (EU, enforceable 2025-06-28), ADA (US), AODA (Canada).
  See `rules/compliance.md`.
- **ADR gate** — a PR touching architecture-tagged paths must reference an ADR (`docs/adr/NNNN`) or
  CI fails. This is what stops the durable-memory layer from being skipped (`rules/adr.md`).

## Supply chain (SBOM)

- `@cyclonedx/cyclonedx-npm` emits a **CycloneDX** SBOM per build, archived as a release artifact —
  the format expected under the EU CRA / US EO 14028. `pnpm audit` blocks high-severity advisories.
- To gate *new, unapproved* dependencies, add a policy-as-code check (Conftest/OPA) over
  `package.json` — see `rules/governance.md` (waivers) for how exceptions are logged.

## Adapt before use

Script names, the package manager, and path globs are **illustrative** — set them to the repo's
real values (Step 0 Recon). The Steiger + dependency-cruiser globs assume the FSD layout
`src/{app,pages,widgets,features,entities,shared}` (Next.js routing in the repo-root `app/`, outside
`src/`); adjust to the actual layout. Everything here is a starting policy, not a finished one.

## Sources
- Fitness functions — *Building Evolutionary Architectures* (O'Reilly).
- CycloneDX — https://cyclonedx.org/ ; SBOMs under the CRA — OpenSSF.
- WCAG 2.1 AA legal basis — EAA / EN 301 549, ADA, AODA (see `rules/compliance.md`).
