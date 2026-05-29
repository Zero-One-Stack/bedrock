# Rule: Theming (dark mode, brand, forced-colors, RTL)

> **Non-negotiable (outcomes).** Every kit-compliant UI works in **light + dark**, in
> **`forced-colors` mode** (Windows High Contrast), in **LTR + RTL**, and across the
> project's **brands** (when multi-brand), with **no flash of wrong theme on SSR/hydration**.
> The *mechanism* by which a theme swaps is engine-specific (`styling-engine.md`); the
> *contract* below is the same for every engine. This rule defines the contract and shows
> the canonical mechanism for each supported engine.

## Why this exists

"Add dark mode later" is the dependency that wrecks a design system. Five separate ways to
flip a color, two places hover state lives, one engine that fights SSR, one missing
`forced-colors` story, and the team ships an inaccessible UI nobody notices until a Windows
High Contrast user opens it. Theming is **architecture**, not styling — it touches
hydration, providers, tokens, accessibility, and i18n. This rule pins the outcomes so the
engine choice (`styling-engine.md`) can satisfy them however it idiomatically does.

## The theming contract (engine-agnostic — every engine must satisfy these)

| Requirement | What "satisfied" looks like |
| --- | --- |
| **A single source of theme truth** | One attribute or class at `<html>` (the kit recommends `data-theme="<name>"` + optional `data-brand="<name>"`) — components never branch on a theme prop or check `window.matchMedia` directly. The engine reads this one source. |
| **Light + Dark coverage** | Every interactive component renders correctly in both. State siblings (`-hover`/`-pressed`/`-disabled`) are themed too, not just the base. Tested in Storybook with a theme matrix per atom. |
| **`prefers-color-scheme` + manual override** | Default to user preference; user override (toggle / settings) wins and persists across navs (cookie or localStorage). The override survives a hard refresh. |
| **No flash of wrong theme** | The `<html data-theme>` value is set **before first paint** by an inline `<script>` in `<head>`. React hydration matches the server-rendered theme. (See "SSR flash prevention" below.) |
| **`forced-colors` (Windows High Contrast)** | Components do not rely on color alone for meaning; focus rings, borders, and selected/disabled state survive when the system overrides colors. Use `@media (forced-colors: active)` to opt back into system colors (`Canvas`, `CanvasText`, `ButtonFace`, `Highlight`) where the design's own colors would be wiped. Every interactive atom ships a `forced-colors` story. |
| **RTL via logical properties** | All inline-direction spacing/positioning uses logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`, `text-align: start`). No physical `left`/`right`. The `<html dir>` attribute is what flips the layout — components don't branch on `dir`. (Detailed in `i18n.md`.) |
| **Multi-brand keying (when applicable)** | Brand swaps the **semantic** tier only — primitives (raw scales) are shared across brands; semantics + component overrides differ. `data-brand="<name>"` is the seam; combinations of `data-theme` + `data-brand` work without explosion (`light/brand-a`, `dark/brand-a`, `light/brand-b`, `dark/brand-b`). |
| **One mechanism per repo** | Mixing two theme mechanisms in the same repo (a Chakra `Provider` AND a custom `data-theme` listener AND a Tailwind `dark:` strategy) is a smell that double-toggles and double-flashes. Pick the engine's idiomatic path and stay there. |

## The recommended attribute contract (works with any engine)

```html
<html
  lang="en"
  dir="ltr"
  data-theme="dark"      <!-- "light" | "dark" | brand-themed combos -->
  data-brand="default"   <!-- optional — only if multi-brand -->
  data-density="comfortable"   <!-- optional — see responsive-design.md -->
