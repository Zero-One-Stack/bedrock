# Rule: Component composition & headless primitives

> **Non-negotiable.** Multi-part components (Tabs, Dialog, Menu, Accordion, …) export a
> **namespace object** of compound parts. Polymorphic rendering uses the **`asChild` Slot
> pattern** — never a raw `as` prop. Interactive behavior (focus traps, keyboard nav, ARIA,
> roving tabindex) comes from a **headless behavior library** (one approved choice per repo,
> recorded in `tech-radar.md` and `project-specifics.md`); the styling layer stays CSS Modules
> + tokens. The component *placement* rules (`feature-sliced-design.md`,
> `component-structure.md`) are unchanged — this rule fills in *how* a non-trivial component
> is composed.

## Why this exists

`component-structure.md` covers the file-per-concern contract for a single component. It is
silent on **how the next 100 `Tabs`/`Dialog`/`Menu`/`Combobox`-shaped components should be
authored** — multi-part API, polymorphic rendering, headless behavior. Without a rule, three
teams build Tabs three ways, every one of them re-implements focus traps badly, and the
design-system contract drifts. This rule picks one pattern per axis and enforces it.

## Compound components — the namespace export

A component that owns more than one named subcomponent (Tabs has multiple parts; Dialog has
Root/Trigger/Portal/Overlay/Content/Title/Description/Close, etc.) exports a single
**namespace object** plus the underlying parts. Consumers use dot-access.

**The exact subcomponent names come from the wrapped headless library — they are not
uniform across libraries.** Examples (verify the installed major against the lib's current
docs — see CLAUDE.md "verify, not recall"):

| Headless lib | Tabs parts (representative) |
| --- | --- |
| Radix Primitives | `Root`, `List`, `Trigger`, **`Content`** |
| Base UI | `Root`, `List`, **`Tab`**, `Indicator`, `Panel` |
| React Aria Components | flat exports — `Tabs`, `TabList`, `Tab`, `TabPanel` |
| Ariakit | flat exports — `TabProvider`, `TabList`, `Tab`, `TabPanel` |

The kit's namespace shape is **whatever the wrapped library exposes** — don't invent a
different one. For libs with flat exports (React Aria, Ariakit), wrap each flat export and
group them into the namespace yourself; for libs with their own namespace (Radix, Base UI),
re-export the same shape. Document the chosen shape in `project-specifics.md` once.

```tsx
// shared/ui/molecules/tabs/tabs.tsx — wrapping Radix as the example.
// Recon first: confirm the installed Radix major and that `Content` (not `Panel`) is the
// current name. With another lib, substitute its parts (see the table above).
'use client';
import * as RadixTabs from '@radix-ui/react-tabs';
import styles from './tabs.module.css';
import { cx } from '@/shared/lib/cx';

type RootProps = React.ComponentProps<typeof RadixTabs.Root>;
function Root({ className, ...rest }: RootProps) {
  return <RadixTabs.Root className={cx(styles.root, className)} {...rest} />;
}
type ListProps = React.ComponentProps<typeof RadixTabs.List>;
function List({ className, ...rest }: ListProps) {
  return <RadixTabs.List className={cx(styles.list, className)} {...rest} />;
}
type TriggerProps = React.ComponentProps<typeof RadixTabs.Trigger>;
function Trigger({ className, ...rest }: TriggerProps) {
  return <RadixTabs.Trigger className={cx(styles.trigger, className)} {...rest} />;
}
type ContentProps = React.ComponentProps<typeof RadixTabs.Content>;
function Content({ className, ...rest }: ContentProps) {
  return <RadixTabs.Content className={cx(styles.panel, className)} {...rest} />;
}

export const Tabs = { Root, List, Trigger, Content };
```

> ⚠️ **className-merge gotcha — destructure first, then spread.** Always
> `function X({ className, ...rest })` and emit `<Headless.X className={cx(styles.x, className)}
> {...rest} />`. Writing `<Headless.X className={cx(…, p.className)} {...p} />` lets the
> spread re-apply `p.className` and **overwrites** the merged value — the wrapper's tokens
> never land.

```tsx
// consumer
import { Tabs } from '@/shared/ui';

<Tabs.Root defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="details">Details</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">…</Tabs.Content>
  <Tabs.Content value="details">…</Tabs.Content>
</Tabs.Root>;
```

