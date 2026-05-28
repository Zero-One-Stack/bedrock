# Tech Radar — Zero One Stack — updated 2026-05-25 (next review: 2026-08-24)

The org-level register of technology stances. Rings: **Adopt** (default) · **Trial** (use with an
ADR) · **Assess** (explore, not production) · **Hold** (don't start new work). See `rules/tech-radar.md`.
Permanent `Hold` entries mirror the `CLAUDE.md` hard bans — keep them consistent.

## Languages & Frameworks
| Tech | Ring | Since | Note / ADR |
| --- | --- | --- | --- |
| Next.js (App Router) | Adopt | 2026-Q1 | Default app framework. |
| React | Adopt | 2026-Q1 | Always latest. |
| TypeScript (strict) | Adopt | 2026-Q1 | `any` banned. |
| TanStack React Query | Adopt | 2026-Q1 | Server state. |
| React Hook Form + Zod | Adopt | 2026-Q1 | Forms + boundary validation. |
| Effector / Redux (server state) | Hold | 2026-Q1 | Banned — React Query (services-and-data.md). |
| Tailwind CSS | Assess | 2026-Q1 | Now allowed per the engine-agnostic pivot (styling-engine.md). Trial in a new repo before adopting org-wide. |
| Chakra UI v3 | Assess | 2026-Q1 | Now allowed per the engine-agnostic pivot (styling-engine.md). |
| vanilla-extract / Panda CSS | Assess | 2026-Q1 | Build-time CSS-in-JS — pairs well with the kit's tokens-recommended path. |
| Emotion / styled-components (runtime CSS-in-JS) | Trial | 2026-Q1 | Allowed but watch the perf budget (performance.md) — runtime engines hit RSC hydration. |

## Tools
| Tech | Ring | Since | Note / ADR |
| --- | --- | --- | --- |
| 3-tier DTCG design tokens (engine-mapped) | Adopt | 2026-Q1 | Recommended for any engine; maps to Tailwind theme / Chakra tokens / CSS vars / vanilla-extract themes (styling-and-tokens.md, styling-engine.md). |
| CSS Modules | Adopt | 2026-Q1 | One of the supported engine choices (styling-engine.md). |
| Playwright (E2E) | Adopt | 2026-Q1 | Mandatory E2E layer (testing.md). |
| Jest / Vitest (unit) | Adopt | 2026-Q1 | Detect per repo. |
| dependency-cruiser | Adopt | 2026-Q1 | Boundary/cycle fitness function. |
| Conftest / OPA | Trial | 2026-Q2 | Dependency policy gate (policy/). |
| Chromatic (visual regression) | Assess | 2026-Q2 | Evaluate vs. Playwright snapshots. |

## Platforms
| Tech | Ring | Since | Note / ADR |
| --- | --- | --- | --- |
| Nx (monorepo) | Adopt | 2026-Q1 | When a monorepo is warranted (monorepo-architecture.md). |
| Next.js Multi-Zones | Adopt | 2026-Q2 | Native independent-deploy path; Tier 2 (monorepo-architecture.md). |
| Module Federation on Next App Router | Hold | 2026-Q1 | `nextjs-mf` EOL late 2026 — not viable. |
| CycloneDX SBOM | Adopt | 2026-Q2 | Per-build, archived (compliance.md). |

## Techniques
| Tech | Ring | Since | Note / ADR |
| --- | --- | --- | --- |
| Feature-Sliced Design (FSD) | Adopt | 2026-Q2 | The core architecture: layers/slices/segments, @x, public API (feature-sliced-design.md). |
| Steiger (official FSD linter) | Adopt | 2026-Q2 | FSD enforced in CI + /verify-build (ci/steiger.config.ts). |
| Atomic design inside shared/ui | Adopt | 2026-Q1 | Optional sub-convention for the design system (component-structure.md). |
| Architecture fitness functions in CI | Adopt | 2026-Q2 | ci/fitness/. |
| ADRs (MADR) | Adopt | 2026-Q2 | Durable decision memory (adr.md). |
| Step 0 Recon gate | Adopt | 2026-Q1 | Anti-hallucination grounding. |
| C4 system-architecture docs | Adopt | 2026-Q2 | Living landscape view (system-architecture.md); ADR-0001. |
| CODEOWNERS + scope:team-* ownership | Adopt | 2026-Q2 | Team boundaries enforced at merge (team-ownership.md); ADR-0001. |
| Expand→migrate→contract (shared contracts) | Adopt | 2026-Q2 | Safe evolution across non-atomic deploys (contracts-and-versioning.md). |
| Deploy ≠ release (feature flags) | Adopt | 2026-Q2 | Ship dark, release by flag; canary + rollback (release-and-deploy.md). |
