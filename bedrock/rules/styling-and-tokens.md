# Rule: Design Tokens (recommended pattern for any engine)

> **Recommended, not mandated.** The kit no longer mandates a styling engine — see
> `styling-engine.md` for the project's engine choice. This file documents a **recommended
> design-token pattern** (DTCG-aligned, three-tier, generated to a single source the engine
> consumes) that holds up under theming, dark mode, multi-brand, and contrast/a11y demands
> *regardless of which engine the repo picked*. The examples below use CSS custom
> properties — that's the most portable target — but the same three tiers map cleanly to
> Tailwind `theme.extend`, Chakra `defineTokens`/`defineSemanticTokens`, vanilla-extract
> `createTheme`, Panda CSS `defineConfig`, etc.

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
│   ├── duration.json       # motion durations (raw ms scale)
│   ├── easing.json         # motion easing curves (cubic-bezier)
│   ├── elevation.json      # shadow stacks per elevation level
│   ├── z-index.json        # stacking-order scale
│   └── opacity.json
├── semantic/         # tier 2 — intent aliases referencing primitives (the REQUIRED GROUPS below)
│   ├── color.json          # color-bg-*, color-text-*, color-border-*, color-feedback-* (+ state)
│   ├── space.json          # space-inset-*, space-stack-*
│   ├── motion.json         # motion-duration-*, motion-easing-*
│   ├── elevation.json      # elevation-*
│   ├── z-index.json        # z-*
│   ├── opacity.json
│   └── density.json        # density-*  (optional — only if the system supports compact/comfortable)
├── component/        # tier 3 — per-component overrides (optional)
│   └── button.json
├── themes/           # light.json, dark.json, brand-x.json (override semantic tier)
├── config.ts         # Style Dictionary (or Terrazzo) config
└── build output → src/styles/tokens.css  (generated :root vars; do NOT hand-edit)
```

### Required semantic groups (the baseline every repo must ship)

These groups must exist in the semantic tier on day one. Components rely on their presence
(every hoverable atom expects `--color-bg-hover` to resolve to *something*); a missing group
turns into per-component literal fallbacks and contrast regressions across themes. The
required groups, the prefixes they own, and what they enable:

| Required group | Token prefix(es) | What breaks if missing |
| --- | --- | --- |
| **Color — narrative text/bg/border** | `color-text-{default,muted,subtle,inverse}`, `color-bg-{surface,muted,subtle,canvas,inverse}`, `color-border-{default,strong,subtle}` | Body copy / cards / page surfaces — purely presentational, NO interaction state. Components hand-pick colors → contrast fails AA on theme swap. |
| **Color — interactive surfaces** | `color-bg-{emphasis,interactive,subtle-interactive}` for buttons/inputs/links; `color-text-on-{emphasis,interactive}` for foreground on those surfaces; `color-border-interactive` for interactive borders (input, focus ring). | These ARE the interactive bases — state siblings below apply only to this group. |
| **Color — state (hover/pressed/disabled/selected)** | For every **interactive** token in the row above, a paired `*-hover`, `*-pressed`, `*-selected`, `*-disabled` (e.g. `color-bg-emphasis-hover`, `color-text-on-emphasis-disabled`, `color-border-interactive-hover`). **Not required for narrative-base tokens** — body text doesn't have a hover state. | Every button/input invents its own `:hover` color → AA contrast lottery, dark mode breaks per-component, focus rings flicker. |
| **Color — feedback** | `color-feedback-{info,success,warning,danger}` and `*-subtle` companions (the muted background variants) | Toast/banner/badge a11y states drift; alert UI lacks the subtle/strong pair. |
| **Spacing** | `space-inset-{xs,sm,md,lg,xl}`, `space-stack-{xs,sm,md,lg,xl}`, `space-inline-{xs,sm,md,lg,xl}` | Mixed scales per component; nothing connects to density. |
| **Sizing** | `size-control-{sm,md,lg}` (input/button heights), `size-icon-{xs,sm,md,lg}` | Touch targets fall below 44px (a11y violation, `accessibility.md`). |
| **Typography** | `text-{display,heading,body,label,caption}-{sm,md,lg}` (font shorthand or font-size + line-height + weight) | Vertical rhythm breaks; type scale fights the spacing scale. |
| **Radius** | `radius-{control,surface,pill,full}` | Every component picks a literal `border-radius` → brand inconsistency. |
| **Motion — duration** | `motion-duration-{fast,base,slow,slower}` (e.g. 120/200/320/500 ms). Skip the `instant`/0ms level — a 0ms transition is a code smell, and `prefers-reduced-motion` is handled by `@media` overrides, not by an instant alias. | Each animation hand-picks a duration → either jittery (too fast) or sluggish (too slow). |
| **Motion — easing** | `motion-easing-{standard,emphasized,decelerate,accelerate}` (cubic-beziers — see Material 3 / Carbon for proven curves) | Animations feel mechanical or inconsistent across components. |
| **Elevation** | `elevation-{0,1,2,3,4,5}` (shadow stacks). **`elevation-0` resolves to `none`** — a real token that explicitly clears any inherited box-shadow (so `box-shadow: var(--elevation-0)` produces a deterministic flat surface). | Modal/popover/toast stacking visual hierarchy collapses; dark-mode overlays can't be tuned centrally. |
| **z-index** | `z-{base,dropdown,sticky,overlay,modal,popover,toast,tooltip}` (small integer scale, NOT arbitrary numbers) | Stacking wars: dropdowns under modals, toasts behind overlays, etc. |
| **Opacity** | `opacity-{disabled,muted,overlay,backdrop}` | Disabled states diverge per component; backdrops have no shared dim level. |
| **Breakpoints** | `bp-{sm,md,lg,xl,2xl}` — same scale `responsive-design.md` uses. Skip `bp-xs` (the implicit mobile base IS the no-prefix default; an `xs` breakpoint adds ceremony with no real screen size below `sm` to target). | `responsive-design.md` can't share a scale across container queries and `@media`. |

> **Density tokens are optional.** Only required if the product ships a density mode (compact/
> comfortable/spacious) — then `density-{compact,comfortable,spacious}` keys flip the underlying
> spacing/sizing tokens. See `responsive-design.md` for the application pattern.

The `add-design-token` skill enforces the **state-token sibling rule** only on tokens in the
**interactive surfaces** group (`color-bg-emphasis`, `color-bg-interactive`,
`color-text-on-emphasis`, `color-border-interactive`, etc.). Adding one of those without the
full state set (`-hover`, `-pressed`, `-disabled`, and where applicable `-selected`) is
rejected. **Narrative tokens** (`color-text-default`, `color-bg-surface`,
`color-border-default`) ship without siblings — body copy doesn't hover.

### Interactive vs. narrative (the boundary the skill checks)

| Group | Sibling required? | Examples |
| --- | --- | --- |
| **Interactive** — surfaces that participate in hover/press/focus/disabled state. | ✅ Full state set | `color-bg-emphasis`, `color-bg-interactive`, `color-text-on-emphasis`, `color-text-on-interactive`, `color-border-interactive` |
| **Narrative** — purely presentational, no interaction state. | ❌ No siblings | `color-text-{default,muted,subtle,inverse}`, `color-bg-{surface,muted,subtle,canvas,inverse}`, `color-border-{default,strong,subtle}` |
| **Feedback** — the subtle/strong pair *is* the state model. | ❌ No siblings | `color-feedback-{info,success,warning,danger}`, `*-subtle` |
| **Decorative** — never consumed by an interactive component. | ❌ No siblings | `color-bg-decorative-*`, `color-text-brand-*` (when brand-only) |

The skill prompts "is this an interactive surface?" before allowing a skip; the answer and the
reason go into `project-specifics.md`.

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

### Satori carve-out: OG images, social images, icon files (Next.js `next/og`)

**`next/og`'s `ImageResponse` uses Satori**, which does not load CSS files at all (no
`.module.css`, no `tokens.css`, no `var(--…)` resolution). It understands only a subset of inline
`style={{}}` properties and (Tailwind via `tw=`, which the kit bans). So for the narrow set of
files that emit images via Satori — `app/<route>/opengraph-image.tsx`,
`app/<route>/twitter-image.tsx`, `app/<route>/icon.tsx`, `app/<route>/apple-icon.tsx`, and the
view components they delegate to (`<Route>OgImageView.tsx`, `<Route>IconView.tsx`) — the token
build must **also emit a typed JS source** the inline-`style` props can read:

```ts
// src/shared/tokens/og.ts — generated by the token build alongside tokens.css.
// Plain JS values (resolved primitives) because Satori cannot resolve var(--…).
export const tokens = {
  colorBgSurface: '#ffffff',
  colorTextDefault: '#1a1a1a',
  spaceInsetLg: 24,
  // …flattened semantic tokens used by OG/icon views only.
} as const;
```

Authoring rules for these files:

- ✅ Inline `style={{}}` props only, values pulled from `@/shared/tokens/og`.
- ❌ No `.module.css` imports, no `var(--…)` references, no `cx()`/className composition.
- ❌ The carve-out does **not** apply to any other file — every other component continues to use
  CSS Modules + `var(--…)`.

`nextjs-app-router-fsd.md` covers the placement (inline at root, view component in the page slice's
`ui/` segment, imported via the `routing.ts` barrel).

## CSS `@layer` ordering (CSS-based engines only)

When the project uses a CSS-emitting engine (CSS Modules, vanilla-extract, plain CSS) declare
the `@layer` order **once** in the global stylesheet so consumer overrides are predictable.
Without explicit ordering, "why is my component override losing to the reset" turns into a
specificity hunt every PR.

Recommended order (low specificity → high):

```css
/* src/app/styles/globals.css — or wherever the project's global stylesheet lives. */
@layer reset, tokens, base, components, utilities, overrides;