Rules:

- **One folder, one namespace** per compound component. Subcomponents can live in the same
  file (small) or in sibling leaf files imported by it (large) — they are never re-exported
  as separate slice-public symbols.
- The slice's `index.ts` exports the **namespace** (`Tabs`) — never the inner parts (do not
  re-export `Tabs.Root` separately).
- Subcomponent props are typed by **extending the wrapped headless primitive's props** so the
  consumer sees the full a11y/event surface without a hand-written type.
- Each subcomponent file is the same `component-structure.md` contract (props, module.css,
  composition, stories, test).

### Where compound components live (atomic level)

A multi-part component (Dialog with Portal/Overlay/Content/Title/Close, Tabs with
List/Trigger/Content) is **not an atom** under the kit's atomic sub-convention —
`component-structure.md` defines atoms as "single indivisible elements (button, input, icon,
badge)." Compound components live in `shared/ui/molecules/` (small compositions of atoms) or
`shared/ui/organisms/` (larger self-contained sections). Pick by size, record the choice once
in `project-specifics.md`. If the repo uses a flat `shared/ui/<component>/` layout instead of
the atomic sub-convention, the same component just lives there directly.

## Polymorphism — `asChild` (Slot pattern), never raw `as`

A component that needs to render as a different element (a `<Button>` that's actually an
`<a>`, a `<Card>` rendered as `<section>`) accepts `asChild?: boolean`. When `asChild` is
true, the component **renders its single child** with the component's classes + handlers +
ref merged in. When false (the default), it renders its own intrinsic element.

**Use the headless library's Slot if it ships one.** Base UI exports `Slot` from its render
helpers, Radix ships `@radix-ui/react-slot`, Ariakit's `Role` plays a similar part. If the
adopted lib doesn't ship a Slot, the kit provides a minimal one at `shared/lib/slot/`
(template below — create it once per repo, like the `cx` helper).

```tsx
// shared/ui/atoms/button/button.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from 'react';
import { Slot } from '@/shared/lib/slot';   // or the adopted headless lib's Slot
import styles from './button.module.css';
import { cx } from '@/shared/lib/cx';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'primary' | 'subtle';
  children?: ReactElement | React.ReactNode;
};

// Ref type covers both branches: `<button>` (default) and the asChild child (often
// HTMLAnchorElement). When the consumer renders as an anchor, narrow the ref at the call
// site via `useRef<HTMLAnchorElement>()`; the wrapper accepts the union. This is the
// documented Slot pattern trade-off — `asChild` is the kit's pick because raw `as` breaks
// generic ref-typing entirely and forces every consumer into casts.
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  { asChild, variant = 'primary', className, ...rest },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cx(styles.root, styles[variant], className)} {...rest} />;
});
```

```tsx
// consumer — render as a Next.js Link without losing focus styles, event handlers, or ref forwarding.
import Link from 'next/link';
import { Button } from '@/shared/ui';

<Button asChild variant="primary">
  <Link href="/grievances">File a grievance</Link>
</Button>;
```

### Minimal Slot helper (create once per repo if the adopted lib doesn't ship one)

```ts
// shared/lib/slot/slot.tsx — the canonical kit Slot. Create only if the adopted headless lib
// doesn't expose its own. Roughly equivalent to @radix-ui/react-slot's surface.
import { Children, cloneElement, forwardRef, isValidElement, type ReactElement } from 'react';

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T) => {
    for (const r of refs) {
      if (typeof r === 'function') r(value);
      else if (r && 'current' in r) (r as React.MutableRefObject<T>).current = value;
    }
  };
}

export const Slot = forwardRef<unknown, React.HTMLAttributes<unknown> & { children?: React.ReactNode }>(
  function Slot({ children, ...slotProps }, ref) {
    if (!isValidElement(children) || Children.count(children) !== 1) {
      throw new Error('Slot expects exactly one React element as children.');
    }
    const child = children as ReactElement<any>;
    return cloneElement(child, {
      ...slotProps,
      ...child.props,
      // className: wrapper class first so the child can still extend it
      className: [slotProps.className, child.props.className].filter(Boolean).join(' '),
      ref: mergeRefs(ref, (child as any).ref),
    });
  },
);
```

