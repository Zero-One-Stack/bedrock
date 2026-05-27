# Rule: Compliance (accessibility law, SOC 2, supply chain)

> **Non-negotiable (enterprise overlay).** For client/enterprise work, accessibility is a **legal
> requirement**, not a nicety, and the org must be able to **evidence** its controls. Target
> **WCAG 2.1 AA** as the universal technical floor and let the audit trails from `governance.md`
> serve as compliance evidence.

## Accessibility — the legal floor (build-breaking)

The base kit ships **WCAG 2.2 AA** (`accessibility.md`); **2.1 AA is the legal minimum** across the
jurisdictions a Toronto consultancy ships into — meeting 2.2 satisfies 2.1. What the enterprise
overlay adds is **legal teeth + evidence**:

| Jurisdiction | Law | Technical standard | Note |
| --- | --- | --- | --- |
| EU | European Accessibility Act (EAA) | EN 301 549 → WCAG 2.1 AA | Enforceable **2025-06-28**; fines; **accessibility statement required**. |
| US | ADA | WCAG 2.1 AA (de facto, DOJ/courts) | No codified standard, but the benchmark in settlements. |
| Canada | AODA | WCAG 2.0 AA (many target 2.1) | Relevant to ON-based work. |
| US (gov) | Section 508 | WCAG 2.1 AA | For public-sector clients. |

**Requirements this adds:**
- **a11y is a CI fitness function** pegged at WCAG 2.1 AA (axe via `@axe-core/playwright`, or
  Lighthouse CI threshold) — a regression fails the build (`ci/`).
- Ship an **accessibility statement** (template-able) for EAA-scope products: known issues + a
  feedback mechanism.
- Manual checks for what automation can't catch (keyboard journeys, focus order, screen-reader
  labels) on critical flows — fold into the E2E layer where feasible.

## SOC 2 — evidence, not extra work

SOC 2 doesn't prescribe frontend specifics; it wants **evidence of controls**. The kit produces it
as a by-product:
- **Change management** → PRs + the CI gate (`ci.md`).
- **Decision records** → immutable ADRs (`adr.md`).
- **Access control** → managed permission rules (`governance.md`, `managed-settings.json`).
- **Audit log** → the PostToolUse agent-action log + OPA decision logs (`governance.md`).

Keep these artifacts; they *are* the audit package. Don't build a parallel compliance process.

## Supply chain — SBOM & dependency governance

- Generate a **CycloneDX SBOM** per build, archived as a release artifact (`ci/`); expected under
  the EU **Cyber Resilience Act** and US **EO 14028**.
- `pnpm audit` blocks high-severity advisories; a **new/unapproved dependency** is gated (vet per
  `security.md`: maintained, needed, legit, not a typosquat; reviewed major-bump changes).
- License posture: if a client requires license compliance, add an SPDX SBOM alongside CycloneDX.

## Data protection

- No PII/secrets in logs, analytics, error reports, or agent prompts (`security.md`,
  `observability.md`). For health/financial clients, confirm the project's regime (HIPAA, PCI, PIPEDA)
  in `project-specifics.md` and treat it as a Tier-0 constraint for that project.

## Hard rules

- ❌ Shipping below **WCAG 2.1 AA**; no a11y CI gate; EAA-scope product with no accessibility statement.
- ❌ A release with no SBOM; merging a high-severity advisory or an un-vetted dependency.
- ❌ Treating compliance as a separate phase instead of evidence produced by the normal gates.
- ✅ a11y as a build-breaker at 2.1 AA; SBOM per build; audit trails retained as SOC 2 evidence;
  client regime recorded as a Tier-0 project constraint.

## Sources
- [European Accessibility Act — European Commission](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en)
- [EAA vs ADA and AODA / WCAG 2.1 — getWCAG](https://getwcag.com/en/blog/eaa-vs-ada-and-aoda-understanding-accessibility-laws-and-wcag-21-compliance)
- [CycloneDX](https://cyclonedx.org/) · [SBOMs in the era of the CRA — OpenSSF](https://openssf.org/blog/2025/10/22/sboms-in-the-era-of-the-cra-toward-a-unified-and-actionable-framework/)
- [Enterprise AI governance & SOC 2 evidence — Sprinto](https://sprinto.com/blog/enterprise-ai-governance/)
