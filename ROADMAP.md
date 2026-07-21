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

## ◐ Phase 2 — Make it real on actual projects (IN PROGRESS — pilot audited 2026-07-21)

The kit is built; now prove it on the portfolio.
1. ◐ **Stand up the kits repo + marketplace.** *Repo published at `Zero-One-Stack/bedrock`.*
   Remaining: pin versions in `marketplace.json` per release. *(Unblocks one-command install.)*
2. ◐ **Onboard one pilot project end-to-end — verx.** Constitution + 34 rules installed
   (coexisting with verx's own Orchestrator, no collisions), 8 real ADRs incl.
   `0002-adopt-bedrock-kit`, v3.1 cadence runner installed, Recon cache now filled with
   verified facts. **Not yet green** — see the finding below.
3. ◻ **Deploy `managed-settings.json` to your machine(s)** via the OS path; tune the deny/ask
   lists to your real tools before locking. *(Activates the Tier-0 floor.)*
4. ✅ **Backfill ADRs** — verx has 8. *(Hygiene: two duplicate template files, mixed 3-/4-digit
   numbering.)*

### The pilot's headline finding — "configured but inert"

**verx has bedrock's FSD configs but no FSD structure, and no FSD enforcement actually runs.**
`steiger.config.ts` and `.dependency-cruiser.cjs` are present, but neither package is
installed, both CI steps are commented out, and `eslint-plugin-bedrock` was never added to
`eslint.config.mjs`. Meanwhile `src/` is `components/ hooks/ lib/ contexts/` — essence-named
folders the constitution names as a hard ban. There are no `entities/features/widgets/shared/`
layers at all.

This is the single most useful thing the pilot has surfaced, and it generalizes:

- **Installing the kit ≠ enforcing the kit.** Every FSD claim in the repo was decorative. A
  user would reasonably believe they were covered. This is precisely the failure mode
  `/bedrock:doctor` (v3.1) was built for — and running its checks against verx caught all of
  it, so the skill is validated against a real repo.
- **The kit had no adoption-order guidance.** Turning Steiger on in verx today would fail the
  build on nearly every file. The right order is **migrate → then enforce**, but nothing in
  the docs said so; `enterprise-init` happily drops configs into a repo that can't satisfy
  them. → **Action: `migrate-to-kit` and `enterprise-init` must state the ordering and warn
  when FSD configs are installed into a non-FSD tree.**
- **`kit-init` doesn't install the enforcement layer.** The ESLint recipe and the FSD linters
  are opt-in via `enterprise-init`, which a repo can skip while still looking "kitted".

**Also found in verx:** no E2E harness and no axe dependency — so the "both test layers" and
a11y hard bans are currently unsatisfiable there; and no `import/no-cycle`/`madge`, so
`/verify-build`'s cycle gate has nothing to run.

**Done when:** one project runs the full Plan→Build→Verify→Review loop with hooks live and a
green enterprise CI gate, and you've felt where the docs need tightening.
*(Next concrete step: run `/bedrock-ship` on a small real verx change to exercise the runner
end-to-end, then start the FSD migration behind it.)*

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

## ✅ Phase 6 — Audit pass (SHIPPED, 2026-05)

External-research-driven gap audit + implementation across HIGH/MEDIUM/LOW tiers (~30 commits,
all on `main`). Closed long-known gaps and added rules the kit had been gesturing at without
documenting.

- ✅ **Hook hardening (HIGH H1+H2+M2)** — server-only enforcement on entity reads, `'use server'`
  on Server Actions, `'use client'` blocked at page-top (root `app/**/page.tsx` + FSD page
  screens), `@x` blocked outside `entities/`. 28 black-box smoke tests covering edge cases
  (BOM, long header, partial Edits, flat + monorepo layouts, JSX route variants).
- ✅ **Next.js App Router primitives in FSD** (HIGH H3 — `nextjs-app-router-fsd.md`) — every
  routing primitive mapped to its FSD home (re-exportable vs static-analyzed; the
  `<route>/routing.ts` sub-barrel pattern; sitemap/robots/manifest as the app-layer carve-out;
  the Satori OG-image carve-out for inline styles).
- ✅ **Component composition + headless** (HIGH H4+H5 — `component-composition.md`) — namespace
  exports, `asChild` Slot polymorphism, the canonical Slot helper, one-headless-lib-per-repo
  policy with migration carve-out.
- ✅ **Required token tiers** (HIGH H6) — state siblings (`-hover`/`-pressed`/`-disabled`),
  motion duration+easing pair, elevation, z-index, opacity; `add-design-token` enforces the
  state-sibling rule with an interactive-vs-narrative boundary table.
- ✅ **Engine-agnostic styling pivot** — dropped the Tailwind/Chakra/CSS-in-JS bans. Styling
  engine is now project-level (`styling-engine.md`); the kit guides architecture, not the
  class-string emitter. Adversarial sweep removed the bans from CLAUDE.md hard-bans, policy
  rego, waivers, the radar, the agents, and the fitness functions.
- ✅ **Theming contract** (HIGH H7 — `theming.md`) — `data-theme`+`data-brand` on `<html>`,
  SSR-flash prevention (cookie + pre-paint script; `next-themes` Pattern B alternative),
  `forced-colors` Windows High Contrast with the transparent-outline focus-ring technique,
  RTL via logical properties, multi-brand keying with the brand-namespaced primitive escape
  hatch. Cross-checked against the actual Next.js 15 / Tailwind 4 / Chakra v3 / next-themes
  APIs (the first-draft examples had multiple incorrect claims; review caught them).
- ✅ **MEDIUM tier** (M1–M13) — Steiger rule ledger; variant API recipe; provider composition
  root with wrong-order failure mode table; atom/molecule/organism heuristics; 15-primitive
  form baseline; Storybook contract (CSF3+autodocs+play+theme matrix+a11y blocking+visual
  regression); `audit-design-system` skill; `shared/lib` grouping by purpose; `shared/config`
  Zod env split (server vs client + feature flags); feature-to-feature headless hook pattern;
  testing-per-FSD-layer table; RSC↔Client serialization rule (Zod-parsed POJOs only).
- ✅ **LOW tier** (L1–L13) — CSS `@layer` ordering; icon system; motion + `prefers-reduced-
  motion`; `*.behavior.ts` + `*.variants.ts` in the file set; per-slice OWNERS + README;
  slice extract/retire/graveyard playbook; i18n namespace per slice; telemetry per FSD layer;
  `export type` + `@deprecated` JSDoc; reserved slice names; density modifiers via
  `[data-density]` + `@container style()`; design-system MAJOR triggers in
  `contracts-and-versioning.md`; wizards-as-widgets (replaces the deprecated `processes/`).

## ✅ Phase 7 — Positioning (SHIPPED, 2026-05)

External landscape research surfaced five gaps. All addressed.

- ✅ **Adversarial framing** (#41) — `governance.md` now ships the **enforcement matrix**:
  every rule mapped to which layer catches it (hook / ESLint / Steiger+dep-cruiser+OPA /
  reviewer agent). Paired "honest limits" subsection naming six hook bypasses (pipe mode,
  MCP subagents, shell-issued writes, model rerouting, partial Edits, missing `jq`). Bare
  "Hook-blocked" tags across CLAUDE.md, feature-sliced-design.md, services-and-data.md,
  nextjs-app-router-fsd.md replaced with "layered enforcement — see the matrix" pointers.
- ✅ **AGENTS.md compat as baseline** (#37) — `agents-md-export` skill rewritten (the old
  version still banned Chakra), promoted from enterprise-only to baseline, runs
  automatically as part of `kit-init`. Generates `./AGENTS.md` at the project root so
  Cursor / GitHub Copilot / OpenAI Codex / Aider / Windsurf / Zed / Gemini CLI enforce the
  same constitution as Claude Code. Biggest single distribution unlock.
- ✅ **Bundled docs pattern** (#38) — Vercel's data: bundled `node_modules/next/dist/docs/`
  produced 100% eval pass vs 79% with on-demand retrieval. Shipped six curated reference
  snippets at `docs/external-references/` (Next.js 15 hot spots, React Query v5, RHF
  Controller, Zod v3/v4 differences, Storybook 9 setup, MSW 2.x). `kit-init` copies them
  into `.claude/docs/`; CLAUDE.md tells the agent to read locally before WebFetching.
- ✅ **eslint-plugin-bedrock** (#39) — `tools/eslint-plugin-bedrock/` with 5 rules nobody
  else has good matches for: `no-deep-slice-import`, `no-cross-feature-x-import`,
  `no-primitive-token-in-component`, `require-server-only-on-queries` (autofixable),
  `no-use-client-at-page-top`. All 5 ship with `node --test` test suites — green. Hybrid
  scope per design: small focused plugin + `eslint.config.js` recipes for everything else
  (eslint-plugin-boundaries / import / jsx-a11y / no-restricted-imports). Not yet on npm.
- ✅ **Working cadence** (#40) — `working-cadence.md`: four-phase rhythm
  (brainstorm → plan → execute → review) wired to the agents the kit already ships
  (`/architect`, scaffolders + `component-builder`, `/verify-build` + `frontend-reviewer`).
  Comparison table with superpowers / compound-engineering; when-to-skip table for trivial
  changes.

## ✅ Phase 7.5 — Orchestration + P0 repairs (SHIPPED, v3.1)

The kit documented a four-phase cadence but shipped **no mechanism to run it** — every arrow
was a manual re-prompt and the plan lived only in chat scrollback, so it drifted as the build
proceeded. An audit pass also found the flagship ESLint plugin broken as shipped.

- ✅ **`/bedrock-ship` — the cadence, executed** (`workflows/bedrock-ship.js`): recon → plan →
  build each unit bottom-up → verify → review → bounded auto-fix loop, all in one command.
  Recon facts and the ordered unit list are threaded into every subagent prompt (subagents
  don't inherit conversation context), so the plan can't decay between phases. Reports
  honestly when it exits still red.
  **Constraint discovered:** Claude Code loads dynamic workflows **only** from a project's
  `.claude/workflows/` or `~/.claude/workflows/` — *a plugin cannot ship one*. So `kit-init`
  copies the payload in, and `/bedrock:ship` provides an inline fallback (plus the
  `.claude/plans/<slug>.md` plan-file convention) where workflows are unavailable.
- ✅ **Stop hook makes `/verify-build` real** (`hooks/scripts/require-verify-build.sh`):
  reads the audit log the PostToolUse hook already wrote (nothing consumed it) and blocks
  the stop **once** if `src/`/`app/` changed with no verification run. Guards on
  `stop_hook_active`; no-ops without `jq`.
- ✅ **P0 — `eslint-plugin-bedrock` was broken as shipped.** `configs.recommended` had an
  empty `plugins: {}`, so every documented consumer setup threw *"Could not find plugin
  bedrock"*. Fixed via a factory that receives the built plugin (the object form couldn't
  reference it without an import cycle). All **6** suites were failing on undeclared
  devDeps — now green, with `.github/workflows/kit-ci.yml` running them plus a smoke test
  that asserts the recommended config resolves and fires. (Docs said 5 rules; there are 6.)
- ✅ **`ci/eslint.config.recommended.js`** — governance.md said "everything else composes
  from the ecosystem" with no artifact behind it. Now shipped: `jsx-a11y` +
  `typescript-eslint` + `import/no-cycle` + `@next/next` + `no-restricted-syntax` for
  `export *`, converting ~8 reviewer-only hard bans into deterministic gates. Wired into
  `enterprise-init`.
- ✅ **Honesty pass on false claims.** `/verify-build` never ran Steiger despite five files
  saying it did — added as step 3. Six rows of governance.md's enforcement matrix asserted
  CI/ESLint checks that don't exist — corrected, with a ◐ legend and the missing rows added.
  `migrate-to-kit`'s description still told Chakra users to migrate off, contradicting the
  engine-agnostic constitution. The last "Hook-blocked" survivor is gone.
- ✅ **`/bedrock:doctor`** — diagnoses silent non-enforcement (missing `jq`, unwired ESLint,
  absent Steiger config), the kit's most common failure mode. Reports ENFORCED / DEGRADED /
  MISSING per layer and names which bans currently rest on the reviewer alone.
- ✅ **`jq` warning in `session-context.sh`** — its absence silently voided all write-time
  enforcement; now surfaced at session start.

**Known limits (not overclaimed):** `/bedrock-ship` needs Claude Code ≥ 2.1.154 with dynamic
workflows enabled (paid plans); `eslint-plugin-bedrock` is still not on npm (install by path);
`audit-design-system --ci` is still not wired into the shipped CI workflow.

## ✅ Phase 7.6 — Design-system structure made deterministic (SHIPPED, v3.2)

The kit already described folder-per-component with a colocated test and story, but the atomic
grouping was written as **optional** and nothing mechanically enforced the folder shape — so a
repo could install the kit and still end up with flat files, stories beside them, and every
unit test in a distant `tests/` tree. Four changes close that.

- ✅ **Atomic grouping is now the DEFAULT, not a per-repo choice** (`component-structure.md`).
  `shared/ui/{atoms,molecules,organisms}/<component>/` is what an agent applies without asking.
  A flat layout is now an *Approved override* in `project-specifics.md` — and a repo that is
  flat today is a **migration target**, not a convention to match.
- ✅ **`rules/design-system-structure.md`** — the authoritative contract: the folder shape, what
  goes in each file, the barrel chain, the atomic-level decision table, the flat→folder ratchet,
  and hard rules.
- ✅ **`bedrock/component-folder-contract`** (7th ESLint rule) — flags a bare component file in
  `shared/ui`, a component folder missing its colocated `.test.tsx`/`.stories.tsx`, and
  non-kebab-case names. Subcomponents inside a folder are correctly exempt. Ships with
  on-disk fixtures because the sibling check reads the filesystem.
- ✅ **Scaffolder + audit updated** — `scaffold-component` emits the atomic path by default;
  `audit-design-system` now looks for **bare files** (a folder-only walk skipped exactly the
  non-conforming components) before auditing folder contents.

### The trap this surfaced — colocated tests that never run

Studying a real reference repo showed the failure mode that makes colocation worthless: its
`test:unit` script was glob-bound to `tests/unit/*.test.ts`, so a colocated
`button.test.tsx` **would never execute** while the suite still reported green. A test that
passes by not existing reads as coverage.

So the rule, the scaffolder, and the audit all now require verifying the **test-runner glob
covers the component tree** — and proving it by watching the new test appear in the runner's
output, not by trusting a green exit code.

## ▶ Phase 8 — Distribution & adoption (the next frontier)

The kit is now feature-complete vs. the audit; the next gap is **adoption**. Code quality
doesn't drive installs — distribution does. The strategy: position bedrock as **the
architecture/governance layer that wraps shadcn + vercel-labs/agent-skills**, not as their
competitor. (shadcn ships components; vercel-labs ships React perf + UX rules; bedrock
ships the FSD + tokens + theming + testing + governance architecture on top.)

### 8.1 — Public listings (~1 hour each, free, mandatory)

- ◻ **claudemarketplaces.com** — submit `Zero-One-Stack/bedrock` with the marketplace
  manifest. The largest Claude Code plugin directory at 2026 — adoption signal anchor.
- ◻ **aitmpl.com** — list as an "engineering constitution" template. Different audience
  from claudemarketplaces (template-discovery rather than plugin-install).
- ◻ **claudepluginhub.com** — submit. Smaller but growing.
- ◻ **rohitg00/awesome-claude-code-toolkit** — open a PR adding bedrock to the engineering
  kits section. The mega-curated list with ~1.9k stars; appearing here is a credibility
  marker.
- ◻ **agents.md/awesome** — submit bedrock as a comprehensive AGENTS.md example for
  React/Next.js, now that `kit-init` ships AGENTS.md by default.
- ◻ **PatrickJS/awesome-cursorrules** — open a PR pointing at bedrock's AGENTS.md export.
  Cursor users get to bedrock indirectly through this list.

### 8.2 — README hooks (do once; convert visitors to installers)

- ◻ **Compatibility statements at the top of README.md**: "Compatible with shadcn/ui,
  vercel-labs/agent-skills, Tailwind, Radix, Base UI, React Aria, Ariakit, Chakra v3" —
  explicitly position as the architecture wrapper, not the styling replacement.
- ◻ **"vs shadcn / vs vercel-labs/agent-skills" comparison table** — short, honest, one
  paragraph each. The audit doc covered this; promote it to the README.
- ◻ **30-second pitch + GIF** at the top — what the kit does + one screenshot
  (`/audit-design-system` output is the most legible single-frame artifact).
- ◻ **Migration guide** for projects already on shadcn (which is ~most React/Next.js apps
  in 2026). The migrate-to-kit skill exists; surface it as a README-level path.
- ◻ **AGENTS.md badge** at the top showing cross-tool compatibility (Cursor / Copilot /
  Codex / Aider / Windsurf / Zed / Claude Code).

### 8.3 — npm publish (`eslint-plugin-bedrock`)

> **Unblocked as of v3.1.** The recommended config crashed on load and all six test suites
> were failing; publishing that would have burned the credibility Phase 8 exists to build.
> Both are fixed and now covered by `kit-ci.yml`. Safe to publish.

- ◻ **Reserve the `eslint-plugin-bedrock` package name** on npm (the current code lives in
  `bedrock/tools/eslint-plugin-bedrock/`; consumers install via `file:` or git URL today).
- ◻ **Publish v0.1.0** once the package name is reserved and a short README pass adds the
  "Why a plugin AND a hook?" framing from `governance.md`'s enforcement matrix.
- ◻ **Add the install instructions to the bedrock plugin's `kit-init`** so installing
  bedrock prompts to add `eslint-plugin-bedrock` to the project's devDeps + write the flat
  config.
- ◻ **Open a PR against eslint-plugin-boundaries' README** linking to bedrock as the
  recommended FSD-shaped composition. (One of the two real distribution surfaces for the
  ESLint-rule audience.)
- ◻ **Hand the plugin to two early-adopter projects** for feedback before declaring it 1.0.

### 8.4 — AGENTS.md ecosystem outreach

- ◻ **Reach out to the AGENTS.md core team** (`agents.md` / Agentic AI Foundation under
  Linux Foundation) with bedrock as a "comprehensive React/Next.js example" for the docs.
  They are actively curating examples; getting listed there is the AGENTS.md equivalent of
  a Hacker News front page.
- ◻ **Open issues on Cursor / Copilot / Codex docs** pointing at bedrock as a reference
  example for AGENTS.md adoption — low-effort but credibility-building.

### 8.5 — Soft outreach (do when there's signal)

- ◻ **Vercel community / Next.js Discord** — post an "engineering-constitution-for-Next.js"
  thread once the bundled docs have been verified against the latest Next.js minor.
- ◻ **Feature-Sliced Design Discord** — post bedrock as the "FSD + Next.js + AI codegen"
  reference kit. The FSD community is the most-aligned audience.
- ◻ **A short blog post + Hacker News** — frame the kit's distinguishing claim:
  *"Engineering constitution as a Claude Code plugin: layered enforcement (hook + ESLint +
  CI + reviewer), engine-agnostic, FSD-shaped."* Lead with the enforcement matrix —
  it's the kit's most novel asset and is harder to hand-wave than rules-as-docs.
- ◻ **Submit to Thoughtworks Tech Radar** for the "Architecture drift reduction with LLMs"
  technique (currently Assess at Apr 2026) — bedrock fits the "constitution + fitness
  functions" shape Thoughtworks endorses.

### 8.6 — Measure adoption (so growth ≠ guesswork)

- ◻ **GitHub stars + clones / week** baseline + monthly trend. Treat as a directional
  signal, not the goal.
- ◻ **Install signal from claudemarketplaces** (they publish install counts).
- ◻ **Issue/PR rate** — the right signal for "kit is being used in real projects." A repo
  with zero issues is either perfect or unused; in practice, the second.
- ◻ **Cite-counts on AGENTS.md examples** — if bedrock appears in others' kit READMEs as
  "the comprehensive React/Next.js example," that's the highest-quality adoption signal.

### What "done" looks like for Phase 8

A project starting fresh in 2026 finds bedrock through aitmpl / claudemarketplaces /
awesome-claude-code-toolkit, runs `/plugin install bedrock@zos`, gets `AGENTS.md` +
constitution + ESLint plugin + bundled docs in one step, and ships with the layered
enforcement working from day one. No fork. No reinventing the architecture/governance
layer. That's the bar; everything else is intermediate.

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