The thrown error IS the `asChild` arity check the rules below mandate — Slot blows up in dev
when the consumer passes zero or multiple children.

Why not raw `as`:

- Polymorphic `as` props break **ref typing** entirely (the ref becomes a union of every
  possible rendered element, which is unsound under generics and forces consumers into casts).
- Event handler typing follows the same union problem — `onClick` ends up `any`-shaped.
- `Slot` is not free of ref-type rough edges (see the Button template note), but it
  **localizes** the trade-off to one prop on the wrapper instead of poisoning the entire
  component's generics. It also keeps className + handler + ref merging as documented behavior
  of one helper, not as a per-consumer reinvention.

Rules:

- ❌ `as` / `component` / `forwardedAs` props — never.
- ❌ `asChild` accepting more than one child or zero children — the Slot helper throws.
- ✅ Every atom that might render as a link, label-target, or other-tag accepts `asChild`.
- ✅ Ref forwarding is mandatory on every component that supports `asChild`; the ref type
  unions the default element with the most common `asChild` target (typically `<a>`).

## Variant API — a recipe per axis

Components with more than one visual variant (size · intent · tone · density · …) expose
each axis as a **prop**, and the prop-to-class mapping lives in a sibling **`*.variants.ts`**
file as a typed *recipe*. This is the variant idiom the kit picks, regardless of styling
engine — the **shape** of the API is the same; the **implementation** of the recipe varies
by engine (CSS Modules + `cx`, Tailwind + CVA, Chakra `defineRecipe`, vanilla-extract
`recipe`, Panda CSS, …).

The shape consumers see:

```tsx
<Button size="md" intent="primary" tone="neutral">Save</Button>
```

Rules for the API:

- **Each axis is a single prop with a string-union type** — never booleans
  (`primary={true}`/`danger={true}` exploding into invalid combinations). Each axis has a
  documented **default value** so unset props don't break the variant matrix.
- **Composition over multiplication.** If two axes can be authored independently (size + tone),
  keep them separate. If they're inseparable (`intent="primary-on-dark"`), the variant IS the
  union — don't pretend to split it.
- **Stable prop names across the kit:** `size`, `intent`, `tone`, `variant` (use one of these
  vocabularies — don't invent `kind`, `level`, `flavor`, `type` per component). Record the
  repo's chosen vocabulary in `project-specifics.md`.
- **The recipe file is the source of truth for the matrix.** The `.tsx` accepts the props,
  passes them to the recipe, and applies the returned classes/styles. No conditional class
  composition in the `.tsx`.

### Engine-specific recipe (illustrative — pick what the project's engine uses)

```ts
// shared/ui/atoms/button/button.variants.ts — CSS Modules + the kit's variants helper.
import { recipe, type VariantProps } from '@/shared/lib/variants';
import styles from './button.module.css';

export const buttonVariants = recipe({
  base: styles.root,
  variants: {
    size:   { sm: styles.sizeSm,   md: styles.sizeMd,   lg: styles.sizeLg   },
    intent: { primary: styles.intentPrimary, danger: styles.intentDanger,
              subtle: styles.intentSubtle },
    tone:   { neutral: styles.toneNeutral, brand: styles.toneBrand },
  },
  defaults: { size: 'md', intent: 'primary', tone: 'neutral' },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

```tsx
// shared/ui/atoms/button/button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { buttonVariants, type ButtonVariants } from './button.variants';
import { cx } from '@/shared/lib/cx';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants & {
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button({ size, intent, tone, className, ...rest }, ref) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cx(buttonVariants({ size, intent, tone }), className)}
        {...rest}
      />
    );
  },
);
```

> **Tailwind:** swap the `styles.*` references for CVA (`cva()`) — the recipe shape is
> identical. **Chakra v3:** use `defineRecipe` from `@chakra-ui/react`. **vanilla-extract:**
> use its `recipe` from `@vanilla-extract/recipes`. **Panda CSS:** use `cva` from
> `@pandacss/dev`. The shape consumers see is always
> `<Component size={...} intent={...} tone={...} />`.

### Minimal `recipe` helper (create once per repo for CSS-Modules-based projects)

If the project's engine doesn't ship a recipe primitive (CSS Modules + plain CSS), drop this
small helper into `shared/lib/variants/` once. ~25 lines, fully typed, no runtime cost.

```ts
// shared/lib/variants/variants.ts
type VariantsMap = Record<string, Record<string, string>>;
type Defaults<V extends VariantsMap> = { [K in keyof V]?: keyof V[K] };

