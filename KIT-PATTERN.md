# Kit Pattern — how to spin up a new Zero One Stack kit

This is the **reusable blueprint** behind `bedrock` (a single kit whose constitution and
enterprise-governance *layer* ship together). Any new kit — a backend/API kit, a mobile (React
Native/Expo) kit, a data/ML kit — is built off this same shape so the *structure* and *governance
model* are identical across stacks, even though the *content* differs. Don't reinvent the
architecture per kit; reinvent only the rules. ("Overlay" below = the governance *layer* of a kit,
not a separate folder.)

## The invariants (every kit has these)

1. **A thin constitution** — `CLAUDE.md`: hard bans + a routing table only. Never grows; depth
   lives in `rules/`.
2. **A Step 0 Recon gate** — read the real repo (scripts, aliases, conventions) before generating;
   everything in docs is illustrative until confirmed.
3. **Two-tier memory** — universal constitution (synced) + `rules/project-specifics.md` (the
   project's living, mutable memory, written by agents, never synced over).
4. **A rules/ library** — one concern per file; each: non-negotiable banner · why · rule + templates
   · ❌/✅ hard rules · checklist · Sources. Indexed in `rules/README.md` + `CLAUDE.md` routing.
5. **A plan→build→verify→review agent loop** — an architect (plan), a builder, a `verify-*` skill
   (compiles/passes), a reviewer (checks + runs verify).
6. **Plugin packaging** — `skills/agents/commands/hooks` at the plugin root (auto-loaded, namespaced),
   `CLAUDE.md`+`rules/` as payload an `*-init` skill copies into the project.

## The enterprise overlay invariants (when a kit needs governance)

7. **Tiered governance** — locked org floor (managed-settings + hooks + CI gates) · delegated
   constitution · project memory. Deviate only via dated, **expiring** waivers (ADR + project-specifics).
8. **Durable decision memory** — immutable, append-only **ADRs** (`docs/adr/`, MADR) + a rollup index;
   an org-level **Tech Radar** above them.
9. **Enforcement, not docs** — deterministic hooks (block/audit/inject) + CI **fitness functions**
   (the rules as build-breaking tests) + policy-as-code waivers.
10. **Compliance as evidence** — the audit log + ADRs + CI gates *are* the SOC 2 / accessibility-law
    evidence; produced by normal work.

## To create a new kit (e.g. `node-api`, `react-native`)

1. **Copy the skeleton, not the content.** New dir `Claude-Kits/<kit>/` with the invariant structure
   (`CLAUDE.md`, `rules/README.md`, `agents/`, `skills/`, `commands/`, `.claude-plugin/plugin.json`).
2. **Rewrite the hard bans + rules** for the stack. The *categories* often carry over (structure,
   testing [unit+E2E], security, observability, CI, performance, i18n where relevant); the *content*
   is stack-specific (e.g. a Node API kit: layered architecture, no business logic in controllers,
   contract tests, OpenAPI as source of truth, structured logging, rate limiting).
3. **Keep the agent loop**: a `<stack>-architect`, a builder, `verify-build`, a reviewer.
4. **Reuse the overlay wholesale where generic** — governance, ADRs, tech-radar, policy-as-code,
   managed-settings, the audit/session hooks are largely stack-agnostic. Fork only the stack-specific
   gates (the API kit's fitness functions test API contracts; mobile tests bundle size + native perf).
5. **Add it to the marketplace** — a new entry in `Claude-Kits/.claude-plugin/marketplace.json`
   (`source: ./<kit>`), and to the Tech Radar.
6. **Add it to `ROADMAP.md`.**

## What stays shared vs. forks per kit

| Shared (lift once, reuse) | Forks per kit (stack-specific) |
| --- | --- |
| Governance model, waivers, managed-settings | The hard bans + rule *content* |
| ADRs, Tech Radar, audit/session hooks | The architect's domain decomposition |
| The two-tier memory + Recon gate + plugin packaging pattern | The scaffolding skills (what "a component"/"a service"/"an endpoint" is) |
| Compliance-as-evidence, SBOM | The fitness functions (what's measured) |

## Role agents (add when a kit needs them)

Beyond architect/builder/reviewer, a kit may add focused roles: `perf-auditor`, `security-reviewer`
(deeper than the rule), `release-manager`, `adr-author` (already in the overlay). Add a role only
when the work recurs and benefits from isolated context — not speculatively.

## Telemetry (prune what isn't used)

Track which skills/agents actually get invoked (the overlay's audit hook is a starting signal). A
kit should **shrink as much as grow** — retire rules/skills that don't earn their context cost. Review
alongside the Tech Radar cadence.
