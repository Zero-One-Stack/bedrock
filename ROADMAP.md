# Claude Kits — Roadmap

**One kit, `bedrock`** — the universal constitution (the paved road) *and* the
governance/enforcement layer (managed-settings, hooks, ADRs, tech-radar, CI fitness functions,
policy-as-code), merged into a single plugin. *(Earlier drafts split this into a base kit + a
separate `nextjs-react-enterprise` overlay; they were combined — same content, one folder.)* This
roadmap tracks what's shipped and what's next, ordered by leverage.

Guiding principle (from the research): **drift resistance is a function of the enforcement
mechanism, not documentation quality.** Each phase moves more of the standard from *advisory docs*
to *enforced gates* and from *mutable notes* to *durable, propagating memory*.

---

## ✅ Shipped (v1.0)

**Base kit — the constitution**
- 17 rules (**feature-sliced-design**, architecture, components, tokens, a11y, responsive,
  performance, services/data, security, testing [unit+E2E], i18n, observability, TS/quality, CI,
  monorepo, + README, + the living `project-specifics.md`).
- 4 agents: `frontend-architect` (plan), `component-builder` (build), `frontend-reviewer`
  (review + runs `/verify-build`), `monorepo-architect`.
- 8 skills: scaffold-component/service/monorepo, add-design-token, verify-build, migrate-to-kit,
  sync-kit, **kit-init**.
- Anti-hallucination spine: **Step 0 Recon gate**, illustrative-not-literal examples, no circular
  deps, two-tier memory.

**Enterprise overlay — enforcement + governance + durable memory**
- **Deterministic hooks:** SessionStart (inject memory + Recon reminder), PreToolUse (block banned
  imports), PostToolUse (audit log → SOC 2 evidence).