export function recipe<V extends VariantsMap>(opts: {
  base?: string;
  variants: V;
  defaults?: Defaults<V>;
}) {
  return (props: Defaults<V> & { className?: string } = {}) => {
    const out: string[] = [];
    if (opts.base) out.push(opts.base);
    for (const axis of Object.keys(opts.variants) as Array<keyof V>) {
      const choice = (props[axis] ?? opts.defaults?.[axis]) as keyof V[typeof axis] | undefined;
      if (choice && opts.variants[axis][choice as string]) {
        out.push(opts.variants[axis][choice as string]);
      }
    }
    if (props.className) out.push(props.className);
    return out.filter(Boolean).join(' ');
  };
}

export type VariantProps<T> = T extends (props: infer P) => string
  ? Omit<P, 'className'>
  : never;
```

### Hard rules for variants

- ❌ Boolean variant props (`primary={true}`, `danger={true}`) — use a string union.
- ❌ Conditional class composition in the `.tsx` (`cx(styles.root, isPrimary && styles.primary,
  size === 'lg' && styles.lg)`). The recipe owns it.
- ❌ Inventing a per-component vocabulary (`kind`, `level`, `flavor`, `type`) when `size`/
  `intent`/`tone`/`variant` would do.
- ❌ A recipe without **documented defaults** — unset prop combinations must resolve.
- ❌ Inline-tracking the variant matrix in Storybook — the stories iterate the recipe's keys,
  not hand-author each combination.
- ✅ One recipe file per component (`*.variants.ts`); stable vocabulary; defaults declared;
  matrix iterable from the recipe alone.

## Behavior split — `*.behavior.ts` (heuristic, not a numeric gate)

A component whose interaction logic is non-trivial (open/close state machine, focus
management wiring, keyboard handlers, controlled/uncontrolled props, validation effects)
splits behavior into a `useXBehavior()` hook in a sibling `*.behavior.ts`. The `.tsx` becomes
a thin renderer: JSX + token classes + the hook's return value.

This is a **reviewer-judgment heuristic, not an automated rule.** The typical trigger is
"state + 2 effects + 2 handlers" or roughly 30+ lines of interaction logic — but the number
is a smell, not a gate. A 20-line hook that's tested in isolation is fine; a 200-line `.tsx`
with no testable seam is not. Use judgment and split when the `.tsx` becomes hard to read.

```ts
// shared/ui/atoms/select/select.behavior.ts
'use client';
import { useState, useId } from 'react';

export function useSelectBehavior(options: SelectOptions) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // …focus, keyboard, ARIA-live, controlled/uncontrolled reconciliation…
  return { open, setOpen, id, /* handlers, refs */ };
}
```

```tsx
// shared/ui/atoms/select/select.tsx
'use client';
import { useSelectBehavior } from './select.behavior';