>
```

Why an HTML attribute (not a class):

- Works identically for CSS Modules, Tailwind, Chakra v3, vanilla-extract, Panda CSS,
  styled-components, and inline styles — every engine can read an attribute selector.
- Lets the pre-paint script set the value with a single `setAttribute` call before
  React boots.
- Survives RSC hydration without a className mismatch (Next.js + React still complain about
  className mismatches on `<html>`; `data-*` is exempt).

> **Engine note — Tailwind 3.4 vs 4.x.** The configuration differs by major; verify the
> installed version (`package.json`) before adopting:
>
> - **Tailwind 3.4+** — in `tailwind.config.{ts,js}`:
>   `darkMode: ['selector', '[data-theme="dark"]']`. The `dark:` variant then activates when
>   `<html>` carries `data-theme="dark"`.
> - **Tailwind 4.x** — no JS `darkMode` option. Declare a custom variant in your CSS entry:
>   ```css
>   @import "tailwindcss";
>   @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
>   ```
>   Same effect: the `dark:` variant activates on the kit's `data-theme="dark"` attribute.
>
> **Engine note — Chakra v3.** Chakra v3 delegates color-mode persistence to `next-themes`
> internally. Configure the wrapping `ThemeProvider` (`next-themes`) to write
> `attribute="data-theme"` (Pattern B above); Chakra reads from the same source. The Chakra
> config knob `cssVarsRoot` controls only WHERE CSS variables are emitted (selector for
> `:root`-level declarations) — it does NOT control persistence. Don't put theme-persistence
> claims on `cssVarsRoot`. Document the chosen approach in `project-specifics.md`.

## SSR flash prevention — the inline `<head>` script

The kit's expected pattern in the root layout (`app/layout.tsx`) — applies regardless of
engine. The script runs synchronously **before** the first paint, reads the persisted
preference + `prefers-color-scheme`, sets `data-theme` on `<html>`, and signals React to
hydrate with the same value.

**Two patterns work — pick one and record it in `project-specifics.md`.**

### Pattern A — direct inline `<script>` in the root layout (zero deps, RSC-friendly)

The minimum viable, RSC-safe pattern. Renders the script as a raw `<script>` tag (not
`next/script`); SSR-renders the persisted theme by reading the cookie on the server. The
critical extras: **`suppressHydrationWarning` on `<html>`** (the attribute is set client-side
before React hydrates, so the server-rendered DOM and the client one don't match) and a
**namespaced cookie name** (don't use the bare `theme` — collides with `next-themes`).

```tsx
// app/layout.tsx — Server Component
import { cookies } from 'next/headers';

const COOKIE = 'app-theme';   // namespace the cookie so it never collides with next-themes / Chakra

const themeScript = `
  (function () {
    try {
      var m = document.cookie.match(/(?:^|; )app-theme=([^;]+)/);
      var stored = m ? decodeURIComponent(m[1]) : null;
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (systemDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // SSR: render with the persisted theme if any, falling back to a sensible default.
  const cookieStore = await cookies();   // Next 15: async cookies()
  const initialTheme = cookieStore.get(COOKIE)?.value ?? 'light';

  return (
    <html lang="en" dir="ltr" data-theme={initialTheme} suppressHydrationWarning>
      <head>
        {/* Raw <script>, not next/script. beforeInteractive in App Router has a documented
            hydration-error bug with inline children (vercel/next.js#51242); the raw tag is
            the recommended workaround and is what next-themes uses internally.
            `dangerouslySetInnerHTML` here is safe ONLY because `themeScript` is a static
            string literal defined above with NO interpolation of user/cookie/header data.
            Never feed runtime/untrusted content into this prop — sanitize or use a different
            mechanism (see `security.md`). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Pattern B — `next-themes`

`next-themes` ships a tested theme-init script via its `ThemeProvider`. **It uses
localStorage**, NOT a cookie — so the *server* can't read the preference; the flash is
prevented by `next-themes`'s own injected pre-hydration script that mutates `<html>` before
paint, paired with `suppressHydrationWarning`. Configure it to write the `data-theme`
attribute (not a class) so the kit's one-source-of-truth contract holds.

```tsx
// app/providers.tsx — 'use client'
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"          // writes <html data-theme="…">
      defaultTheme="system"
      enableSystem
      storageKey="app-theme"
      // disableTransitionOnChange     // optional — avoids transition flicker on swap
    >
      {children}
    </ThemeProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from '@/app/providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

> **Pick one — don't combine.** Pattern A reads the preference on the server (so first-paint
> HTML is themed even before any JS runs); Pattern B is simpler but defers to a client-only
> script that runs before hydration. If you need server-rendered theme-aware UI (e.g.
> `generateMetadata` returning a theme-specific OG image), use Pattern A. Otherwise B is fine.
>
> **In either pattern, `suppressHydrationWarning` on `<html>` is mandatory** — without it React
> logs a hydration warning on every page load because the `data-theme` attribute differs
> between server and client renders.

## `forced-colors` mode (Windows High Contrast)

`forced-colors: active` overrides author colors with the user's system palette. Most styles
keep working; the gotchas:

- **Focus rings drawn with `box-shadow`** disappear under `forced-colors` because shadows are
  ignored. Use `outline` for focus (which `forced-colors` preserves), and reinforce with
  `outline-offset` for visibility against `Canvas`.
- **Selected / pressed state** that's signaled only by background color disappears. Add a
  redundant border or icon so meaning survives.
- **Hidden-but-functional elements** (e.g. an invisible focus ring on a custom checkbox)
  may become visible. Audit per atom.

**Two patterns** — combine them. The first keeps your existing box-shadow focus rings working
across all modes by adding a transparent outline; the second opts back into system colors
where the design's authored colors would be wiped.

```css
/* Pattern 1 — keep box-shadow focus rings AND survive forced-colors.
   `transparent` is the one color forced-colors mode REPLACES (with the user's foreground),
   so a transparent outline shows up only when forced-colors is active.
   See: Piccalilli, Ben Myers, Smashing Magazine on this technique. */
.button:focus-visible {
  box-shadow: 0 0 0 2px var(--color-border-interactive-hover);   /* normal modes */
  outline: 2px solid transparent;                                /* invisible — until forced-colors flips it */
  outline-offset: 2px;
}

/* Pattern 2 — explicit system-color fallback in forced-colors. Use when the design depends
   on a color that forced-colors would strip (a colored background, an icon, a border with
   state meaning). */
@media (forced-colors: active) {
  .button {
    border: 1px solid ButtonText;     /* system foreground */
    color: ButtonText;
    background: ButtonFace;           /* system surface */
  }
  /* `forced-color-adjust: auto` (the default) lets the system continue to override; set to
     `none` ONLY on elements that MUST preserve author colors (e.g. brand logo). */
}
```

Every interactive atom in `shared/ui` ships a `forced-colors` story (Storybook can simulate
this via the `addon-a11y` "Forced colors" toolbar). See `accessibility.md` for the AA
requirement; see `storybook.md` (when M7 ships) for the story convention.

## Multi-brand keying

When the product ships multiple brands (white-label, sub-brand, partner skin), brands map to
**semantic-tier overrides only** — primitives stay shared. The `data-brand` attribute is the
seam:

```css
:root                                  { /* primitives */ }
[data-theme='light']                   { /* light semantic defaults */ }
[data-theme='dark']                    { /* dark semantic defaults */ }
[data-brand='partner-a']               { /* brand-A semantic overrides (theme-agnostic) */ }
[data-theme='light'][data-brand='partner-a']  { /* light + brand-A combo */ }
[data-theme='dark'][data-brand='partner-a']   { /* dark + brand-A combo */ }
```

Rules:

- Brand swap **only overrides the semantic tier** — primitives stay shared across brands.
  Components reference semantics; brand difference is intent, not raw value.
- When a brand needs a color that doesn't exist on the shared primitive scale (e.g. a
  partner's actual brand hex), add it in a **brand-namespaced primitive group**
  (`color-brand-partner-a-{500,600,700}`) — not in the shared core scale. Other brands
  ignore brand-prefixed primitives by convention; the namespace makes the divergence
  explicit and auditable (a grep for `color-brand-` enumerates every brand exception).
- Combination count caps at **(themes × brands)** — typically 4 (light/dark × 2 brands). If
  the matrix grows past 8, the brands are diverging too much; split into separate apps.
- Test the **full matrix** in Storybook (theme × brand × forced-colors × LTR/RTL is the
  standard test surface for atoms).

## Per-engine mechanism (how each engine satisfies the contract)

### CSS Modules + design tokens (CSS custom properties)

The kit's original default. Themes are semantic-tier overrides on `[data-theme]`/`[data-brand]`
selectors in `tokens.css`. Components reference `var(--color-…)`; the cascade flips when the
attribute changes. SSR flash prevention via the inline head script above. RTL via logical
properties in every `.module.css`. `forced-colors` handled with `@media` blocks per atom.

### Tailwind CSS