/* Then import in that order so each lands in the right layer: */
@import './reset.css'                  layer(reset);
@import '@/shared/tokens/tokens.css'   layer(tokens);
@import './base.css'                   layer(base);
/* Component CSS Modules emit into `components` automatically (their import order doesn't matter). */
```

| Layer | Holds |
| --- | --- |
| `reset`     | The CSS reset (modern-normalize, the engine's preflight, or a hand-rolled one). |
| `tokens`    | Generated `tokens.css` — primitive + semantic + component custom properties. |
| `base`      | Element-level defaults (`html { font-family: var(--text-body-md); }`); `:focus-visible` defaults. |
| `components`| Every CSS Module emitted from `shared/ui` / `entities/*/ui` / etc. |
| `utilities` | Single-purpose classes (`.sr-only`, `.visually-hidden`) — rare in this kit. |
| `overrides` | The escape hatch when a third-party widget needs to be re-skinned. Logged in `project-specifics.md`. |

Why this order: a reset shouldn't beat a component, a component shouldn't beat a deliberate
override, and tokens (custom properties) don't participate in specificity at all — they cascade
through whichever layer references them.

> **Tailwind:** uses `@layer base / components / utilities` natively — the kit's order is
> compatible (`reset` becomes `base` in Tailwind's vocabulary). **Chakra v3 / vanilla-extract /
> Panda / StyleX:** these engines emit their own ordering; the rule applies only to the global
> CSS the project hand-authors. **Runtime CSS-in-JS:** `@layer` is supported but adds a flush
> ordering concern; document the engine's `injectGlobal` API instead.

Rules:

- One `@layer` declaration in the global stylesheet — never per-file or per-component.
- Don't fight the cascade with `!important` to escape the wrong layer — move the rule to the
  right layer.
- A new layer (e.g. `print`, `theme`) requires a one-line update to the global declaration
  and a `project-specifics.md` note. Don't sprinkle layer declarations across files.

## Hard rules

> The rules below apply **when the repo has opted into tokens** (the recommended path). If the
> project chose an engine and configuration that doesn't use a shared token source, the
> a11y/responsive/performance/theming rules in their own files still apply — but the
> token-specific bans below are advisory.

- ❌ (if using tokens) **No literal design values** (`#hex`, `rgb()`, named colors, raw
  `px`/`rem`, shadows) in component code where a token applies. Use the token (`var(--…)`,
  Tailwind class, Chakra token reference — whatever the engine uses).
- ❌ (if using tokens) **Components referencing primitive tokens directly.** Use semantic (or
  component) tokens. Primitives exist to feed semantics.
- ❌ (if using tokens) **Referencing a token you haven't confirmed exists** in the repo's
  token source / generated output. Don't copy a name from these examples — verify, or add it
  first.
- ❌ (if using tokens) **Hand-editing generated CSS / generated theme output.** Change the
  token source and regenerate.
- ❌ **Missing required semantic group.** (Token-using projects only.) A repo without
  interactive-color state siblings
  (`-hover`/`-pressed`/`-disabled`), without a motion duration+easing pair, without an
  elevation scale, or without a named `z-{base,dropdown,sticky,overlay,modal,popover,toast,
  tooltip}` set is not ship-ready. Will become a `/verify-build` failure once the
  `audit-design-system` skill (runs the check in `--ci` mode).
- ❌ **Hand-picked `:hover`/`:active`/`:disabled` colors** on an interactive component. Use
  the `*-hover`/`*-pressed`/`*-disabled` token siblings. If a sibling is missing, add it via
  `/add-design-token` first.
- ❌ **Raw `z-index` literals** (`z-index: 999`) or arbitrary numbers in CSS / CSS Modules.
  Use the `--z-*` semantic scale. (Satori-rendered files — see the carve-out above — use
  plain JS numbers from `shared/tokens/og.ts` because Satori cannot resolve `var(--…)`.)
- ❌ **Raw `transition`/`animation` durations or easings** (`transition: 200ms ease-in-out`)
  in CSS. Use `--motion-duration-*` and `--motion-easing-*`. (Same Satori carve-out applies —
  but Satori doesn't animate at all, so the rule rarely fires there.)
- ❌ **Adding an interactive color token without its state siblings** —
  `/add-design-token` rejects the change. Narrative/feedback/decorative tokens ship without
  siblings; see the "Interactive vs. narrative" table.
- ✅ **One source of truth**, three tiers, DTCG-aligned, theme = semantic overrides under a selector.
- ✅ Add a token before using a new value (`/add-design-token`), then reference the `var(--…)`.
- ✅ Every required semantic group is present and themable; state siblings ship together;
  motion/elevation/z-index/opacity scales are named, not raw.

## Adding a token

Use `/add-design-token`: it picks the right tier (primitive vs semantic vs component), adds a
DTCG entry with proper `{alias}` references, regenerates the CSS vars, and returns the
`var(--…)` name. Never hand-edit generated output.

## Sources
- [DTCG spec reaches first stable version (W3C, 2025-10)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Design Tokens Community Group](https://www.designtokens.org/)
- [The developer's guide to design tokens and CSS variables (Penpot)](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