- **Locked org tier:** `managed-settings.json` (OS-deployed; projects inherit, can't weaken).
- **ADR durable memory:** `rules/adr.md` + MADR template + `/adr` skill + `adr-author` agent.
- **CI fitness functions:** dependency-cruiser (boundaries/cycles) + enterprise GH Actions
  (a11y WCAG 2.1 AA, CycloneDX SBOM, ADR-reference gate, bundle budget).
- **Governance + compliance rules:** locked/delegated tiers, time-boxed waivers; EAA/ADA/AODA floor.

**Distribution (now live)**
- One kit packaged at the **plugin root**; `Claude-Kits/.claude-plugin/marketplace.json` lists it.
  Install via `/plugin install bedrock@zos` → `/bedrock:kit-init` (constitution can't
  auto-load from a plugin, so the init skill copies it in) → `/bedrock:enterprise-init` (wires
  governance/CI/ADR). Copy + managed-settings paths also supported. See `bedrock/INSTALL.md`.

---

## ▶ Phase 2 — Make it real on actual projects (NEXT — the real frontier)

The kit is built; now prove it on the portfolio.
1. ◐ **Stand up the kits repo + marketplace.** *Repo published at `Zero-One-Stack/bedrock`.*
   Remaining: pin versions in `marketplace.json` per release. *(Unblocks one-command install.)*
2. **Onboard one pilot project end-to-end** (Sertus or Verx): `kit-init` → `enterprise-init` →
   adapt the CI workflow's script names/path globs to the real repo → green gate. Capture friction.
3. **Deploy `managed-settings.json` to your machine(s)** via the OS path; tune the deny/ask lists
   to your real tools before locking. *(Activates the Tier-0 floor.)*
4. **Backfill ADRs** for the pilot's already-made big decisions, so the durable memory isn't empty.

**Done when:** one project runs the full Plan→Build→Verify→Review loop with hooks live and a green
enterprise CI gate, and you've felt where the docs need tightening.

## ✅ Phase 3 — Harden enforcement (SHIPPED)

Advisory rules turned into deterministic checks.
- ✅ **Policy-as-code waivers (OPA/Conftest):** `policy/package-policy.rego` + `policy/waivers.yaml`
  — banned/pinned deps fail CI; deviations are dated, **expiring** waivers; wired to `governance.md`.
- ✅ **New-dependency gate:** the Conftest step + SBOM diff in the CI workflow's `supply-chain` job.
- ✅ **More fitness functions:** `ci/fitness/lighthouserc.json` (Web-Vitals + a11y budget),
  `ci/fitness/check-token-coverage.sh` (no literal CSS values); dependency-cruiser already covered
  boundaries/cycles. Visual-regression documented as opt-in (`ci/fitness/README.md`).
- ◐ **Remaining:** harden the PreToolUse ban-hook against edge cases (multi-edit, partial strings)
  and widen the banned-pattern set as real violations surface — best done during the Phase-2 pilot.

## ✅ Phase 4 — Scale memory & knowledge (SHIPPED)

The standard is now a living system, not a static kit.
- ✅ **Tech Radar** (`rules/tech-radar.md` + `docs/radar/radar.md`): Adopt/Trial/Assess/Hold register,
  org-level decision layer above per-project ADRs; reviewed ~quarterly.
- ✅ **ADR index/rollup:** `skills/adr-index` generates `docs/adr/README.md`.
- ✅ **`AGENTS.md` cross-tool export:** `skills/agents-md-export` mirrors the constitution to the open
  standard so non-Claude tools follow the same rules.
- ✅ **Auto-memory hygiene:** `skills/memory-hygiene` reconciles `project-specifics.md` against the
  repo (stale cache, drifted features, expired waivers).
- ◐ **Remaining:** cross-project ADR sharing for consultancy-wide calls — revisit once 2–3 projects
  are onboarded (Phase 2).

## ✅ Phase 4.5 — Multi-team scale layer (SHIPPED)

The governance model asserted "multiple teams at scale"; this phase makes it *enforced* and
*documented*, not narrative. Four enterprise rules + a new `docs/architecture/` home.
- ✅ **System architecture** (`rules/system-architecture.md` + `docs/architecture/` + `0000-template.md`):
  the living C4-aligned landscape view (context → containers → components → data/contract flow → team
  map), the synthesis above ADRs/radar. Dogfooded in `docs/architecture/bedrock-system.md`.
- ✅ **Team ownership** (`rules/team-ownership.md`): `CODEOWNERS` + `scope:team-*` Nx tags + required
  cross-team review — promoted to a **`CLAUDE.md` hard ban** (no editing another team's area without
  review) and a `ci.md` Code-Owner-review gate. Module boundaries ≠ team boundaries.
- ✅ **Contracts & versioning** (`rules/contracts-and-versioning.md`): evolving shared
  packages/APIs/zones across non-atomic deploys — semver, Zod/OpenAPI contracts, expand→migrate→contract.
- ✅ **Release & deploy + server surface** (`rules/release-and-deploy.md`): promotion path,
  build-once-promote, feature flags, canary + rollback; **plus** the Next.js server surface (Route
  Handlers/Server Actions/BFF — thin, validated, authenticated), previously unowned.
- ✅ Wired into `enterprise-init` (copy-list + gated architecture/CODEOWNERS scaffold steps), the
  `CLAUDE.md` router, `rules/README.md`, and `ci.md`. Recorded as ADR-0001.

## ✅ Phase 4.75 — Feature-Sliced Design (SHIPPED, v3.0)

The kit's frontend architecture is now **Feature-Sliced Design (FSD)** end-to-end — replacing the
earlier "atomic + ad-hoc feature slices" model with a standardized, mechanically-checkable layering.
- ✅ **The architecture rule** (`rules/feature-sliced-design.md`): six layers
  (`app→pages→widgets→features→entities→shared`), the downward-only import rule, the same-layer ban +
  the `@x` entities cross-import exception, slices/segments, the per-slice public API, the Next.js
  root-`app/`+`src/` layout, reads-down/writes-up, and the insignificant-slice trap.
- ✅ **Reframed rules:** `architecture.md` (decompose by layer), `component-structure.md` (file
  contract within `ui/`, atomic kept as a `shared/ui` sub-convention), `services-and-data.md` (entity
  reads / feature writes), `monorepo-architecture.md` (slices = Nx libs), `team-ownership.md`
  (Platform "Gatekeepers" own `shared/`+`app/`; Domain "Feature Factories" own slices; the
  Litmus Test + Multi-Tenant Rule).
- ✅ **Enforcement (Steiger-first):** the official FSD linter (`ci/steiger.config.ts`) + a rewritten
  `.dependency-cruiser.cjs` (layer direction, same-layer ban, public-API barrier) +
  `eslint-fsd-boundaries.cjs` + a write-time deep-import block in the hook + a CI Steiger step.
- ✅ **Agents/commands/skills** all speak FSD; `scaffold-service` now splits into entity-read and
  feature-write sides; `migrate-to-kit` follows FSD's incremental "divide by pages first" path.

## ▶ Phase 5 — Breadth (more stacks, more roles)

- ✅ **The reusable pattern** is extracted → `KIT-PATTERN.md` (the two-tier blueprint + what's shared
  vs. forks per kit). A sibling kit can now be spun up consistently when needed.
- ◻ **Sibling kits** (backend/API, React Native/Expo) — *not yet built; each is ~the size of the
  bedrock kit.* Build on demand off `KIT-PATTERN.md`, add to the marketplace + Tech Radar.
- ◻ **Role agents** (`perf-auditor`, deeper `security-reviewer`, `release-manager`) — add when the
  work recurs, not speculatively.
- ◻ **Telemetry** — usage signal (the audit hook is a start) to prune what isn't used; the kit
  should shrink as much as grow.

---

## Known follow-ups (small, do anytime)

- CI workflow + dependency-cruiser globs are **illustrative** — set to each repo's real scripts/layout on adoption.
- The PreToolUse/audit hooks need `jq` installed to enforce (they degrade to no-op without it); CI catches violations regardless.
- `marketplace.json` uses a placeholder `<kits-repo>` homepage — set the real git URL when the repo is stood up.

## How to extend (so the kit keeps its shape)

- New guidance → a new `rules/<name>.md` + a routing row in `CLAUDE.md` + an index row in `rules/README.md`. **Never grow `CLAUDE.md`.**
- New repeatable action → a `skills/<name>/` (auto-namespaced `/bedrock:<name>`).
- New role → an `agents/<name>.md`.
- Per-project facts/deviations → `project-specifics.md` + an ADR. **Never edit the universal constitution per project.**
- Improve the standard → edit the **vault master**, bump the plugin `version`, projects adopt via `/plugin update` or `/sync-kit`.
