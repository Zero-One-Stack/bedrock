# Rule: Styling engine (the project's choice)

> **Engine-agnostic.** This kit no longer mandates a single styling engine. CSS Modules,
> Tailwind, Chakra v3, vanilla-extract, Panda CSS, Stitches, StyleX, Emotion, styled-components,
> Mantine — any modern engine is allowed. The repo picks ONE on day one and records it in
> `project-specifics.md`. What the kit cares about is **architecture, accessibility,
> responsive behavior, theming durability, and a11y compliance** — outcomes that every
> reasonable engine can produce. The legacy ban on Tailwind/Chakra/CSS-in-JS is gone.

## Why this rule exists (and why we changed)

Earlier versions of this kit banned Tailwind, Chakra, and runtime CSS-in-JS in favor of CSS
Modules + tokens. That choice solved real problems (token discipline, no runtime cost, theming
durability) but it also locked projects out of their team's existing skill set and the wider
React ecosystem. The kit's real value is the **architecture** (FSD, data contract, a11y,
testing, observability, monorepo, governance) — not which engine emits the class strings.

So: **the engine is a project decision, not a kit decision.** The kit ensures the architecture
around the engine stays consistent.

## Pick one — and commit to it

- Decide engine **before** the first component lands.
- Record the choice in `rules/project-specifics.md` under "Stack" — engine name, major
  version, and the per-engine convention notes below.
- Don't mix engines in the same repo without a documented migration plan (see "Migrations").
  Multi-engine codebases double the maintenance, fight over global styles, and bloat the
  bundle.

## What the kit still asks (regardless of engine)

These survive the pivot — they're architecture, not styling:

- **FSD placement** (`feature-sliced-design.md`, `component-structure.md`). A button lives in
  `shared/ui/`, a domain card in `entities/<x>/ui/`, an action UI in `features/<x>/ui/` — no
  matter how it's styled.
- **Component composition** (`component-composition.md`). Compound components, `asChild`/Slot
  polymorphism, headless behavior library — these are React patterns, not engine patterns.
- **Accessibility (`accessibility.md`)** — WCAG 2.2 AA: semantic HTML, keyboard, focus,
  contrast (≥4.5:1 body, ≥3:1 large text and non-text), touch targets ≥44px, reduced motion,
  `forced-colors` support. Every engine can produce accessible output; the kit fails the
  change when the output isn't.
- **Responsive behavior (`responsive-design.md`)** — mobile-first, container queries where
  appropriate, no overflow at 320px. Engines name the breakpoints differently; the *behavior*
  is invariant.
- **Theming & dark mode** — light/dark/forced-colors must all work; theme swap is via a
  single mechanism the engine supports (CSS custom properties, the engine's theme provider,
  data-attribute selectors, etc.).
- **Performance (`performance.md`)** — no runtime CSS-in-JS that ships unused style work to
  client; no Tailwind config that grows the bundle past the budget; no global resets that
  bleed. The engine's idiomatic build (purging, atomic class generation, RSC-safe styling)
  is required.
- **i18n + RTL (`i18n.md`, `responsive-design.md`)** — logical properties or the engine's
  RTL-aware utilities; never hardcoded `margin-left`/`right` semantics.

## What you do per-engine (the conventions to record in `project-specifics.md`)

For whichever engine you pick, record these answers once so future authors stay consistent:

| Question | Why it matters |
| --- | --- |
| **Class authoring location** — inline (Tailwind), CSS Module file, theme tokens (Chakra), tagged template, runtime fn | Reviewer reading a component knows where the styles live. |
| **Token source of truth** — Tailwind `theme.extend`, Chakra `defineTokens`, DTCG JSON → vars, vanilla-extract `createTheme`, Panda `defineConfig` tokens | Tokens drive theming + dark mode + a11y contrast; if there isn't one, you'll grow drift. The kit RECOMMENDS a single source of truth that maps to whatever the engine consumes (CSS custom properties under the hood for most engines). See `styling-and-tokens.md`. |
| **Dark-mode mechanism** — `data-theme` attribute, `class="dark"`, `prefers-color-scheme` media query, Chakra `colorMode`, etc. | Every engine has one canonical way; the project picks it once and components don't reinvent. |
| **State styles** — Tailwind `hover:`/`active:`/`disabled:`, CSS `:hover`/`:active`, Chakra `_hover` | The patterns differ; the outcomes (visible focus, hover affordance, disabled state) don't. |
| **Variant API** — Tailwind variants helper, CVA, Chakra `defineRecipe`, vanilla-extract recipes | Standardize so you don't get three flavors of "size/intent/tone" props. See `component-composition.md`. |
| **Responsive prefixes** — Tailwind `md:`/`lg:`, Chakra arrays/object syntax, CSS Modules `@media` from token | Document the team's prefix-or-syntax convention. |
| **Global-style scope** — Tailwind `@layer base`, Chakra `Global` component, CSS Module global file | One place, not scattered. |
| **CSS reset** — Tailwind preflight, Chakra reset, Eric Meyer reset, modern-normalize, custom | Document so dark-mode/RTL/forced-colors tests stay stable. |

## Engine-specific notes (illustrative, not exhaustive)

### CSS Modules + design tokens (the kit's original default — still recommended for max control)

