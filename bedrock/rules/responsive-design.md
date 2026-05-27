# Rule: Responsive Design (mobile / tablet / desktop)

> **Non-negotiable.** Every UI is **mobile-first** and works from small phone to large desktop.
> Responsiveness is a **design-system concern** expressed through tokens — not a per-page patch.

## Why

Mobile-first `min-width` CSS is cleaner and more performant (start simple, progressively enhance).
The modern toolkit makes most one-off media queries unnecessary: **container queries** for
component-level adaptability, **`clamp()`** for fluid type/space, and **breakpoint tokens** so the
whole system shares one set of thresholds.

## Breakpoints live in the token system

Add a **breakpoint tier** to `tokens/` (see `styling-and-tokens.md`). Author once, generate to CSS
custom properties + a typed map. Content-driven thresholds, mobile-first:

```
--bp-sm: 30rem;   /* 480px  large phone        */
--bp-md: 48rem;   /* 768px  tablet portrait     */
--bp-lg: 64rem;   /* 1024px laptop              */
--bp-xl: 80rem;   /* 1280px desktop             */
--bp-2xl: 96rem;  /* 1536px large desktop       */
```

> Set breakpoints where **your content breaks**, not at device sizes. The tokens above are the
> default starting set; adjust per project in `project-specifics.md`, never per-component.

## Authoring (mobile-first, in CSS Modules)

Base styles are the mobile layout. Enhance upward with `min-width` queries referencing breakpoints.

```css
/* base = mobile */
.grid { display: grid; grid-template-columns: 1fr; gap: var(--space-stack-md); }

@media (min-width: 48rem) { /* md: tablet */
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 64rem) { /* lg: laptop+ */
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Prefer container queries for reusable components (WCAG-safe, placement-independent)

A component should adapt to **its container**, not the viewport, so it behaves correctly in a hero
or a sidebar. Default to `@container` for shared atoms/molecules.

```css
.card-wrap { container-type: inline-size; }

.card { display: flex; flex-direction: column; }
@container (min-width: 24rem) {
  .card { flex-direction: row; align-items: center; }
}
```

### Fluid typography & spacing with `clamp()`

Use `clamp(min, preferred, max)` for type and large spacing so you need fewer breakpoints. Emit
fluid values from the token build where appropriate.

```css
.title { font-size: clamp(1.5rem, 1rem + 2.5vw, 2.5rem); }
.section { padding-block: clamp(var(--space-inset-md), 4vw, var(--space-inset-xl)); }
```

## Touch & pointer

- **Touch targets ≥ 44×44 (Apple) / 48×48 (Google) CSS px** for primary controls; never below the
  WCAG 24px floor. Add spacing between adjacent targets. (Ties to `accessibility.md` §4.)
- Don't rely on hover — hover-only affordances are invisible on touch. Provide a tap/focus equivalent.
- Respect `prefers-reduced-motion` for any scroll/parallax/transition (see `accessibility.md` §8).

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

## Responsive logic in TS (only when CSS can't)

Prefer CSS for layout. When behavior must branch (e.g. render a drawer vs. inline panel), use a
single shared hook reading the **breakpoint tokens** — never hardcode pixel checks in components.

```ts
// useBreakpoint reads the same tokens; one source of truth
const isAtLeastMd = useMinWidth('--bp-md'); // matchMedia under the hood, SSR-safe default
```

Guard SSR: assume mobile (smallest) on the server; hydrate to the real value. Never read `window`
during render without a guard.

## Layout primitives

- Use intrinsic CSS — Grid (`repeat(auto-fit, minmax(…))`), Flexbox, `gap` — over fixed widths.
- Images: always `next/image` with `sizes` set for responsive art; reserve space to avoid CLS
  (see `performance.md`). Use logical properties (`padding-inline`, `margin-block`) for RTL safety.

## Testing responsiveness

- **Storybook viewports** (`@storybook/addon-viewport`): every layout-bearing story exercises
  mobile / tablet / desktop presets. Ship a shared viewport set (phone 320/390/414, tablet 768/834, desktop 1280/1440).
- Behavior that branches by breakpoint gets a test at each relevant width (mock `matchMedia`).
- Manual: verify the smallest supported width (≈320px) has no horizontal scroll or clipped content.

## Hard rules

- ❌ Desktop-first CSS or `max-width`-first cascades as the default.
- ❌ Hardcoded pixel breakpoints in components (use breakpoint tokens) or device-specific magic numbers.
- ❌ Touch targets under 44px for primary controls; hover-only affordances.
- ❌ Fixed widths/heights that cause overflow on small screens.
- ✅ Mobile-first; breakpoints from tokens; container queries for reusable components; `clamp()` for fluid sizing.
- ✅ One shared breakpoint hook for JS branching; SSR-safe defaults; viewport stories.

## Checklist
- [ ] Base styles are mobile; enhancements are `min-width`.
- [ ] Breakpoints come from tokens; reusable components use `@container`.
- [ ] Fluid type/space via `clamp()` where it removes breakpoints.
- [ ] Touch targets ≥ 44/48px; no hover-only; reduced-motion respected.
- [ ] No horizontal scroll at 320px; images use `next/image` + `sizes`.
- [ ] Storybook viewport stories for mobile/tablet/desktop; JS breakpoint branches tested.

## Sources
- [Responsive design breakpoints in 2025 (BrowserStack)](https://www.browserstack.com/guide/responsive-design-breakpoints)
- [Responsive design best practices 2025 (NextNative)](https://nextnative.dev/blog/responsive-design-best-practices)
- [MDN — Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