Read the engine-note table above for the 3.4-vs-4.x split: either configure `darkMode` in JS
(3.4+) or `@custom-variant dark` in CSS (4.x). Map `data-brand` via a custom variant
(`@custom-variant brand-partner-a (&:where([data-brand=partner-a], [data-brand=partner-a] *))`
in v4, or the equivalent `addVariant` plugin in v3). Token source: Tailwind's `theme.extend`
reads from the same DTCG output (Style Dictionary's Tailwind formatter, or hand-author the
bridge). `forced-colors`: Tailwind ships a `forced-colors:` variant in 3.4+ and 4.x. RTL:
configure `rtl:` / `ltr:` variants (or use logical-property utilities — `ps-*`/`pe-*` etc.).
The pre-paint script and `data-theme` mechanism are identical to the CSS Modules path.

### Chakra v3

Chakra v3 delegates color-mode persistence to `next-themes`. Wrap the app in `next-themes`'s
`ThemeProvider` with `attribute="data-theme"` (Pattern B above), then Chakra reads from the
same source — no double-write. Tokens live in `defineTokens` / `defineSemanticTokens`. Brand
swap via Chakra's theme override mechanism (override semantic tokens at the provider, NOT
primitives). `cssVarsRoot` is only for choosing the selector that holds the emitted CSS
vars (`:where(:root, :host)` by default) — not persistence. `forced-colors` and RTL still
use plain CSS — Chakra emits CSS vars under the hood; `@media (forced-colors: active)` blocks
target them like any other vars.

### vanilla-extract / Panda CSS / StyleX (build-time CSS-in-JS)

Each engine ships its own `createTheme` / `cva` / theme-contract primitive. Map each theme to
a `[data-theme="<name>"]` selector at build time so the runtime cost is zero. Brand variants
are additional theme contracts keyed on `[data-brand]`. SSR flash prevention is identical
(inline head script).

### Runtime CSS-in-JS (Emotion, styled-components)

Use the engine's `ThemeProvider` — but **also** mirror the active theme name to `data-theme`
on `<html>` so the rest of the page (RSC-rendered surfaces, the inline head script's hydration
target) stays consistent. Performance budget caveat (`performance.md`): runtime engines re-run
style work on theme swap; pre-render both themes if the swap latency hurts.

## Theming + state siblings

The `styling-and-tokens.md` required-semantic-groups list (color base + interactive + state +
feedback + …) **all theme** — that's the point. If `color-bg-emphasis` has a light value and a
dark value, then `color-bg-emphasis-hover`/`-pressed`/`-disabled` also each have light + dark
values. Themes that skip a state token silently break in the swap.

The `add-design-token` skill's state-sibling rule applies per theme: adding a new interactive
token in the light theme requires its state siblings in the light theme **and** the dark theme
(and every brand combination that exists).

## Motion & `prefers-reduced-motion`

Every animation in the kit consumes **motion tokens** (`--motion-duration-*`,
`--motion-easing-*` — see `styling-and-tokens.md`'s required semantic groups), and every
animation has a **`prefers-reduced-motion` branch** that either collapses to opacity-only or
disables the motion entirely. Vestibular-disorder accessibility is not optional.

```css
.dialog-content {
  transition:
    opacity   var(--motion-duration-base) var(--motion-easing-standard),
    transform var(--motion-duration-base) var(--motion-easing-emphasized);
  opacity: 0;
  transform: translateY(8px);
}
.dialog-content[data-state='open'] {
  opacity: 1;
  transform: translateY(0);
}

/* The required override: collapse to opacity-only when the user prefers reduced motion. */
@media (prefers-reduced-motion: reduce) {
  .dialog-content {
    transition: opacity var(--motion-duration-fast) var(--motion-easing-standard);
    transform: none;
  }
  .dialog-content[data-state='open'] {
    transform: none;
  }
}
```

Rules:

- ❌ A `transition` / `animation` declaration without a `prefers-reduced-motion` branch.
- ❌ Raw durations or easings (`200ms`, `cubic-bezier(…)`) — use the motion tokens.
- ❌ Auto-playing animations (carousels, hero motion) that don't respect
  `prefers-reduced-motion`. Auto-play pauses or stops when the preference is set.
- ✅ Every animated atom in `shared/ui` ships a `prefers-reduced-motion` story (per the
  Storybook matrix in `storybook.md`).
- ✅ Engine-specific motion APIs (Framer Motion's `useReducedMotion`, Chakra's `prefers-
  reduced-motion` aware `motion` props) are allowed — they wrap the same `@media` query.

## Hard rules (engine-agnostic)

- ❌ More than one theme mechanism in steady state — a Chakra `Provider` AND a custom
  `data-theme` listener AND a Tailwind `dark:` strategy all flipping at once. Pick one.
- ❌ Theme decisions branched on a React prop or `useState` in a component (`<Button
  theme="dark">`). Theme is one attribute on `<html>`; components read CSS vars / classes
  set by that attribute.
- ❌ `prefers-color-scheme` read in component code via `useMedia` etc. — the inline head
  script is the single source.
- ❌ localStorage for theme persistence on an SSR app — guarantees a flash. Use a cookie.
- ❌ Color-only meaning (a "danger" button signaled only by red — fails `forced-colors` and
  color-blind accessibility). Add a label, an icon, or a non-color affordance.
- ❌ `box-shadow`-only focus rings — invisible under `forced-colors`. Use `outline`.
- ❌ Physical `left`/`right` / `margin-left` etc. for inline-direction layout — breaks RTL.
  Use logical properties.
- ❌ Brand keying that adds new primitives instead of overriding semantics — leaks brand
  divergence into the shared scale.
- ❌ A theme-aware atom shipping without a Storybook story per theme × forced-colors ×
  RTL combination.
- ❌ Root layout's `<html>` missing `suppressHydrationWarning` — both Pattern A (direct
  inline script) and Pattern B (`next-themes`) mutate `data-theme` client-side before
  hydration; without the attribute every page logs a hydration warning.
