# Rule: Styling & Design Tokens

> **Non-negotiable.** No CSS framework, no Chakra, no utility-class libraries, no runtime
> CSS-in-JS. Styling is **CSS Modules** consuming **design tokens** exposed as CSS custom
> properties, authored as a **DTCG-aligned, three-tier** source of truth.

> ⚠️ **Token names in this file are illustrative — they are NOT guaranteed to exist in your
> repo.** `--color-border-strong`, `--space-stack-xs`, `--text-label-md`, etc. demonstrate the
> *naming shape*, not a real token set. **Before styling, enumerate the repo's actual tokens**
> (Step 0 Recon: read `tokens/` and/or the generated `tokens.css`) and use only those names.
> Referencing a `var(--…)` you haven't confirmed = a silently-broken style. Missing token →
> add it with `/add-design-token` first, then reference the real `var(--…)`.

## Why this, specifically

- **CSS Modules** give scoping, pseudo-states, and media queries that inline styles can't,
  with zero runtime cost.
- **A typed/standard token source** gives one place to rebrand and theme, plus design↔code
  portability. We align to the **W3C Design Tokens Community Group (DTCG)** format, which
  reached its first stable version (2025.10). Building on DTCG avoids vendor lock-in and lets
  one source generate platform output via tools like **Style Dictionary** / Terrazzo.

## Three-tier token architecture (mandatory)

Each tier adds context to the one below. **Components reference semantic or component tokens —
never primitives directly.**

1. **Primitive (global)** — raw, context-agnostic values. `blue-500`, `space-4`, `font-size-3`.
   Never used directly in a component.
2. **Semantic (alias)** — intent, pointing at a primitive. `color-bg-interactive`,
   `color-text-muted`, `space-inset-md`, `radius-control`. **This is what components use by default.**
3. **Component** — optional overrides scoped to a component, pointing at semantic tokens.
   `button-bg-primary`, `input-border-invalid`. Add only when a component needs to diverge.

```
tokens/
├── primitive/        # tier 1 — raw scales (DTCG JSON or typed TS)
│   ├── color.json
│   ├── dimension.json      # spacing, sizing
│   ├── typography.json
│   ├── radius.json
│   ├── shadow.json
│   ├── breakpoint.json     # --bp-sm/md/lg/xl/2xl — shared by responsive-design.md
│   └── duration.json
├── semantic/         # tier 2 — intent aliases referencing primitives
│   ├── color.json          # color-bg-*, color-text-*, color-border-*, color-feedback-*
│   ├── space.json          # space-inset-*, space-stack-*
│   └── …
├── component/        # tier 3 — per-component overrides (optional)
│   └── button.json
├── themes/           # light.json, dark.json, brand-x.json (override semantic tier)
├── config.ts         # Style Dictionary (or Terrazzo) config
└── build output → src/styles/tokens.css  (generated :root vars; do NOT hand-edit)
```

### DTCG token shape (authoring)

Tokens use `$value` / `$type`, and **reference other tokens** with `{group.token}` aliases.

```jsonc
// tokens/primitive/color.json
{ "color": {
  "blue":  { "500": { "$value": "#2f6bff", "$type": "color" } },
  "red":   { "500": { "$value": "#d32f2f", "$type": "color" },
             "100": { "$value": "#fdecea", "$type": "color" } },
  "grey":  { "100": { "$value": "#f2f2f2", "$type": "color" },
             "400": { "$value": "#cccccc", "$type": "color" },
             "700": { "$value": "#666666", "$type": "color" } },
  "black": { "$value": "#1a1a1a", "$type": "color" },
  "white": { "$value": "#ffffff", "$type": "color" }
}}

// tokens/semantic/color.json  — intent, references primitives
{ "color": {
  "text":     { "default": { "$value": "{color.black}",   "$type": "color" },
                "muted":   { "$value": "{color.grey.700}","$type": "color" } },
  "bg":       { "surface": { "$value": "{color.white}",   "$type": "color" } },
  "border":   { "default": { "$value": "{color.grey.400}","$type": "color" } },
  "feedback": { "danger":      { "$value": "{color.red.500}", "$type": "color" },
                "danger-subtle":{ "$value": "{color.red.100}","$type": "color" } }
}}
```

> A typed-TS-first source is also acceptable **as long as it is DTCG-importable/exportable**
> and feeds the same generator. Whatever the authoring format, the **single source of truth**
> rule and the three tiers are non-negotiable.

### Generation → CSS custom properties

A build step (Style Dictionary / Terrazzo, run via a package script) flattens tokens into
`:root` CSS variables. Naming: `--<tier-path-kebab>`. The generated stylesheet is imported
once in the root layout. **Themes** are emitted as selector overrides of the *semantic* tier.

```css
/* generated: src/styles/tokens.css — DO NOT EDIT */
:root {
  /* primitives (rarely referenced directly) */
  --color-blue-500: #2f6bff;
  --color-grey-400: #cccccc;
  /* semantic (what components use) */
  --color-text-default: var(--color-black);
  --color-text-muted: var(--color-grey-700);
  --color-bg-surface: var(--color-white);
  --color-border-default: var(--color-grey-400);
  --color-feedback-danger: var(--color-red-500);
  --space-inset-md: 1rem;
  --radius-control: 0.375rem;
}
[data-theme='dark'] {
  --color-bg-surface: var(--color-grey-900);
  --color-text-default: var(--color-white);
}
```

## Consuming tokens

### In CSS Modules (default)

```css
.card {
  background: var(--color-bg-surface);
  color: var(--color-text-default);
  padding: var(--space-inset-md);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-control);
}
.card:hover { border-color: var(--color-border-strong); }
```

### Dynamic, runtime values (rare)

Set a CSS variable from a token reference; never inject a raw literal.

```ts
const style = { ['--accent' as string]: 'var(--color-feedback-danger)' };
```

## Hard rules

- ❌ **No literal design values** (`#hex`, `rgb()`, named colors, raw `px`/`rem`, shadows) in
  component CSS or TSX. Always `var(--…)`.
- ❌ **Components referencing primitive tokens directly.** Use semantic (or component) tokens.
  Primitives exist to feed semantics.
- ❌ **Referencing a token you haven't confirmed exists** in the repo's `tokens/` or generated
  `tokens.css`. Don't copy a `var(--…)` name from these examples — verify, or add it first.
- ❌ **Hand-editing generated CSS.** Change the token source and regenerate.
- ❌ **No CSS framework, Chakra `sx`, styled-components, or emotion runtime.**
- ✅ **One source of truth**, three tiers, DTCG-aligned, theme = semantic overrides under a selector.
- ✅ Add a token before using a new value (`/add-design-token`), then reference the `var(--…)`.

## Adding a token

Use `/add-design-token`: it picks the right tier (primitive vs semantic vs component), adds a
DTCG entry with proper `{alias}` references, regenerates the CSS vars, and returns the
`var(--…)` name. Never hand-edit generated output.

## Sources
- [DTCG spec reaches first stable version (W3C, 2025-10)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Design Tokens Community Group](https://www.designtokens.org/)
- [The developer's guide to design tokens and CSS variables (Penpot)](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