export function Select(props: SelectProps) {
  const { open, setOpen, id /* … */ } = useSelectBehavior(props);
  return (/* JSX */);
}
```

Rules:

- The hook lives in `*.behavior.ts` in the same folder. Naming: `use<Name>Behavior`.
- Tests target the hook directly (`renderHook`) where the logic is worth its own coverage;
  the `.tsx` test stays focused on rendered output.
- Small components keep their logic inline — don't extract speculatively.

## Headless behavior — one library per repo

Modern atomic-design systems pair a **headless behavior layer** (focus management, keyboard
nav, ARIA wiring, dismissable layers, portals, controlled-uncontrolled state, polymorphic
rendering) with a **token-styled wrapper** (this kit's CSS Modules + tokens). The kit's hard
ban on "component libraries that own styling" (CLAUDE.md) does **not** ban behavior-only
libraries — those are exactly what to use here. (The CLAUDE.md ban explicitly carves them
out — see its hard-ban list.)

**Pick one per repo** and record the choice in `tech-radar.md` (Adopt row) and
`project-specifics.md` (Approved overrides if the chosen lib differs from the kit default).
Mixing two headless layers in the same repo is forbidden in steady state — you double the
bundle, double the API surface, and double the a11y bug surface.

> **Migration carve-out.** When swapping from one approved headless lib to another (the
> obvious case is Radix → Base UI as the maintainers' next-gen successor matures), both libs
> may co-exist temporarily on a **dated, time-boxed waiver** logged in `project-specifics.md`
> per `governance.md`. The waiver must (a) name the source/target libs, (b) list the slices
> still using the source, (c) carry a cut-over date. Steady-state remains "one lib."

Approved options (any one — verify the **installed package name and current major**
against the lib's docs/Context7 before adding; package identifiers shift):

- **Base UI** — the Radix maintainers' next-gen successor. Default recommendation for new
  repos. Verify the current npm package (the project has used multiple package identifiers
  during its release cycle).
- **Radix Primitives** (`@radix-ui/react-*` per-primitive packages) — mature, widely
  adopted; still actively maintained for existing repos.
- **React Aria Components** (`react-aria-components`) — Adobe's a11y-first set; strongest
  for internationalization and high-bar accessibility requirements.
- **Ariakit** (`@ariakit/react`) — comprehensive, less opinionated about rendering shape.

What the headless library provides — and what you must **wrap, not redo**:

- Focus traps and focus return on dismissable layers.
- Roving tabindex / arrow-key navigation on composite widgets.
- ARIA roles, labels, descriptions, expanded/selected/checked state.
- Portal mounting and overlay stacking.
- Controlled/uncontrolled prop reconciliation (state-from-prop, default-state).
- Dismiss-on-outside-click, dismiss-on-Escape, scroll-lock.

If your component re-implements any of the above instead of delegating, that's a bug — fix
by delegating, not by debugging the re-implementation.

### File layout for a headless-backed component

```
shared/ui/molecules/dialog/
├── dialog.tsx                 # wrapping namespace object (Dialog.Root, .Trigger, .Content, …)
├── dialog.behavior.ts         # if any wrapper logic crosses the threshold (rare with a good headless lib)
├── dialog.module.css          # token-only CSS
├── dialog.props.ts            # named fixtures
├── dialog.composition.tsx
├── dialog.stories.tsx
├── dialog.test.tsx
└── index.ts                   # exports { Dialog } — the namespace, nothing inner
```

Inside `dialog.tsx` — note the **destructure-first, spread-rest** pattern on every wrapped
part (the className-merge gotcha):

```tsx
'use client';
import * as Headless from '<approved-headless-lib>';   // e.g. '@radix-ui/react-dialog'
import styles from './dialog.module.css';
import { cx } from '@/shared/lib/cx';

function Root(p: React.ComponentProps<typeof Headless.Root>) { return <Headless.Root {...p} />; }
function Trigger({ className, ...rest }: React.ComponentProps<typeof Headless.Trigger>) {
  return <Headless.Trigger className={cx(styles.trigger, className)} {...rest} />;
}
function Portal(p: React.ComponentProps<typeof Headless.Portal>) { return <Headless.Portal {...p} />; }
function Overlay({ className, ...rest }: React.ComponentProps<typeof Headless.Overlay>) {
  return <Headless.Overlay className={cx(styles.overlay, className)} {...rest} />;
}
function Content({ className, ...rest }: React.ComponentProps<typeof Headless.Content>) {
  return <Headless.Content className={cx(styles.content, className)} {...rest} />;
}
function Title({ className, ...rest }: React.ComponentProps<typeof Headless.Title>) {
  return <Headless.Title className={cx(styles.title, className)} {...rest} />;
}
function Description({ className, ...rest }: React.ComponentProps<typeof Headless.Description>) {
  return <Headless.Description className={cx(styles.description, className)} {...rest} />;
}
function Close({ className, ...rest }: React.ComponentProps<typeof Headless.Close>) {
  return <Headless.Close className={cx(styles.close, className)} {...rest} />;
}