- ❌ Cookie name `theme` (collides with `next-themes` and Chakra v3's color-mode key) —
  namespace it (`app-theme`, `<product>-theme`).
- ✅ One `data-theme` (+ optional `data-brand`, `data-density`, `data-direction`) attribute
  source on `<html>`, set pre-paint by an inline script.
- ✅ Engine reads that source idiomatically (CSS attribute selectors, Tailwind variant,
  Chakra provider mapped to the attribute, vanilla-extract theme keyed on the attribute).
- ✅ Logical properties for inline direction; `dir` attribute flips the layout.
- ✅ `@media (forced-colors: active)` rules where author colors would be lost; outline-based
  focus rings.
- ✅ State siblings present in every theme; multi-brand combinations tested.

## Checklist — theming is "complete" when

- [ ] `<html>` carries `data-theme`, `dir`, and (if applicable) `data-brand` set pre-paint.
- [ ] The engine reads the attribute idiomatically (CSS Modules selector, Tailwind variant
      config, Chakra provider, vanilla-extract theme contract, etc.).
- [ ] No flash on hard refresh in light, dark, and (if applicable) each brand.
- [ ] `prefers-color-scheme` and manual override both work; the override persists via cookie.
- [ ] Every interactive atom has Storybook stories for light + dark + `forced-colors` +
      LTR + RTL (theme × forced-colors × direction matrix).
- [ ] No physical `left`/`right`/`padding-left` etc. in any inline-direction style.
- [ ] State siblings (`-hover`/`-pressed`/`-disabled`) themed in every theme.
- [ ] No component reads a theme prop; the cascade is the source.
- [ ] `@media (forced-colors: active)` blocks present on focus rings, selected states, and
      anywhere color-only meaning would otherwise break.
- [ ] `jest-axe` clean per `accessibility.md` in light + dark.

## Sources
- [WCAG 2.2 — Use of Color (1.4.1)](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [WCAG 2.2 — Non-text Contrast (1.4.11)](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [MDN — `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [MDN — System Colors (`Canvas`, `CanvasText`, …)](https://developer.mozilla.org/en-US/docs/Web/CSS/system-color)
- [MDN — CSS logical properties (RTL)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [next-themes — App Router setup (localStorage + injected pre-hydration script)](https://github.com/pacocoursey/next-themes)
- [vercel/next.js#51242 — `next/script` `beforeInteractive` hydration error in App Router](https://github.com/vercel/next.js/issues/51242)
- [Piccalilli — Transparent borders/outlines for high-contrast mode](https://piccalil.li/blog/use-transparent-borders-and-outlines-to-assist-with-high-contrast-mode/)
- [Tailwind — Dark mode (selector strategy)](https://tailwindcss.com/docs/dark-mode)
- [Tailwind — `forced-colors:` variant](https://tailwindcss.com/docs/hover-focus-and-other-states#forced-colors-mode)
- [Chakra v3 — Color mode](https://www.chakra-ui.com/docs/styling/color-mode)
- [vanilla-extract — themes](https://vanilla-extract.style/documentation/theming/)
