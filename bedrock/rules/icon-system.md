# Rule: Icon system

> **Non-negotiable.** Every kit-compliant repo ships **one** Icon system in `shared/ui` — a
> single typed `<Icon name="…" size="…" />` atom that reads from a generated SVG sprite (or
> the equivalent typed registry). SVGs use `currentColor` for fill; size comes from a token
> scale; decorative icons get `aria-hidden`, meaningful icons require `aria-label`. Mixing
> two icon libraries in the same repo is forbidden.

## Why this exists

Icons are a high-traffic surface that drifts faster than any other primitive: an emoji here,
a Heroicons import there, a hand-drawn SVG someone pasted in, an `<img src="…" />` from a CDN.
Each route's icons end up sized differently, fail `forced-colors`, miss accessible names, and
ship 12 copies of the same path in the bundle. The kit names one system per repo and
enforces the contract.

## The contract

```tsx
import { Icon, type IconName } from '@/shared/ui';

<Icon name="check-circle" size="md" aria-label="Saved" />     // meaningful
<Icon name="chevron-down" size="sm" aria-hidden />            // decorative
```

What the contract guarantees:

- **Typed name.** `name: IconName` is a union generated from the registry — typos fail TS.
- **Token-sized.** `size: 'xs' | 'sm' | 'md' | 'lg'` (defaults to `md`) maps to
  `--icon-size-{xs,sm,md,lg}` from the token system.
- **`currentColor` fill.** The SVG inherits color from its parent — themes (light/dark/
  forced-colors) propagate automatically.
- **Accessible.** Decorative icons need `aria-hidden`; icons that *convey* information need
  `aria-label`. The component defaults `aria-hidden` when no label is passed — but a
  reviewer / `jest-axe` catches the case where an icon-only button forgets the label.

## Where the SVGs live

```
shared/ui/atoms/icon/
├── icon.tsx                  # the <Icon> component
├── icon.props.ts
├── icon.module.css           # sets size via --icon-size-* tokens, color via currentColor
├── icon.stories.tsx          # one story showing every icon at every size
├── icon.test.tsx             # axe + decorative-vs-labeled assertions
├── icon-names.ts             # generated: export type IconName = 'check' | 'chevron-down' | …
├── sprite.svg                # generated: <symbol id="check">…</symbol> per icon
└── index.ts
```

The sprite is generated at build time from raw `.svg` files in a sibling `svgs/` folder.
Tools like **SVGO + svg-sprite**, **svg-sprite-loader**, or **rollup-plugin-svgr-sprite**
all work — pick one per the project's build system and record it in `project-specifics.md`.
Every project-specific build also generates the `IconName` union so TS catches typos.

## When to add an icon

1. Drop the raw SVG into `shared/ui/atoms/icon/svgs/<name>.svg` (kebab-case, 24×24 viewBox is
   the kit default — match the design system's grid).
2. Run the sprite-build script (`pnpm icons:build` or whatever the project named it).
3. The new icon appears in the `IconName` union; TS now accepts `name="<name>"`.

If the new icon doesn't conform to the grid (different viewBox, multi-color brand mark),
add it as a **separate file-level component** (e.g. `shared/ui/atoms/brand-mark/`) — not in
the sprite. The sprite is for the single-color, single-grid icon family.

## Hard rules

- ❌ Multiple icon libraries in the same repo (`@heroicons/react` AND `lucide-react` AND
  custom SVGs). Pick one; record in `tech-radar.md`.
- ❌ Raw `<svg>` markup pasted directly into a component file — it'll drift in size, color,
  and accessibility. Add it to the sprite.
- ❌ `<img src="/icon.svg">` for UI icons — no `currentColor`, no sprite caching, no a11y
  contract. (Logo/brand-mark images can stay `<img>` or `next/image` because they're a
  different family.)
- ❌ Inline `width` / `height` literals on `<Icon>` — use `size`.
- ❌ Inline `fill` / `color` on the SVG — use the parent's `color`. The sprite's symbols
  declare `fill="currentColor"` once.
- ❌ Icon-only buttons without `aria-label` — fails AA (the button has no accessible name).
- ❌ Meaningful icons with `aria-hidden` — screen readers miss the meaning.
- ❌ Importing an icon from a feature/entity slice — icons are `shared/ui`, full stop.
- ✅ One typed `<Icon>` atom with the contract above.
- ✅ SVGs as a build-time sprite; `IconName` union generated; sizes from tokens.
- ✅ Accessible by default — `aria-hidden` if no label, `aria-label` for meaningful icons.

## Checklist — an icon-system addition is "done" when

- [ ] The SVG lives in the sprite source (`svgs/<name>.svg`), kebab-case, on the documented
      grid.
- [ ] The build regenerated the sprite and the `IconName` union; TS accepts the new name.
- [ ] The icon renders correctly at every `size` (Storybook matrix from `storybook.md`).
- [ ] Light/dark/`forced-colors` all show the icon (the `currentColor` contract).
- [ ] If consumed in an icon-only context (e.g. a button), the consumer adds `aria-label`.

## Sources
- [WAI-ARIA Authoring Practices — Icon buttons](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
- [SVG sprite techniques — CSS-Tricks](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)
- [Accessible SVG icons (Sara Soueidan)](https://www.sarasoueidan.com/blog/accessible-icon-buttons/)