export const Dialog = { Root, Trigger, Portal, Overlay, Content, Title, Description, Close };
```

### When NOT to introduce a headless dependency

- A genuinely non-interactive presentational atom (`<Badge>`, `<Card>`, `<Avatar>`) — no
  headless library needed; keep it a simple React component.
- A primitive that's only ever used in one feature and has no a11y surface (`<KbdHint>`,
  `<Spinner>`) — same.
- For **decorative** icons: see `accessibility.md` (decorative `aria-hidden`, meaningful
  `aria-label`); no behavior layer needed.

## Hard rules

- ❌ Hand-rolling focus traps, roving tabindex, keyboard nav, portal mounting, or
  dismiss-on-outside-click for a multi-part interactive component. Delegate to the headless
  library.
- ❌ Two headless behavior libraries co-resident in the same repo in steady state. (Migration
  windows are allowed under a dated waiver — see "Migration carve-out".)
- ❌ Polymorphic `as` / `component` / `forwardedAs` props. Use `asChild` + `Slot` instead.
- ❌ `asChild` rendered with 0 or ≥2 children — the kit's `Slot` throws.
- ❌ Re-exporting compound inner parts as separate slice-public symbols
  (`export { TabsRoot, TabsList, TabsTrigger }`). Export the **namespace object** (`Tabs`)
  through `index.ts` and let consumers dot-access.
- ❌ Spreading `{...p}` AFTER `className=…` on a wrapped headless subcomponent — the
  spread re-applies `p.className` and overwrites the merged value. Always destructure
  `{ className, ...rest }` first.
- ❌ Importing a headless component's styles or its CSS variables — they are behavior-only;
  styling is always CSS Modules + tokens.
- ❌ Placing a multi-part component under `shared/ui/atoms/` — compounds are molecules or
  organisms (see `component-structure.md`).
- ✅ Compound components export a namespace object (`Tabs`, `Dialog`, `Menu`); the namespace
  shape matches the wrapped library's parts (verify in Recon, don't invent).
- ✅ Polymorphism via `asChild` + Slot; ref forwarding mandatory; ref type unions the default
  element with the typical `asChild` target.
- ✅ One approved headless layer per repo, recorded in `tech-radar.md` and
  `project-specifics.md`; migrations use a logged, time-boxed waiver.
- ✅ Behavior split into `*.behavior.ts` when interaction logic outgrows the `.tsx`
  (reviewer judgment, not a numeric gate).
- ✅ All a11y wiring (roles, labels, expanded/selected, focus return) comes from the
  headless library; the wrapper applies token-derived classNames only.

## Checklist — a composed component is "done" when

- [ ] Variants (if any) live in `*.variants.ts` as a typed recipe; the `.tsx` applies them
      without conditional class composition; defaults declared; stable vocabulary
      (`size`/`intent`/`tone`/`variant`).
- [ ] Multi-part API exports one namespace object via the slice's `index.ts`; the namespace
      shape matches the wrapped library's actual parts (verified in Recon).
- [ ] All a11y/keyboard/focus behavior delegated to the approved headless library — no
      hand-rolled focus traps, roving tabindex, or portal logic.
- [ ] Polymorphism (if any) via `asChild` + Slot; ref forwarded; Slot's arity check fires
      in dev on misuse; ref type covers both the default and the common `asChild` target.
- [ ] Every wrapped subcomponent destructures `{ className, ...rest }` first — never spreads
      `{...p}` after a merged `className`.
- [ ] Compound component lives in `molecules/` or `organisms/`, not `atoms/`.
- [ ] Interaction logic outgrowing the `.tsx` is in `*.behavior.ts`; the hook has its own
      `renderHook` test.
- [ ] CSS Modules + tokens are the only styling; no headless library styles imported.
- [ ] Stories cover each subcomponent state + variant.
- [ ] `jest-axe` clean per `accessibility.md`; keyboard-traversal test passes.
- [ ] Steiger + dependency-cruiser pass; no new cycle.

## Sources
- [Radix Primitives — Composition (`asChild`)](https://www.radix-ui.com/primitives/docs/guides/composition)
- [Base UI](https://base-ui.com/)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/)
- [Ariakit](https://ariakit.org/)
- [`@radix-ui/react-slot`](https://www.npmjs.com/package/@radix-ui/react-slot)
- [Polymorphic Components in React — typesafe pitfalls](https://blog.makerx.com.au/polymorphic-typesafe-react-components/)