Token build (Style Dictionary / Terrazzo) → CSS custom properties. Components use
`var(--…)`. `styling-and-tokens.md` documents the 3-tier DTCG pattern in full. State
siblings (`-hover`/`-pressed`/`-disabled`) live in the token source. Best for: teams that want
total control of the cascade, projects with multi-brand theming, mature design systems.

### Tailwind CSS

Tailwind's `theme.extend` IS the token system; `tailwind.config.{ts,js}` reads from a typed
token source (recommended: the same DTCG output, mapped to Tailwind's expected shape — see
`token-style-dictionary-tailwind` or hand-author the bridge). Components use utility classes
on JSX. Dark mode via the `dark:` variant + `data-theme` or `class` strategy. State styles
via `hover:`/`focus-visible:`/`disabled:` utilities. Don't shove component-level CSS into a
parallel `.module.css` "for tricky cases" — pick one engine and stay there.

### Chakra v3

Chakra v3's recipe + token system is its native expression of the same 3-tier DTCG idea.
Tokens live in `defineTokens`/`defineSemanticTokens`. State styles via the `_hover`/`_active`/
`_disabled` props or `defineRecipe` variants. The Chakra `Provider` IS the theme bootstrap.
The headless library you use under `component-composition.md` is still your call (Chakra v3
ships its own composition primitives; if you adopt them, log them as the chosen headless
layer in `tech-radar.md`).

### vanilla-extract / Panda CSS / StyleX (build-time CSS-in-JS)

Zero-runtime; theme contracts via `createTheme`/`defineConfig` tokens. State styles via
the engine's recipe/variant helpers. Bundle behavior is closer to CSS Modules than to
runtime CSS-in-JS, so the kit doesn't single these out.

### Runtime CSS-in-JS (Emotion, styled-components)

Allowed, but consider the **performance hit** of runtime style work on RSC + hydration, and
the `'use client'` requirement that may push interactive boundaries up the tree. If the team
picks one, set a bundle budget per `performance.md` and verify SSR streaming is happy.

## Tokens are still recommended (just not mandatory)

`styling-and-tokens.md` is now framed as a **recommended pattern** for projects that want
theming durability, multi-brand support, contrast consistency, and a single source of truth
for design values. Every engine above can consume DTCG tokens (or its own token format that
maps to them). The required-semantic-groups list there (color narrative + interactive + state,
motion, elevation, z-index, opacity, breakpoints) is recommended for any token-using project
regardless of engine.

If the repo opts OUT of tokens (small project, prototype, single brand, all-defaults), that's
a logged decision in `project-specifics.md`. The kit's a11y/responsive/performance rules
still apply.

## Migrations

Engine swap (Tailwind → Chakra, CSS Modules → Tailwind, etc.) needs a written plan in
`project-specifics.md`:

1. Source engine and target engine; reason for the switch (radar driver, perf, team skills).
2. Dated, time-boxed waiver (per `governance.md`) allowing both engines to co-exist during
   the migration window.
3. Migration order (which slices first; typically shared/ui → entities → features → widgets →
   pages).
4. Token contract continuity: same token NAMES exposed in both engines during the window so
   components don't need source changes when their styling moves.
5. Cut-over date: when the migration must complete and the source engine is removed.

## Hard rules (engine-agnostic, what survives the pivot)

- ❌ Mixing two styling engines in steady state. (Migration waivers allowed, time-boxed.)
- ❌ Engine choice not recorded in `project-specifics.md`.
- ❌ A choice that breaks accessibility (`accessibility.md`), responsive behavior
  (`responsive-design.md`), theming durability (no dark-mode mechanism), or the performance
  budget (`performance.md`).
- ❌ Components hand-rolling state styles (`:hover`/`:active`/`:disabled`) instead of using
  the engine's idiomatic state mechanism when one exists.
- ❌ Engine-specific code leaking into FSD placements that should be engine-neutral
  (e.g. a Tailwind class string in a `.tsx` that an entity exposes as part of its public API
  should not constrain consumers from a different engine — keep engine-specifics inside
  the slice).
- ✅ One engine per repo (or a logged migration); engine choice in `project-specifics.md`;
  tokens recommended; a11y + responsive + performance + theming outcomes verified per the
  rules that own those concerns.

## Checklist — engine choice is "complete" when

- [ ] `project-specifics.md` has the engine name, version, and the per-engine convention
      answers (class location, token source, dark-mode mechanism, state styles, variant API,
      responsive syntax, global-style scope, CSS reset).
- [ ] If using tokens: the chosen engine maps to the project's token source (DTCG or
      engine-native); the required semantic groups from `styling-and-tokens.md` are present.
- [ ] Dark mode works at the root; forced-colors mode works; RTL works via the engine's
      logical-property mechanism.
- [ ] Bundle budget (`performance.md`) is met; CSS reset is documented; no engine mixing
      outside a logged migration.
- [ ] Accessibility (`accessibility.md`) AA passes regardless of how the styles are authored.

## Sources
- [DTCG (W3C Design Tokens) — stable spec](https://www.designtokens.org/)
- [Tailwind CSS — theming and dark mode](https://tailwindcss.com/docs/theme)
- [Chakra v3 — tokens & recipes](https://www.chakra-ui.com/docs/theming/overview)
- [vanilla-extract — themes](https://vanilla-extract.style/documentation/theming/)
- [Panda CSS](https://panda-css.com/)
- [WCAG 2.2 AA — Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
